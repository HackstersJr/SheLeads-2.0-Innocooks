from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.chit import router as chit_router
from app.api.legal import router as legal_router
from app.api.loans import router as loans_router
from app.models.schemas import APIMessage, APIResponse, HealthStatus, LoanStatus, LoanType, Organization, OrgType, P2PLoan, User
from app.services.firebase import firestore_service


async def _seed_demo_data() -> None:
    """Seed in-memory store with known demo fixtures on every server boot."""
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

    loan = P2PLoan(
        loan_id="loan_demo_001",
        borrower_uid=borrower.uid,
        amount=2000,
        type=LoanType.P2P,
        status=LoanStatus.REQUESTED,
        interest_rate=2.0,
        funded_amount=0,
        lender_ids=[],
    )
    await firestore_service.create_loan(loan)


@asynccontextmanager
async def lifespan(app: FastAPI):  # noqa: ARG001
    await _seed_demo_data()
    yield


app = FastAPI(
    title="SheVest Backend",
    version="0.1.0",
    description="Fintech backend for trust-based credit access for women in the informal economy.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:5175",
        "http://localhost:5176",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5175",
        "http://127.0.0.1:5176",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=APIResponse[HealthStatus])
async def health() -> APIResponse[HealthStatus]:
    return APIResponse(
        message=APIMessage(code="HEALTH_OK", text="SheVest backend is running."),
        data=HealthStatus(),
    )


app.include_router(auth_router)
app.include_router(chit_router)
app.include_router(loans_router)
app.include_router(legal_router)
app.include_router(admin_router)
