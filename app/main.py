from __future__ import annotations

from contextlib import asynccontextmanager

from dotenv import load_dotenv
load_dotenv()  # loads .env from project root before any env-dependent imports

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.chit import router as chit_router
from app.api.legal import ai_router, router as legal_router
from app.api.loans import router as loans_router
from app.api.system import router as system_router
from app.models.schemas import APIMessage, APIResponse, HealthStatus, LoanStatus, LoanType, Organization, OrgType, P2PLoan, User
from app.services.firebase import firestore_service
from app.services.jwt_service import verify_access_token


class RoleGuardMiddleware(BaseHTTPMiddleware):
    """Enforce role-based access for protected dashboard API routes."""

    _protected_routes = {
        "/borrower-hub": "borrower",
        "/ngo-dashboard": "ngo_admin",
        "/auth/borrower-hub": "borrower",
        "/auth/ngo-dashboard": "ngo_admin",
    }

    async def dispatch(self, request: Request, call_next):
        path = request.url.path.rstrip("/") or "/"
        expected_role = self._protected_routes.get(path)

        # Ignore non-protected routes and CORS preflight requests.
        if not expected_role or request.method.upper() == "OPTIONS":
            return await call_next(request)

        auth_header = request.headers.get("Authorization", "")
        uid: str | None = None
        role: str | None = None

        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1].strip()
            if not token:
                return JSONResponse(status_code=401, content={"detail": "Missing bearer token."})

            try:
                payload = verify_access_token(token)
            except ValueError:
                return JSONResponse(status_code=401, content={"detail": "Invalid or expired token."})

            uid = str(payload["uid"])
            role = str(payload["role"])
            print("JWT verified for user:", uid)
            print("User role:", role)
        else:
            # Demo-safe fallback for legacy callers during transition.
            legacy_uid = request.headers.get("x-user-uid")
            if not legacy_uid:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Missing Authorization bearer token."},
                )
            uid = legacy_uid

        # Firestore validation: user referenced by token/header must exist.
        user = await firestore_service.get_user(uid)
        if not user:
            return JSONResponse(
                status_code=401,
                content={"detail": "User not found for provided identity."},
            )

        # If JWT role missing (legacy fallback), use persisted user role.
        effective_role = role or user.user_role
        if effective_role != expected_role:
            return JSONResponse(
                status_code=403,
                content={"detail": f"Access denied: requires role '{expected_role}'."},
            )

        return await call_next(request)


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
    allow_origins=[],
    # Allow local dev and private LAN origins across dynamic Vite ports.
    allow_origin_regex=r"^https?://(localhost|127\\.0\\.0\\.1|10\\.\\d+\\.\\d+\\.\\d+|192\\.168\\.\\d+\\.\\d+|172\\.(1[6-9]|2\\d|3[0-1])\\.\\d+\\.\\d+):\\d+$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(RoleGuardMiddleware)


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
app.include_router(ai_router)
app.include_router(admin_router)
app.include_router(system_router)
