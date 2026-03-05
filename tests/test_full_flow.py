from __future__ import annotations

import os
import sys
from pathlib import Path
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

# Ensure Firestore mode is used for this regression suite.
BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))
os.environ.setdefault("USE_FIRESTORE", "true")
os.environ.setdefault("FIREBASE_KEY_PATH", str(BASE_DIR / "FIREBASE_KEY_PATH"))

from app.api import system as system_api
from app.main import app
from app.models.schemas import ThreatScanResult
from app.services.firebase import get_db, is_firestore_enabled
from app.services.threat_detection_ai import threat_detection_ai_service


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


def test_system_health_firestore_mode(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    assert is_firestore_enabled(), "Firestore must be enabled for full-flow regression tests."

    class _DummyResponse:
        status_code = 200

    class _DummyAsyncClient:
        def __init__(self, timeout: float = 2.5) -> None:
            self.timeout = timeout

        async def __aenter__(self) -> "_DummyAsyncClient":
            return self

        async def __aexit__(self, exc_type, exc, tb) -> bool:
            return False

        async def get(self, _url: str) -> _DummyResponse:
            return _DummyResponse()

    monkeypatch.setattr(system_api.httpx, "AsyncClient", _DummyAsyncClient)

    response = client.get("/system/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["api"] == "ok"
    assert payload["firestore"] == "connected"
    assert payload["rag_dataset"] == "loaded"
    assert payload["ollama"] == "reachable"


def test_full_business_flow_firestore(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    assert is_firestore_enabled(), "Firestore must be enabled for full-flow regression tests."

    # STEP 4: OTP send + verify
    phone = f"9{uuid4().int % 1_000_000_000:09d}"
    send = client.post("/auth/send-otp", json={"phone": phone})
    assert send.status_code == 200
    send_data = send.json()["data"]
    demo_otp = send_data["demo_otp"]

    verify = client.post("/auth/verify-otp", json={"phone": phone, "otp": demo_otp})
    assert verify.status_code == 200
    verify_data = verify.json()["data"]

    assert "uid" in verify_data
    assert "trust_score" in verify_data
    assert "chit_cycles_completed" in verify_data
    assert verify_data["trust_score"] == 20
    assert verify_data["chit_cycles_completed"] == 0
    uid = verify_data["uid"]

    # STEP 5: Trust progression 20 -> 40 -> 60 -> 80
    trust_scores: list[int] = []
    for cycle in (1, 2, 3):
        pay = client.post(
            "/chit/pay-installment",
            json={"uid": uid, "amount": 200, "cycle_number": cycle},
        )
        assert pay.status_code == 200
        trust_scores.append(pay.json()["data"]["trust_score"])

    assert trust_scores == [40, 60, 80]

    # STEP 6: Marketplace unlock
    market = client.get("/loans/market", params={"uid": uid})
    assert market.status_code == 200
    market_body = market.json()
    assert market_body["message"]["code"] == "LOAN_MARKET_UNLOCKED"
    assert isinstance(market_body["data"], list)
    assert len(market_body["data"]) > 0

    # STEP 7: AI legal bodyguard (deterministic mock for stable integration test)
    async def fake_analyze_message(_: str) -> ThreatScanResult:
        return ThreatScanResult(
            is_threat_detected=True,
            bns_section="BNS 308(2) Extortion",
            draft_fir_text="Draft FIR text",
            reasoning_summary="The message threatens harm to force repayment of money.",
            evidence=[
                "Threat of harm detected",
                "Threat tied to financial repayment",
                "Matches extortion definition",
            ],
        )

    monkeypatch.setattr(threat_detection_ai_service, "analyze_message", fake_analyze_message)

    legal = client.post(
        "/legal/analyze-threat",
        json={
            "uid": uid,
            "message_text": "If you don't repay the money I will harm your family.",
        },
    )
    assert legal.status_code == 200
    legal_data = legal.json()["data"]
    assert legal_data["is_threat_detected"] is True
    assert "308" in legal_data["bns_section"]
    assert legal_data.get("reasoning_summary")
    assert isinstance(legal_data.get("evidence"), list)
    assert len(legal_data["evidence"]) > 0

    # STEP 8: Validate persisted Firestore document values
    db = get_db()
    assert db is not None
    user_doc = db.collection("Users").document(uid).get()
    assert user_doc.exists

    persisted = user_doc.to_dict()
    assert persisted["trust_score"] == 80
    assert persisted["chit_cycles_completed"] == 3
