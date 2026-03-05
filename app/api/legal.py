from __future__ import annotations

from pathlib import Path
from tempfile import NamedTemporaryFile

from fastapi import APIRouter
from fastapi import File, HTTPException, UploadFile

from app.models.schemas import APIMessage, APIResponse, ThreatScanRequest, ThreatScanResult
from app.services.firebase import firestore_service
from app.services.legal_analysis_engine import legal_analysis_engine
from app.services.ocr_service import extract_text_from_image
from app.services.threat_detection_ai import threat_detection_ai_service

router = APIRouter(prefix="/legal", tags=["legal"])
ai_router = APIRouter(prefix="/ai", tags=["ai"])


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


@ai_router.post("/analyze-text", response_model=APIResponse[dict])
async def analyze_text(payload: dict[str, str]) -> APIResponse[dict]:
    text = str(payload.get("text", "")).strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")

    result = await legal_analysis_engine.analyze_input(text)
    return APIResponse(
        message=APIMessage(code="AI_ANALYSIS_COMPLETE", text="AI legal analysis completed."),
        data=result,
    )


@ai_router.post("/analyze-screenshot", response_model=APIResponse[dict])
async def analyze_screenshot(file: UploadFile = File(...)) -> APIResponse[dict]:
    suffix = Path(file.filename or "screenshot.png").suffix or ".png"
    temp_path: Path | None = None

    try:
        with NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            content = await file.read()
            tmp.write(content)
            temp_path = Path(tmp.name)

        try:
            extracted_text = extract_text_from_image(temp_path)
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=str(exc)) from exc

        if not extracted_text.strip():
            raise HTTPException(status_code=400, detail="No text could be extracted from image")

        result = await legal_analysis_engine.analyze_input(extracted_text)
        return APIResponse(
            message=APIMessage(code="AI_SCREENSHOT_ANALYSIS_COMPLETE", text="Screenshot analysis completed."),
            data=result,
        )
    finally:
        if temp_path is not None and temp_path.exists():
            temp_path.unlink(missing_ok=True)
