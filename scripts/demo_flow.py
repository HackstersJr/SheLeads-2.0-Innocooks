from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request

BASE_URL = "http://127.0.0.1:8000"


def _request(method: str, path: str, payload: dict | None = None, query: dict | None = None) -> dict:
    url = f"{BASE_URL}{path}"
    if query:
        url = f"{url}?{urllib.parse.urlencode(query)}"

    body = None
    headers = {"Content-Type": "application/json"}
    if payload is not None:
        body = json.dumps(payload).encode("utf-8")

    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as response:
            return json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8")
        raise RuntimeError(f"HTTP {error.code} at {path}: {detail}") from error
    except Exception as error:
        raise RuntimeError(f"Request failed at {path}: {error}") from error


def main() -> None:
    print("Step 1/7: Register user")
    phone = "9999333344"
    _request("POST", "/auth/send-otp", {"phone": phone})
    register = _request(
        "POST",
        "/auth/register",
        {
            "phone": phone,
            "otp": "123456",
            "aadhaar_number": "123412341234",
            "upi_vpa": "meena.live@upi",
            "device_id": "device_demo_story_001",
            "org_id": "org_demo_001",
        },
    )
    uid = register["data"]["uid"]
    print(f"  Registered UID: {uid}")

    print("Step 2/7: Pay chit installment 1")
    pay_1 = _request("POST", "/chit/pay-installment", {"uid": uid, "amount": 200, "cycle_number": 1})
    score_1 = pay_1["data"]["trust_score"]
    print(f"  Trust score: {score_1}")

    print("Step 3/7: Pay chit installment 2")
    pay_2 = _request("POST", "/chit/pay-installment", {"uid": uid, "amount": 200, "cycle_number": 2})
    score_2 = pay_2["data"]["trust_score"]
    print(f"  Trust score: {score_2}")

    print("Step 4/7: Pay chit installment 3")
    pay_3 = _request("POST", "/chit/pay-installment", {"uid": uid, "amount": 200, "cycle_number": 3})
    score_3 = pay_3["data"]["trust_score"]
    print(f"  Trust score: {score_3}")

    if score_3 < 80:
        raise RuntimeError("Trust score did not reach loan unlock threshold.")

    print("Step 5/7: Access loan market")
    market = _request("GET", "/loans/market", query={"uid": uid})
    print(f"  Market access successful. Opportunities: {len(market.get('data', []))}")

    print("Step 6/7: Send threat message")
    threat_message = "If you do not send money now, I will come to your house and beat you"
    print(f"  Threat message submitted for analysis: {threat_message}")

    print("Step 7/7: Generate FIR draft")
    legal = _request(
        "POST",
        "/legal/scan-threat",
        {
            "uid": uid,
            "message_text": threat_message,
        },
    )
    result = legal["data"]
    print(f"  Threat detected: {result.get('is_threat_detected')}")
    print(f"  BNS section: {result.get('bns_section')}")
    print(f"  FIR draft: {result.get('draft_fir_text')}")

    print("Demo flow completed successfully")


if __name__ == "__main__":
    try:
        main()
    except RuntimeError as error:
        print(f"Demo flow failed: {error}")
        raise
