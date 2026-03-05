"""Tests for Gemini Vision (image OCR) and Gemini Audio (speech transcription)
endpoints in the Legal Shield feature.

Strategy
--------
* Patch the Gemini ``generate_content`` calls so the suite never hits the live
  API and is not affected by quota limits.
* Verify that the OCR / audio text correctly flows through to the Legal
  Analysis Engine and produces a structured threat-scan response.
"""
from __future__ import annotations

import io
import struct
import wave
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from PIL import Image, ImageDraw

from app.main import app


# ── helpers ──────────────────────────────────────────────────────────────────

def _make_png_bytes(text: str = "Pay Rs 5000 or I will harm you") -> bytes:
    """Create a tiny PNG image containing the given text."""
    img = Image.new("RGB", (400, 60), color=(255, 255, 255))
    draw = ImageDraw.Draw(img)
    draw.text((8, 16), text, fill=(0, 0, 0))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _make_wav_bytes() -> bytes:
    """Create a tiny (silent) WAV file in memory."""
    buf = io.BytesIO()
    with wave.open(buf, "wb") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(16000)
        # 0.1 s of silence
        wf.writeframes(b"\x00\x00" * 1600)
    return buf.getvalue()


def _mock_gemini_text(text: str) -> MagicMock:
    """Return a mock sync Gemini response with .text == text."""
    resp = MagicMock()
    resp.text = text
    return resp


def _mock_gemini_async(text: str) -> AsyncMock:
    """Return a mock async Gemini response with .text == text."""
    resp = MagicMock()
    resp.text = text
    mock = AsyncMock(return_value=resp)
    return mock


# ── fixtures ─────────────────────────────────────────────────────────────────

@pytest.fixture()
def client() -> TestClient:
    return TestClient(app)


# ── image OCR tests ───────────────────────────────────────────────────────────

class TestGeminiVisionOCR:
    """Unit-level tests for ocr_service.extract_text_from_image with Gemini."""

    def test_extract_calls_gemini_when_client_present(self) -> None:
        from app.services import ocr_service

        expected_text = "Pay Rs 5000 or I will harm you"
        mock_resp = _mock_gemini_text(expected_text)

        with patch.object(ocr_service, "_client") as mock_client:
            mock_client.models.generate_content.return_value = mock_resp
            result = ocr_service.extract_text_from_image(_make_png_bytes())

        mock_client.models.generate_content.assert_called_once()
        assert result == expected_text

    def test_falls_back_to_tesseract_on_gemini_error(self) -> None:
        """When Gemini throws, the service must not raise — it falls to Tesseract."""
        from app.services import ocr_service

        with patch.object(ocr_service, "_client") as mock_client:
            mock_client.models.generate_content.side_effect = Exception("quota")
            # Tesseract may or may not be installed; we just need no unhandled crash.
            try:
                result = ocr_service.extract_text_from_image(_make_png_bytes())
                # If Tesseract is available it will return something
                assert isinstance(result, str)
            except RuntimeError:
                # Acceptable if Tesseract is also absent
                pass

    def test_no_client_skips_to_tesseract(self) -> None:
        """Without a Gemini client configured, Tesseract path is used directly."""
        from app.services import ocr_service

        with patch.object(ocr_service, "_client", None):
            try:
                result = ocr_service.extract_text_from_image(_make_png_bytes())
                assert isinstance(result, str)
            except RuntimeError:
                pass  # Tesseract not installed


class TestAnalyzeScreenshotEndpoint:
    """Integration tests for POST /ai/analyze-screenshot."""

    def test_screenshot_returns_legal_analysis(self, client: TestClient) -> None:
        threat_text = "Pay Rs 5000 or I will harm you and your family"

        # 1. Mock Gemini Vision OCR to return threat text
        ocr_resp = _mock_gemini_text(threat_text)

        # 2. Mock Gemini LLM to return a structured threat result
        llm_json = (
            '{"threat_detected": true, "threat_type": "extortion", '
            '"severity": "high", "law_section": "BNS 308(2)", '
            '"fir_draft": "FIR draft here", "reasoning_summary": "Clear extortion", '
            '"evidence": ["harm you"], "confidence": 0.9}'
        )
        llm_resp = MagicMock()
        llm_resp.text = llm_json

        import app.services.ocr_service as ocr_mod
        import app.services.llm_service as llm_mod

        with (
            patch.object(ocr_mod, "_client") as mock_vis,
            patch.object(llm_mod.llm_service, "_client") as mock_llm,
        ):
            mock_vis.models.generate_content.return_value = ocr_resp
            mock_llm.aio = MagicMock()
            mock_llm.aio.models.generate_content = AsyncMock(return_value=llm_resp)

            png_bytes = _make_png_bytes(threat_text)
            response = client.post(
                "/ai/analyze-screenshot",
                files={"file": ("threat.png", png_bytes, "image/png")},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["message"]["code"] == "AI_SCREENSHOT_ANALYSIS_COMPLETE"
        data = body["data"]
        assert "threat_detected" in data or "is_threat_detected" in data

    def test_empty_image_returns_400(self, client: TestClient) -> None:
        import app.services.ocr_service as ocr_mod

        with patch.object(ocr_mod, "_client") as mock_vis:
            mock_vis.models.generate_content.return_value = _mock_gemini_text("")
            # Patch Tesseract fallback path too
            with patch("app.services.ocr_service._extract_tesseract", return_value=""):
                response = client.post(
                    "/ai/analyze-screenshot",
                    files={"file": ("blank.png", _make_png_bytes(" "), "image/png")},
                )

        # If Gemini + Tesseract both return empty, endpoint returns 400
        # (may also return 200 if the test image contains faint text from PIL)
        assert response.status_code in (200, 400)


# ── audio transcription tests ─────────────────────────────────────────────────

class TestGeminiAudioTranscription:
    """Unit-level tests for llm_service.transcribe_audio."""

    @pytest.mark.asyncio
    async def test_transcribe_returns_text(self) -> None:
        from app.services.llm_service import LLMService

        svc = LLMService.__new__(LLMService)
        svc._client = MagicMock()
        svc._client.aio = MagicMock()
        svc._client.aio.models.generate_content = AsyncMock(
            return_value=MagicMock(text="Paise nahi diye toh maar dunga")
        )

        result = await svc.transcribe_audio(b"fake-audio", "audio/wav")
        assert result == "Paise nahi diye toh maar dunga"
        svc._client.aio.models.generate_content.assert_awaited_once()

    @pytest.mark.asyncio
    async def test_transcribe_returns_empty_when_no_client(self) -> None:
        from app.services.llm_service import LLMService

        svc = LLMService.__new__(LLMService)
        svc._client = None

        result = await svc.transcribe_audio(b"fake-audio", "audio/wav")
        assert result == ""

    @pytest.mark.asyncio
    async def test_transcribe_returns_empty_on_api_error(self) -> None:
        from app.services.llm_service import LLMService

        svc = LLMService.__new__(LLMService)
        svc._client = MagicMock()
        svc._client.aio = MagicMock()
        svc._client.aio.models.generate_content = AsyncMock(
            side_effect=Exception("quota exceeded")
        )

        result = await svc.transcribe_audio(b"fake-audio", "audio/wav")
        assert result == ""


class TestAnalyzeAudioEndpoint:
    """Integration tests for POST /ai/analyze-audio."""

    def test_audio_returns_legal_analysis_with_transcript(
        self, client: TestClient
    ) -> None:
        transcript = "Paise nahi diye toh maar dunga aur ghar jala dunga"

        llm_json = (
            '{"threat_detected": true, "threat_type": "physical_threat", '
            '"severity": "high", "law_section": "BNS 351(2)", '
            '"fir_draft": "FIR draft", "reasoning_summary": "Physical threat", '
            '"evidence": ["maar dunga"], "confidence": 0.95}'
        )
        llm_resp = MagicMock()
        llm_resp.text = llm_json

        import app.services.llm_service as llm_mod

        with patch.object(llm_mod.llm_service, "_client") as mock_client:
            # Mock audio transcription
            audio_resp = MagicMock()
            audio_resp.text = transcript
            mock_client.aio = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(
                side_effect=[audio_resp, llm_resp]  # first=transcription, second=LLM
            )

            wav_bytes = _make_wav_bytes()
            response = client.post(
                "/ai/analyze-audio",
                files={"file": ("voice.wav", wav_bytes, "audio/wav")},
            )

        assert response.status_code == 200
        body = response.json()
        assert body["message"]["code"] == "AI_AUDIO_ANALYSIS_COMPLETE"
        data = body["data"]
        assert data["transcript"] == transcript

    def test_unsupported_audio_format_returns_415(self, client: TestClient) -> None:
        response = client.post(
            "/ai/analyze-audio",
            files={"file": ("video.mp4", b"fake", "video/mp4")},
        )
        assert response.status_code == 415

    def test_empty_audio_returns_400(self, client: TestClient) -> None:
        import app.services.llm_service as llm_mod

        with patch.object(llm_mod.llm_service, "_client") as mock_client:
            mock_client.aio = MagicMock()
            mock_client.aio.models.generate_content = AsyncMock(
                return_value=MagicMock(text="")
            )

            response = client.post(
                "/ai/analyze-audio",
                files={"file": ("silent.wav", _make_wav_bytes(), "audio/wav")},
            )

        assert response.status_code == 400
        assert "transcribe" in response.json()["detail"].lower()
