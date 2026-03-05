from __future__ import annotations

import os
from importlib import import_module
from collections import defaultdict
from copy import deepcopy
from datetime import datetime, timezone
from typing import Any, Optional

try:
    firebase_admin = import_module("firebase_admin")
    credentials = import_module("firebase_admin.credentials")
    firestore = import_module("firebase_admin.firestore")
except Exception:  # pragma: no cover - optional dependency for local demo mode
    firebase_admin = None
    credentials = None
    firestore = None

from app.models.schemas import (
    Notification,
    Organization,
    P2PLoan,
    SuspiciousActivityLog,
    TrustEvent,
    User,
)


USE_FIRESTORE = os.getenv("USE_FIRESTORE", "false").lower() == "true"
print("Firestore enabled:", USE_FIRESTORE)
_db: Any = None

if USE_FIRESTORE and firebase_admin is not None and credentials is not None and firestore is not None:
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(os.getenv("FIREBASE_KEY_PATH", "firebase_key.json"))
            firebase_admin.initialize_app(cred)
        _db = firestore.client()
    except Exception:
        _db = None


def get_db() -> Any:
    return _db


def is_firestore_enabled() -> bool:
    return USE_FIRESTORE and _db is not None


class FirestoreService:
    """Firestore-compatible async data service with in-memory fallback for hackathon use."""

    def __init__(self) -> None:
        self._use_memory = True
        self._memory_db: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
        self._firestore_client: Any = None
        self._configure_runtime()

    def _configure_runtime(self) -> None:
        if not is_firestore_enabled():
            print("Firestore enabled:", False)
            return

        self._firestore_client = get_db()
        self._use_memory = self._firestore_client is None
        print("Firestore enabled:", not self._use_memory)

    def _collection_name(self, collection: str) -> str:
        # Keep existing lower-case API internally while mapping Users for Firestore persistence.
        if not self._use_memory and collection == "users":
            return "Users"
        return collection

    async def create_document(self, collection: str, doc_id: str, payload: dict[str, Any]) -> None:
        if self._use_memory:
            self._memory_db[collection][doc_id] = deepcopy(payload)
            return

        ref = self._firestore_client.collection(self._collection_name(collection)).document(doc_id)
        ref.set(payload)

    async def get_document(self, collection: str, doc_id: str) -> Optional[dict[str, Any]]:
        if self._use_memory:
            data = self._memory_db[collection].get(doc_id)
            return deepcopy(data) if data else None

        ref = self._firestore_client.collection(self._collection_name(collection)).document(doc_id)
        snap = ref.get()
        if not snap.exists:
            return None
        return snap.to_dict()

    async def update_document(self, collection: str, doc_id: str, payload: dict[str, Any]) -> bool:
        existing = await self.get_document(collection, doc_id)
        if not existing:
            return False

        if self._use_memory:
            merged = {**existing, **deepcopy(payload)}
            self._memory_db[collection][doc_id] = merged
            return True

        ref = self._firestore_client.collection(self._collection_name(collection)).document(doc_id)
        ref.update(payload)
        return True

    async def list_documents(self, collection: str, limit: int = 20) -> list[dict[str, Any]]:
        if self._use_memory:
            return [deepcopy(item) for item in list(self._memory_db[collection].values())[:limit]]

        query = self._firestore_client.collection(self._collection_name(collection)).limit(limit)
        docs = []
        for row in query.stream():
            docs.append(row.to_dict())
        return docs

    async def increment_fields(self, collection: str, doc_id: str, increments: dict[str, int]) -> bool:
        current = await self.get_document(collection, doc_id)
        if not current:
            return False

        if self._use_memory:
            next_doc = deepcopy(current)
            for key, delta in increments.items():
                next_doc[key] = int(next_doc.get(key, 0)) + delta
            self._memory_db[collection][doc_id] = next_doc
            return True

        from google.cloud.firestore_v1 import Increment  # type: ignore

        updates = {key: Increment(delta) for key, delta in increments.items()}
        ref = self._firestore_client.collection(self._collection_name(collection)).document(doc_id)
        ref.update(updates)
        return True

    async def count_users_by_device(self, device_id: str) -> int:
        if self._use_memory:
            users = self._memory_db["users"].values()
            return sum(1 for user in users if user.get("device_id") == device_id)

        query = self._firestore_client.collection(self._collection_name("users")).where("device_id", "==", device_id)
        count = 0
        for _ in query.stream():
            count += 1
        return count

    async def create_user(self, user: User) -> User:
        await self.create_document("users", user.uid, user.model_dump())
        return user

    async def get_user(self, uid: str) -> Optional[User]:
        raw = await self.get_document("users", uid)
        return User(**raw) if raw else None

    async def find_user_by_phone(self, phone: str) -> Optional[User]:
        rows = await self.list_documents("users", limit=500)
        for row in rows:
            if row.get("phone") == phone:
                return User(**row)
        return None

    async def update_user(self, uid: str, payload: dict[str, Any]) -> Optional[User]:
        updated = await self.update_document("users", uid, payload)
        if not updated:
            return None
        return await self.get_user(uid)

    async def create_org(self, org: Organization) -> Organization:
        await self.create_document("organizations", org.org_id, org.model_dump())
        return org

    async def get_org(self, org_id: str) -> Optional[Organization]:
        raw = await self.get_document("organizations", org_id)
        return Organization(**raw) if raw else None

    async def create_loan(self, loan: P2PLoan) -> P2PLoan:
        await self.create_document("p2p_loans", loan.loan_id, loan.model_dump())
        await self.create_financial_audit(
            action="loan_created",
            uid=loan.borrower_uid,
            details={"loan_id": loan.loan_id, "amount": loan.amount, "type": loan.type},
        )
        return loan

    async def get_loan(self, loan_id: str) -> Optional[P2PLoan]:
        raw = await self.get_document("p2p_loans", loan_id)
        return P2PLoan(**raw) if raw else None

    async def update_loan(self, loan_id: str, payload: dict[str, Any]) -> Optional[P2PLoan]:
        updated = await self.update_document("p2p_loans", loan_id, payload)
        if not updated:
            return None
        return await self.get_loan(loan_id)

    async def list_loans(self, limit: int = 20) -> list[P2PLoan]:
        rows = await self.list_documents("p2p_loans", limit=limit)
        return [P2PLoan(**row) for row in rows]

    async def create_trust_event(self, event: TrustEvent) -> TrustEvent:
        await self.create_document("trust_events", event.event_id, event.model_dump())
        return event

    async def list_trust_events(self, uid: str, limit: int = 20) -> list[TrustEvent]:
        rows = await self.list_documents("trust_events", limit=500)
        filtered = [TrustEvent(**row) for row in rows if row.get("uid") == uid]
        return filtered[:limit]

    async def create_notification(self, notification: Notification | dict[str, Any]) -> Notification:
        if isinstance(notification, dict):
            notification = Notification(**notification)
        await self.create_document("notifications", notification.notification_id, notification.model_dump())
        return notification

    async def list_notifications(self, uid: str, limit: int = 20) -> list[Notification]:
        rows = await self.list_documents("notifications", limit=500)
        filtered = [Notification(**row) for row in rows if row.get("uid") == uid]
        return filtered[:limit]

    async def log_suspicious_activity(
        self,
        entry: SuspiciousActivityLog | dict[str, Any],
    ) -> SuspiciousActivityLog:
        if isinstance(entry, dict):
            entry = SuspiciousActivityLog(**entry)
        await self.create_document("suspicious_activity", entry.log_id, entry.model_dump())
        return entry

    async def list_suspicious_activity(self, limit: int = 50) -> list[SuspiciousActivityLog]:
        rows = await self.list_documents("suspicious_activity", limit=limit)
        return [SuspiciousActivityLog(**row) for row in rows]

    async def create_financial_audit(self, action: str, uid: Optional[str], details: dict[str, Any]) -> None:
        timestamp = datetime.now(timezone.utc).isoformat()
        audit_id = f"audit_{timestamp}_{action}".replace(":", "-")
        payload = {
            "audit_id": audit_id,
            "action": action,
            "uid": uid,
            "details": details,
            "timestamp": timestamp,
        }
        await self.create_document("audit_financial_actions", audit_id, payload)

    async def reset_for_tests(self) -> None:
        if self._use_memory:
            self._memory_db = defaultdict(dict)

    async def reset_demo_user(self, uid: str) -> None:
        """Reset a demo user's trust score and clear their trust event history."""
        await self.update_document("users", uid, {
            "trust_score": 20,
            "chit_cycles_completed": 0,
        })
        if self._use_memory:
            # Remove all trust events belonging to this uid
            events_to_delete = [
                eid for eid, ev in self._memory_db["trust_events"].items()
                if ev.get("uid") == uid
            ]
            for eid in events_to_delete:
                del self._memory_db["trust_events"][eid]


firestore_service = FirestoreService()
