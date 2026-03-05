from __future__ import annotations

from fastapi import APIRouter

from app.models.schemas import APIMessage, APIResponse, ThreatScanRequest, ThreatScanResult
from app.services.firebase import firestore_service
from app.services.threat_detection_ai import threat_detection_ai_service

router = APIRouter(prefix="/legal", tags=["legal"])


@router.post("/scan-threat", response_model=APIResponse[ThreatScanResult])
async def scan_threat(payload: ThreatScanRequest) -> APIResponse[ThreatScanResult]:
    print("Threat analysis executed")
    result = await threat_detection_ai_service.analyze_message(payload.message_text)

    if result.is_threat_detected:
        await firestore_service.log_suspicious_activity(
            entry={
                "uid": payload.uid,
                "action": "threat_detected",
                "reason": "threat language identified in user report",
                "details": {
                    "bns_section": result.bns_section,
                },
            }
        )

    return APIResponse(
        message=APIMessage(
            code="THREAT_SCAN_COMPLETE",
            text="Threat analysis is complete. If needed, we can help you prepare a legal report.",
        ),
        data=result,
    )


@router.post("/analyze-threat", response_model=APIResponse[ThreatScanResult])
async def analyze_threat(payload: ThreatScanRequest) -> APIResponse[ThreatScanResult]:
    return await scan_threat(payload)
