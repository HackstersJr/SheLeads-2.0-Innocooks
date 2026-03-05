from __future__ import annotations

from typing import Any

from app.models.schemas import EventType, TrustEvent
from app.services.firebase import firestore_service


class TrustEngine:
    def role_initialization_payload(self, role: str, is_new_user: bool) -> dict[str, Any]:
        if role == "borrower":
            payload: dict[str, Any] = {
                "user_role": "borrower",
                "admin_privileges": False,
            }
            if is_new_user:
                # Strict baseline for first-time borrowers.
                payload.update({
                    "trust_score": 20,
                    "chit_cycles_completed": 0,
                })
            return payload

        if role == "ngo_admin":
            return {
                "user_role": "ngo_admin",
                "admin_privileges": True,
            }

        raise ValueError("Unsupported role for initialization")

    async def apply_chit_payment_reward(self, uid: str, reason: str) -> int:
        return await self._apply_delta(
            uid=uid,
            delta=20,
            event_type=EventType.CHIT_PAYMENT,
            reason=reason,
        )

    async def apply_emergency_default_penalty(self, uid: str, reason: str) -> int:
        return await self._set_score(
            uid=uid,
            target_score=-500,
            event_type=EventType.EMERGENCY_LOAN_DEFAULT,
            reason=reason,
        )

    async def apply_manual_moderation(self, uid: str, delta: int, reason: str) -> int:
        return await self._apply_delta(
            uid=uid,
            delta=delta,
            event_type=EventType.MANUAL_MODERATION,
            reason=reason,
        )

    async def _apply_delta(self, uid: str, delta: int, event_type: EventType, reason: str) -> int:
        user = await firestore_service.get_user(uid)
        if not user:
            raise ValueError("User not found")

        next_score = user.trust_score + delta
        saved = await firestore_service.update_user(uid, {"trust_score": next_score})
        if not saved:
            raise ValueError("Unable to update trust score")

        event = TrustEvent(
            uid=uid,
            event_type=event_type,
            delta_score=delta,
            reason=reason,
        )
        await firestore_service.create_trust_event(event)
        print("Trust score updated")
        return next_score

    async def _set_score(self, uid: str, target_score: int, event_type: EventType, reason: str) -> int:
        user = await firestore_service.get_user(uid)
        if not user:
            raise ValueError("User not found")

        delta = target_score - user.trust_score
        saved = await firestore_service.update_user(uid, {"trust_score": target_score})
        if not saved:
            raise ValueError("Unable to update trust score")

        event = TrustEvent(
            uid=uid,
            event_type=event_type,
            delta_score=delta,
            reason=reason,
        )
        await firestore_service.create_trust_event(event)
        print("Trust score updated")
        return target_score


trust_engine = TrustEngine()
