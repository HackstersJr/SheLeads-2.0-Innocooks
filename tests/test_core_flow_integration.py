from __future__ import annotations

import asyncio

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models.schemas import ThreatScanResult
from app.services.firebase import firestore_service
from app.services.threat_detection_ai import threat_detection_ai_service
from scripts.seed_demo_data import seed


@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


@pytest.fixture(autouse=True)
def seeded_state() -> None:
    asyncio.run(firestore_service.reset_for_tests())
    asyncio.run(seed())


def test_seeded_core_flow_chit_and_emergency_loan(client: TestClient) -> None:
    health = client.get("/health")
    assert health.status_code == 200

    market_before_unlock = client.get("/loans/market", params={"uid": "user_demo_001"})
    assert market_before_unlock.status_code == 403
    assert "complete a few more savings cycles" in market_before_unlock.json()["detail"]

    pay_1 = client.post(
        "/chit/pay-installment",
        json={"uid": "user_demo_001", "amount": 200, "cycle_number": 1},
    )
    assert pay_1.status_code == 200
    assert pay_1.json()["data"]["trust_score"] == 40

    pay_2 = client.post(
        "/chit/pay-installment",
        json={"uid": "user_demo_001", "amount": 200, "cycle_number": 2},
    )
    assert pay_2.status_code == 200
    assert pay_2.json()["data"]["trust_score"] == 60

    pay_3 = client.post(
        "/chit/pay-installment",
        json={"uid": "user_demo_001", "amount": 200, "cycle_number": 3},
    )
    assert pay_3.status_code == 200
    pay_3_data = pay_3.json()["data"]
    assert pay_3_data["trust_score"] == 80
    assert pay_3_data["chit_cycles_completed"] == 3

    market_after_unlock = client.get("/loans/market", params={"uid": "user_demo_001"})
    assert market_after_unlock.status_code == 200
    assert market_after_unlock.json()["message"]["code"] == "LOAN_MARKET_UNLOCKED"

    emergency = client.post(
        "/loans/emergency",
        json={"uid": "user_demo_001", "upi_registered_name": "Meena Devi"},
    )
    assert emergency.status_code == 200
    emergency_data = emergency.json()["data"]
    assert emergency_data["amount"] == 500
    assert emergency_data["type"] == "emergency"


@pytest.mark.usefixtures("seeded_state")
def test_seeded_p2p_funding_and_legal_scan(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    first_funding = client.post(
        "/loans/p2p/loan_demo_001/fund",
        json={"lender_uid": "user_demo_002", "amount": 1000},
    )
    assert first_funding.status_code == 200
    first_data = first_funding.json()["data"]
    assert first_data["funded_amount"] == 1000
    assert first_data["status"] == "requested"

    second_funding = client.post(
        "/loans/p2p/loan_demo_001/fund",
        json={"lender_uid": "user_demo_002", "amount": 1000},
    )
    assert second_funding.status_code == 200
    second_data = second_funding.json()["data"]
    assert second_data["funded_amount"] == 2000
    assert second_data["status"] == "funded"

    async def fake_analyze_message(_: str) -> ThreatScanResult:
        return ThreatScanResult(
            is_threat_detected=True,
            bns_section="BNS 351(2)",
            draft_fir_text="Sample FIR draft for threat case.",
        )

    monkeypatch.setattr(threat_detection_ai_service, "analyze_message", fake_analyze_message)

    legal = client.post(
        "/legal/scan-threat",
        json={
            "uid": "user_demo_001",
            "message_text": "send money now or I will come to your house",
        },
    )
    assert legal.status_code == 200
    legal_data = legal.json()["data"]
    assert legal_data["is_threat_detected"] is True
    assert legal_data["bns_section"] == "BNS 351(2)"
    assert isinstance(legal_data["draft_fir_text"], str)
