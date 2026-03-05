from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import APIMessage, APIResponse, RegisterRequest, SendOTPRequest, User, VerifyOTPRequest
from app.services.firebase import firestore_service
from app.services.mock_kyc_payment import mock_kyc_payment_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/send-otp", response_model=APIResponse[dict[str, str]])
async def send_otp(payload: SendOTPRequest) -> APIResponse[dict[str, str]]:
    await mock_kyc_payment_service.send_otp(payload.phone)
    return APIResponse(
        message=APIMessage(
            code="OTP_SENT",
            text="A verification code has been sent. Please enter it to continue.",
        ),
        data={"phone": payload.phone},
    )


@router.post("/verify-otp", response_model=APIResponse[dict[str, bool]])
async def verify_otp(payload: VerifyOTPRequest) -> APIResponse[dict[str, bool]]:
    is_valid = await mock_kyc_payment_service.verify_otp(payload.phone, payload.otp)
    if not is_valid:
        raise HTTPException(status_code=400, detail="The verification code is not correct. Please try again.")

    return APIResponse(
        message=APIMessage(code="OTP_VERIFIED", text="Phone verification completed successfully."),
        data={"verified": True},
    )


@router.post("/register", response_model=APIResponse[User])
async def register_user(payload: RegisterRequest) -> APIResponse[User]:
    is_otp_valid = await mock_kyc_payment_service.verify_otp(payload.phone, payload.otp)
    if not is_otp_valid:
        raise HTTPException(status_code=400, detail="Please verify your phone with the correct OTP before registration.")

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
