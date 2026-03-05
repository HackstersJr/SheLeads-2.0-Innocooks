from __future__ import annotations

import random
from typing import Any
from uuid import uuid4

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    APIMessage,
    APIResponse,
    BorrowerAuthRequest,
    NGOLoginRequest,
    NGOLoginResponse,
    OTPVerifyRequest,
    RegisterRequest,
    User,
    UserProfileResponse,
)
from app.services.firebase import firestore_service
from app.services.jwt_service import create_access_token
from app.services.mock_kyc_payment import mock_kyc_payment_service
from app.services.trust_engine import trust_engine

router = APIRouter(prefix="/auth", tags=["auth"])
otp_store: dict[str, str] = {}

# Hackathon-mode NGO credential registry. In production, replace with hashed
# credentials and identity checks through secure provider integrations.
ngo_partner_store: dict[str, dict[str, str]] = {
    "admin@gramseva.org": {
        "password": "GramSeva@2026",
        "aadhaar_number": "123412341234",
        "ngo_license_number": "MH/NGO/2023/00001",
        "uid": "ngo_admin_001",
        "org_id": "org_demo_001",
    },
    "ops@shetrustfoundation.org": {
        "password": "SheTrust@2026",
        "aadhaar_number": "999988887777",
        "ngo_license_number": "KA/NGO/2022/00456",
        "uid": "ngo_admin_002",
        "org_id": "org_demo_001",
    },
}


def _new_demo_otp() -> str:
    return f"{random.randint(100000, 999999)}"


def _user_persistence_payload(user: User) -> dict[str, Any]:
    return {
        "uid": user.uid,
        "phone": user.phone,
        "trust_score": user.trust_score,
        "chit_cycles_completed": user.chit_cycles_completed,
        "active_emergency_loans": user.active_emergency_loans,
        "lifetime_emergency_loans": user.lifetime_emergency_loans,
        "user_role": user.user_role,
        "admin_privileges": user.admin_privileges,
    }


@router.post("/send-otp", response_model=APIResponse[dict[str, str]])
async def send_otp(payload: BorrowerAuthRequest) -> APIResponse[dict[str, str]]:
    otp = _new_demo_otp()
    otp_store[payload.phone] = otp
    print("Generated OTP:", otp)

    # Keep existing mock service call for compatibility with current register flow fallback.
    await mock_kyc_payment_service.send_otp(payload.phone)

    return APIResponse(
        message=APIMessage(
            code="OTP_SENT",
            text="A verification code has been sent. Please enter it to continue.",
        ),
        data={"status": "otp_sent", "demo_otp": otp},
    )


@router.post("/verify-otp", response_model=APIResponse[UserProfileResponse])
async def verify_otp(payload: OTPVerifyRequest) -> APIResponse[UserProfileResponse]:
    demo_otp = otp_store.get(payload.phone)
    is_valid = demo_otp == payload.otp
    if not is_valid:
        # Compatibility fallback for older flows that rely on mock service OTP.
        is_valid = await mock_kyc_payment_service.verify_otp(payload.phone, payload.otp)

    if not is_valid:
        raise HTTPException(status_code=400, detail="The verification code is not correct. Please try again.")

    user = await firestore_service.find_user_by_phone(payload.phone)
    if not user:
        borrower_init = trust_engine.role_initialization_payload(role="borrower", is_new_user=True)
        user = User(
            uid=f"user_{uuid4().hex[:12]}",
            phone=payload.phone,
            aadhaar_name="Demo User",
            upi_vpa=f"user{payload.phone[-4:]}@upi",
            device_id=f"device_{payload.phone[-6:]}",
            trust_score=borrower_init["trust_score"],
            chit_cycles_completed=borrower_init["chit_cycles_completed"],
            active_emergency_loans=0,
            lifetime_emergency_loans=0,
            user_role=borrower_init["user_role"],
            admin_privileges=borrower_init["admin_privileges"],
            org_id="org_demo_001",
        )
        await firestore_service.create_user(user)
    else:
        borrower_existing = trust_engine.role_initialization_payload(role="borrower", is_new_user=False)
        user.user_role = borrower_existing["user_role"]
        user.admin_privileges = borrower_existing["admin_privileges"]

    # Ensure OTP verification always writes a persisted user profile snapshot.
    persisted = await firestore_service.update_user(user.uid, _user_persistence_payload(user))
    if persisted:
        user = persisted

    otp_store.pop(payload.phone, None)
    print("Borrower verified:", user.uid)

    response_profile = UserProfileResponse(
        uid=user.uid,
        phone=user.phone,
        role="borrower",
        trust_score=user.trust_score,
        chit_cycles_completed=user.chit_cycles_completed,
        access_token=create_access_token({"uid": user.uid, "role": "borrower"}),
    )

    return APIResponse(
        message=APIMessage(code="OTP_VERIFIED", text="Phone verification completed successfully."),
        data=response_profile,
    )


@router.post("/register", response_model=APIResponse[User])
async def register_user(payload: RegisterRequest) -> APIResponse[User]:
    demo_otp = otp_store.get(payload.phone)
    is_otp_valid = demo_otp == payload.otp
    if not is_otp_valid:
        is_otp_valid = await mock_kyc_payment_service.verify_otp(payload.phone, payload.otp)

    if not is_otp_valid:
        raise HTTPException(status_code=400, detail="Please verify your phone with the correct OTP before registration.")

    otp_store.pop(payload.phone, None)

    device_count = await firestore_service.count_users_by_device(payload.device_id)
    if device_count >= 2:
        await firestore_service.log_suspicious_activity(
            entry={
                "uid": None,
                "action": "device_registration_blocked",
                "reason": "device_id exceeded allowed household limit",
                "details": {"device_id": payload.device_id, "phone": payload.phone},
            }
        )
        raise HTTPException(
            status_code=403,
            detail="This phone device already has two accounts. Please contact your NGO partner for help.",
        )

    kyc_profile = await mock_kyc_payment_service.fetch_digilocker_aadhaar_profile(payload.aadhaar_number)

    user = User(
        phone=payload.phone,
        aadhaar_name=kyc_profile.full_name,
        upi_vpa=payload.upi_vpa,
        device_id=payload.device_id,
        org_id=payload.org_id,
    )
    created = await firestore_service.create_user(user)

    return APIResponse(
        message=APIMessage(
            code="USER_REGISTERED",
            text="Your account is ready. Start your savings cycles to build your trust score.",
        ),
        data=created,
    )


@router.post("/ngo-login", response_model=APIResponse[NGOLoginResponse])
async def ngo_login(payload: NGOLoginRequest) -> APIResponse[NGOLoginResponse]:
    normalized_email = payload.email.strip().lower()
    record = ngo_partner_store.get(normalized_email)

    if not record:
        raise HTTPException(status_code=401, detail="NGO partner not found. Please check your credentials.")

    if payload.password != record["password"]:
        raise HTTPException(status_code=401, detail="Invalid credentials.")

    if payload.aadhaar_number != record["aadhaar_number"]:
        raise HTTPException(status_code=401, detail="Aadhaar verification failed.")

    if payload.ngo_license_number.strip().upper() != record["ngo_license_number"].upper():
        raise HTTPException(status_code=401, detail="NGO license verification failed.")

    org = await firestore_service.get_org(record["org_id"])
    if org and not org.verified:
        raise HTTPException(status_code=403, detail="NGO organization is pending verification.")

    response = NGOLoginResponse(
        uid=record["uid"],
        role="ngo_admin",
        org_id=record["org_id"],
        email=normalized_email,
        access_token=create_access_token({"uid": record["uid"], "role": "ngo_admin"}),
    )

    # Centralized NGO auth-role initialization for downstream route guards.
    ngo_init = trust_engine.role_initialization_payload(role="ngo_admin", is_new_user=False)
    existing_admin = await firestore_service.get_user(record["uid"])
    if existing_admin:
        await firestore_service.update_user(record["uid"], ngo_init)
    else:
        admin_digits = "".join(ch for ch in record["uid"] if ch.isdigit())
        synthetic_phone = admin_digits[-10:].zfill(10)
        await firestore_service.create_user(
            User(
                uid=record["uid"],
                phone=synthetic_phone,
                aadhaar_name=normalized_email.split("@")[0].replace(".", " ").title() or "NGO Admin",
                upi_vpa=f"{record['uid']}@admin",
                device_id=f"device_{record['uid']}",
                org_id=record["org_id"],
                user_role=ngo_init["user_role"],
                admin_privileges=ngo_init["admin_privileges"],
            )
        )

    return APIResponse(
        message=APIMessage(code="NGO_AUTHENTICATED", text="Organization authentication successful."),
        data=response,
    )


@router.get("/borrower-hub", response_model=APIResponse[dict[str, str]])
async def borrower_hub() -> APIResponse[dict[str, str]]:
    return APIResponse(
        message=APIMessage(code="BORROWER_HUB_ACCESS", text="Borrower dashboard access granted."),
        data={"route": "/borrower-hub", "required_role": "borrower"},
    )


@router.get("/ngo-dashboard", response_model=APIResponse[dict[str, str]])
async def ngo_dashboard() -> APIResponse[dict[str, str]]:
    return APIResponse(
        message=APIMessage(code="NGO_DASHBOARD_ACCESS", text="NGO dashboard access granted."),
        data={"route": "/ngo-dashboard", "required_role": "ngo_admin"},
    )
