from __future__ import annotations

from dataclasses import dataclass
from hashlib import sha1


@dataclass
class DigiLockerProfile:
    aadhaar_number: str
    full_name: str


class MockKYCAndPaymentService:
    def __init__(self) -> None:
        self._otp_store: dict[str, str] = {}

    async def send_otp(self, phone: str) -> str:
        otp = "123456"
        self._otp_store[phone] = otp
        return otp

    async def verify_otp(self, phone: str, otp: str) -> bool:
        expected = self._otp_store.get(phone)
        return expected == otp

    async def fetch_digilocker_aadhaar_profile(self, aadhaar_number: str) -> DigiLockerProfile:
        seed = sha1(aadhaar_number.encode("utf-8")).hexdigest()[:6]
        full_name = f"SheVest Member {seed.upper()}"
        return DigiLockerProfile(aadhaar_number=aadhaar_number, full_name=full_name)

    async def verify_upi_name_match(self, aadhaar_name: str, upi_registered_name: str) -> bool:
        left = " ".join(aadhaar_name.lower().split())
        right = " ".join(upi_registered_name.lower().split())
        return left == right


mock_kyc_payment_service = MockKYCAndPaymentService()
