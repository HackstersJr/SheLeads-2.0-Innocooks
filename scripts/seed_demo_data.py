from __future__ import annotations

import asyncio
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from app.models.schemas import LoanStatus, LoanType, Organization, OrgType, P2PLoan, User
from app.services.firebase import firestore_service


async def seed() -> None:
    org = Organization(
        org_id="org_demo_001",
        name="Seva Women's Self Help Group",
        type=OrgType.SHG,
        verified=True,
        members=["user_demo_001", "user_demo_002"],
    )
    await firestore_service.create_org(org)

    borrower = User(
        uid="user_demo_001",
        phone="9999000001",
        aadhaar_name="Meena Devi",
        upi_vpa="meena@upi",
        device_id="device_demo_001",
        trust_score=20,
        chit_cycles_completed=0,
        active_emergency_loans=0,
        lifetime_emergency_loans=0,
        org_id=org.org_id,
    )
    lender = User(
        uid="user_demo_002",
        phone="9999000002",
        aadhaar_name="Rajesh Kumar",
        upi_vpa="rajesh.lender@upi",
        device_id="device_demo_002",
        trust_score=120,
        chit_cycles_completed=5,
        active_emergency_loans=0,
        lifetime_emergency_loans=0,
        org_id=org.org_id,
    )

    await firestore_service.create_user(borrower)
    await firestore_service.create_user(lender)

    p2p_loan = P2PLoan(
        loan_id="loan_demo_001",
        borrower_uid=borrower.uid,
        amount=2000,
        type=LoanType.P2P,
        status=LoanStatus.REQUESTED,
        interest_rate=2.0,
        funded_amount=0,
        lender_ids=[],
    )
    await firestore_service.create_loan(p2p_loan)

    print("Demo seed complete")
    print(f"Org: {org.org_id}")
    print(f"Borrower (Street vendor): {borrower.uid} - {borrower.aadhaar_name}")
    print(f"Lender: {lender.uid} - {lender.aadhaar_name}")
    print(f"Loan: {p2p_loan.loan_id}")


if __name__ == "__main__":
    asyncio.run(seed())
