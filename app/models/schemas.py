from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Generic, Optional, TypeVar
from uuid import uuid4

from pydantic import BaseModel, ConfigDict, Field, field_validator


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid4().hex[:12]}"


class LoanType(str, Enum):
    EMERGENCY = "emergency"
    P2P = "p2p"


class LoanStatus(str, Enum):
    REQUESTED = "requested"
    FUNDED = "funded"
    ACTIVE = "active"
    REPAID = "repaid"
    DEFAULTED = "defaulted"
    REJECTED = "rejected"


class OrgType(str, Enum):
    NGO = "ngo"
    SHG = "shg"


class EventType(str, Enum):
    CHIT_PAYMENT = "chit_payment"
    EMERGENCY_LOAN_DEFAULT = "emergency_loan_default"
    MANUAL_MODERATION = "manual_moderation"


class APIMessage(BaseModel):
    code: str
    text: str


T = TypeVar("T")


class APIResponse(BaseModel, Generic[T]):
    success: bool = True
    message: APIMessage
    data: Optional[T] = None


class HealthStatus(BaseModel):
    status: str = "ok"
    service: str = "shevest-backend"


class User(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    uid: str = Field(default_factory=lambda: new_id("user"))
    phone: str = Field(min_length=10, max_length=15)
    aadhaar_name: str = Field(min_length=2)
    upi_vpa: str = Field(min_length=5)
    device_id: str = Field(min_length=3)
    trust_score: int = 20
    chit_cycles_completed: int = 0
    active_emergency_loans: int = 0
    lifetime_emergency_loans: int = 0
    org_id: Optional[str] = None


class Organization(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    org_id: str = Field(default_factory=lambda: new_id("org"))
    name: str
    type: OrgType
    verified: bool = False
    members: list[str] = Field(default_factory=list)


class P2PLoan(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    loan_id: str = Field(default_factory=lambda: new_id("loan"))
    borrower_uid: str
    amount: int = Field(gt=0)
    type: LoanType
    status: LoanStatus = LoanStatus.REQUESTED
    interest_rate: float = Field(ge=0)
    funded_amount: int = 0
    lender_ids: list[str] = Field(default_factory=list)


class ChatMessage(BaseModel):
    sender_uid: str
    text: str = Field(min_length=1, max_length=2000)
    timestamp: datetime = Field(default_factory=utc_now)


class ChatThread(BaseModel):
    chat_id: str = Field(default_factory=lambda: new_id("chat"))
    loan_id: str
    messages: list[ChatMessage] = Field(default_factory=list)


class TrustEvent(BaseModel):
    model_config = ConfigDict(use_enum_values=True)

    event_id: str = Field(default_factory=lambda: new_id("te"))
    uid: str
    event_type: EventType
    delta_score: int
    timestamp: datetime = Field(default_factory=utc_now)
    reason: str


class Notification(BaseModel):
    notification_id: str = Field(default_factory=lambda: new_id("notif"))
    uid: str
    message: str
    read: bool = False
    timestamp: datetime = Field(default_factory=utc_now)


class SuspiciousActivityLog(BaseModel):
    log_id: str = Field(default_factory=lambda: new_id("susp"))
    uid: Optional[str] = None
    action: str
    reason: str
    details: dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=utc_now)


class SendOTPRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)


class VerifyOTPRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=4, max_length=6)


class RegisterRequest(BaseModel):
    phone: str = Field(min_length=10, max_length=15)
    otp: str = Field(min_length=4, max_length=6)
    aadhaar_number: str = Field(min_length=12, max_length=12)
    upi_vpa: str = Field(min_length=5)
    device_id: str = Field(min_length=3)
    org_id: Optional[str] = None


class ChitPaymentRequest(BaseModel):
    uid: str
    amount: int = Field(gt=0)
    cycle_number: int = Field(gt=0)


class EmergencyLoanRequest(BaseModel):
    uid: str
    upi_registered_name: str = Field(min_length=2)


class CreateP2PLoanRequest(BaseModel):
    borrower_uid: str
    amount: int = Field(gt=0)
    interest_rate: float = Field(ge=0)


class FundP2PLoanRequest(BaseModel):
    lender_uid: str
    amount: int = Field(gt=0)


class ThreatScanRequest(BaseModel):
    uid: Optional[str] = None
    message_text: str = Field(min_length=1, max_length=5000)


class ThreatScanResult(BaseModel):
    is_threat_detected: bool = False
    bns_section: str = ""
    draft_fir_text: str = ""


class ModerateTrustRequest(BaseModel):
    uid: str
    delta_score: int
    reason: str = Field(min_length=3)

    @field_validator("delta_score")
    @classmethod
    def validate_delta(cls, value: int) -> int:
        if value == 0:
            raise ValueError("delta_score cannot be zero")
        return value


class PaginationQuery(BaseModel):
    limit: int = Field(default=20, ge=1, le=100)
