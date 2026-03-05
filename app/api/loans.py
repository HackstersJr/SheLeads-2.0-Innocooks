from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    APIMessage,
    APIResponse,
    CreateP2PLoanRequest,
    EmergencyLoanRequest,
    FundP2PLoanRequest,
    LoanStatus,
    LoanType,
    P2PLoan,
)
from app.services.firebase import firestore_service
from app.services.mock_kyc_payment import mock_kyc_payment_service
from app.services.trust_engine import trust_engine

router = APIRouter(prefix="/loans", tags=["loans"])


@router.post("/emergency", response_model=APIResponse[P2PLoan])
async def request_emergency_loan(payload: EmergencyLoanRequest) -> APIResponse[P2PLoan]:
    print("Loan request received")
    user = await firestore_service.get_user(payload.uid)
    if not user:
        raise HTTPException(status_code=404, detail="Your account was not found.")

    if user.active_emergency_loans != 0:
        raise HTTPException(
            status_code=403,
            detail="Please repay your current emergency loan before requesting a new one.",
        )

    if user.lifetime_emergency_loans >= 2:
        raise HTTPException(
            status_code=403,
            detail="You have reached the emergency loan limit. Please contact your support NGO for guidance.",
        )

    if user.trust_score < 80:
        raise HTTPException(
            status_code=403,
            detail="You need to complete a few more savings cycles before applying for loans.",
        )

    is_name_match = await mock_kyc_payment_service.verify_upi_name_match(user.aadhaar_name, payload.upi_registered_name)
    if not is_name_match:
        await firestore_service.log_suspicious_activity(
            entry={
                "uid": user.uid,
                "action": "upi_name_mismatch",
                "reason": "aadhaar_name does not match UPI registered name",
                "details": {
                    "aadhaar_name": user.aadhaar_name,
                    "upi_registered_name": payload.upi_registered_name,
                },
            }
        )
        raise HTTPException(
            status_code=403,
            detail="For your security, your UPI name must match your Aadhaar profile.",
        )

    loan = P2PLoan(
        borrower_uid=user.uid,
        amount=500,
        type=LoanType.EMERGENCY,
        status=LoanStatus.ACTIVE,
        interest_rate=0,
        funded_amount=500,
        lender_ids=[],
    )
    created_loan = await firestore_service.create_loan(loan)

    await firestore_service.update_user(
        user.uid,
        {
            "active_emergency_loans": user.active_emergency_loans + 1,
            "lifetime_emergency_loans": user.lifetime_emergency_loans + 1,
        },
    )

    await firestore_service.create_notification(
        notification={
            "uid": user.uid,
            "message": "Your emergency loan of ₹500 has been approved.",
        }
    )

    return APIResponse(
        message=APIMessage(
            code="EMERGENCY_LOAN_APPROVED",
            text="Your emergency support loan is approved and ready for disbursement.",
        ),
        data=created_loan,
    )


@router.post("/p2p", response_model=APIResponse[P2PLoan])
async def create_p2p_loan(payload: CreateP2PLoanRequest) -> APIResponse[P2PLoan]:
    user = await firestore_service.get_user(payload.borrower_uid)
    if not user:
        raise HTTPException(status_code=404, detail="Borrower account not found.")

    if user.trust_score < 80:
        raise HTTPException(
            status_code=403,
            detail="You need to complete a few more savings cycles before applying for loans.",
        )

    loan = P2PLoan(
        borrower_uid=payload.borrower_uid,
        amount=payload.amount,
        type=LoanType.P2P,
        interest_rate=payload.interest_rate,
        status=LoanStatus.REQUESTED,
    )
    created = await firestore_service.create_loan(loan)

    return APIResponse(
        message=APIMessage(code="P2P_LOAN_CREATED", text="Your loan request is now visible to community lenders."),
        data=created,
    )


@router.post("/p2p/{loan_id}/fund", response_model=APIResponse[P2PLoan])
async def fund_p2p_loan(loan_id: str, payload: FundP2PLoanRequest) -> APIResponse[P2PLoan]:
    loan = await firestore_service.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan request not found.")

    if loan.type != LoanType.P2P:
        raise HTTPException(status_code=400, detail="Only community P2P loans can be funded from this route.")

    if loan.status not in {LoanStatus.REQUESTED, LoanStatus.FUNDED}:
        raise HTTPException(status_code=400, detail="This loan is not open for funding.")

    next_funded = loan.funded_amount + payload.amount
    next_lenders = list(loan.lender_ids)
    if payload.lender_uid not in next_lenders:
        next_lenders.append(payload.lender_uid)

    next_status = LoanStatus.FUNDED if next_funded >= loan.amount else LoanStatus.REQUESTED
    updated = await firestore_service.update_loan(
        loan_id,
        {
            "funded_amount": next_funded,
            "lender_ids": next_lenders,
            "status": next_status,
        },
    )
    if not updated:
        raise HTTPException(status_code=500, detail="Could not update funding progress. Please retry.")

    await firestore_service.create_financial_audit(
        action="p2p_loan_funded",
        uid=payload.lender_uid,
        details={"loan_id": loan_id, "amount": payload.amount},
    )

    return APIResponse(
        message=APIMessage(code="P2P_LOAN_FUNDED", text="Your contribution has been added to this loan."),
        data=updated,
    )


@router.post("/emergency/{loan_id}/default", response_model=APIResponse[dict[str, int | str]])
async def mark_emergency_loan_default(loan_id: str) -> APIResponse[dict[str, int | str]]:
    loan = await firestore_service.get_loan(loan_id)
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found.")

    if loan.type != LoanType.EMERGENCY:
        raise HTTPException(status_code=400, detail="This route is only for emergency loan default handling.")

    updated_loan = await firestore_service.update_loan(loan_id, {"status": LoanStatus.DEFAULTED})
    if not updated_loan:
        raise HTTPException(status_code=500, detail="Unable to update loan status.")

    user = await firestore_service.get_user(loan.borrower_uid)
    if not user:
        raise HTTPException(status_code=404, detail="Borrower account not found.")

    await firestore_service.update_user(
        user.uid,
        {"active_emergency_loans": max(user.active_emergency_loans - 1, 0)},
    )

    new_score = await trust_engine.apply_emergency_default_penalty(
        uid=user.uid,
        reason=f"Emergency loan {loan_id} marked as defaulted",
    )
    await firestore_service.log_suspicious_activity(
        entry={
            "uid": user.uid,
            "action": "emergency_loan_default",
            "reason": "repayment default recorded",
            "details": {"loan_id": loan_id},
        }
    )

    return APIResponse(
        message=APIMessage(
            code="EMERGENCY_DEFAULT_RECORDED",
            text="The loan default was recorded and support follow-up is recommended.",
        ),
        data={"loan_id": loan_id, "uid": user.uid, "trust_score": new_score},
    )


@router.get("/marketplace", response_model=APIResponse[list[P2PLoan]])
async def list_marketplace_loans(limit: int = Query(default=20, ge=1, le=100)) -> APIResponse[list[P2PLoan]]:
    print("Loan market accessed")
    loans = await firestore_service.list_loans(limit=limit)
    eligible = [loan for loan in loans if loan.type == LoanType.P2P and loan.status in {LoanStatus.REQUESTED, LoanStatus.FUNDED}]
    return APIResponse(
        message=APIMessage(code="LOAN_MARKETPLACE", text="Here are current community loan opportunities."),
        data=eligible,
    )


@router.get("/market", response_model=APIResponse[list[P2PLoan]])
async def list_market_for_user(uid: str, limit: int = Query(default=20, ge=1, le=100)) -> APIResponse[list[P2PLoan]]:
    user = await firestore_service.get_user(uid)
    if not user:
        raise HTTPException(status_code=404, detail="Your account was not found.")

    if user.trust_score < 80:
        raise HTTPException(
            status_code=403,
            detail="You need to complete a few more savings cycles before applying for loans.",
        )

    print("Loan market accessed")
    loans = await firestore_service.list_loans(limit=limit)
    eligible = [loan for loan in loans if loan.type == LoanType.P2P and loan.status in {LoanStatus.REQUESTED, LoanStatus.FUNDED}]
    return APIResponse(
        message=APIMessage(code="LOAN_MARKET_UNLOCKED", text="Your trust score has unlocked the community loan market."),
        data=eligible,
    )
