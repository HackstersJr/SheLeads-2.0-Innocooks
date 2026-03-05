from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.models.schemas import APIMessage, APIResponse, ChitPaymentRequest
from app.services.firebase import firestore_service, get_db, is_firestore_enabled
from app.services.trust_engine import trust_engine

router = APIRouter(prefix="/chit", tags=["chit"])


@router.post("/pay", response_model=APIResponse[dict[str, int | str]])
async def pay_chit_cycle(payload: ChitPaymentRequest) -> APIResponse[dict[str, int | str]]:
    user = await firestore_service.get_user(payload.uid)
    if not user:
        raise HTTPException(status_code=404, detail="We could not find your account. Please register first.")

    next_cycles = user.chit_cycles_completed + 1
    updated_user = await firestore_service.update_user(
        payload.uid,
        {
            "chit_cycles_completed": next_cycles,
        },
    )
    if not updated_user:
        raise HTTPException(status_code=500, detail="We could not record your payment right now. Please try again.")

    new_score = await trust_engine.apply_chit_payment_reward(
        uid=payload.uid,
        reason=f"Chit cycle payment completed for cycle {payload.cycle_number}",
    )

    if is_firestore_enabled():
        db = get_db()
        if db is not None:
            db.collection("Users").document(payload.uid).update(
                {
                    "trust_score": new_score,
                    "chit_cycles_completed": next_cycles,
                }
            )
    else:
        await firestore_service.update_user(
            payload.uid,
            {
                "trust_score": new_score,
                "chit_cycles_completed": next_cycles,
            },
        )

    await firestore_service.create_financial_audit(
        action="chit_payment",
        uid=payload.uid,
        details={"amount": payload.amount, "cycle_number": payload.cycle_number},
    )
    print("Trust score updated")

    return APIResponse(
        message=APIMessage(
            code="CHIT_PAYMENT_RECORDED",
            text="Great work. Your savings discipline has improved your trust score.",
        ),
        data={
            "uid": payload.uid,
            "trust_score": new_score,
            "chit_cycles_completed": next_cycles,
        },
    )


@router.post("/pay-installment", response_model=APIResponse[dict[str, int | str]])
async def pay_chit_installment(payload: ChitPaymentRequest) -> APIResponse[dict[str, int | str]]:
    return await pay_chit_cycle(payload)
