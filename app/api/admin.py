from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import APIMessage, APIResponse, ModerateTrustRequest, SuspiciousActivityLog, TrustEvent
from app.services.firebase import firestore_service
from app.services.trust_engine import trust_engine

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/suspicious-activity", response_model=APIResponse[list[SuspiciousActivityLog]])
async def list_suspicious_activity(limit: int = Query(default=50, ge=1, le=200)) -> APIResponse[list[SuspiciousActivityLog]]:
    rows = await firestore_service.list_suspicious_activity(limit=limit)
    return APIResponse(
        message=APIMessage(code="SUSPICIOUS_ACTIVITY_LOGS", text="Suspicious activity logs loaded."),
        data=rows,
    )


@router.post("/trust/moderate", response_model=APIResponse[dict[str, int | str]])
async def moderate_trust(payload: ModerateTrustRequest) -> APIResponse[dict[str, int | str]]:
    user = await firestore_service.get_user(payload.uid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    new_score = await trust_engine.apply_manual_moderation(payload.uid, payload.delta_score, payload.reason)

    return APIResponse(
        message=APIMessage(code="TRUST_MODERATED", text="Trust score updated successfully."),
        data={"uid": payload.uid, "trust_score": new_score},
    )


@router.get("/trust/{uid}/events", response_model=APIResponse[list[TrustEvent]])
async def list_trust_events(uid: str, limit: int = Query(default=20, ge=1, le=100)) -> APIResponse[list[TrustEvent]]:
    events = await firestore_service.list_trust_events(uid=uid, limit=limit)
    return APIResponse(
        message=APIMessage(code="TRUST_EVENTS", text="Trust event history loaded."),
        data=events,
    )


@router.post("/reset-demo", response_model=APIResponse[dict[str, str]])
async def reset_demo() -> APIResponse[dict[str, str]]:
    """Reset user_demo_001 to initial state for live demo restarts."""
    await firestore_service.reset_demo_user("user_demo_001")
    return APIResponse(
        message=APIMessage(code="DEMO_RESET", text="Demo state has been reset."),
        data={"status": "demo reset complete"},
    )
