"""OCR service — Gemini Vision primary, Tesseract fallback.

Uses gemini-2.5-flash multimodal understanding to extract text from images
(WhatsApp screenshots, documents, contracts).  Falls back to Tesseract when
GEMINI_API_KEY is not set.
"""
from __future__ import annotations

import mimetypes
import os
from io import BytesIO
from pathlib import Path
from typing import BinaryIO

from google import genai
from google.genai import types

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

_client: genai.Client | None = (
    genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
)

_OCR_PROMPT = (
    "Extract and return every line of visible text from this image exactly as it is written. "
    "Include text in any language (Hindi, English, etc.). "
    "Do not add explanations, labels, or commentary. Output only the raw transcribed text."
)


def _read_file(file: str | Path | bytes | BinaryIO) -> tuple[bytes, str]:
    """Return (raw_bytes, mime_type)."""
    if isinstance(file, (str, Path)):
        path = Path(file)
        raw = path.read_bytes()
        mime = mimetypes.guess_type(str(path))[0] or "image/jpeg"
    elif isinstance(file, bytes):
        raw = file
        mime = "image/jpeg"
    else:
        raw = file.read()
        mime = getattr(file, "content_type", None) or "image/jpeg"
    return raw, mime


def extract_text_from_image(file: str | Path | bytes | BinaryIO) -> str:
    """Extract UTF-8 text from an image (Gemini Vision → Tesseract fallback)."""
    raw, mime = _read_file(file)
    if _client:
        return _extract_gemini(raw, mime)
    return _extract_tesseract(raw)


def _extract_gemini(raw: bytes, mime: str) -> str:
    try:
        response = _client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[
                types.Part.from_bytes(data=raw, mime_type=mime),
                _OCR_PROMPT,
            ],
        )
        text = (response.text or "").strip()
        print(f"[Gemini Vision] OCR extracted ({len(text)} chars):", text[:120])
        return text
    except Exception as exc:
        print(f"[Gemini Vision] OCR error: {exc} — falling back to Tesseract")
        return _extract_tesseract(raw)


def _extract_tesseract(raw: bytes) -> str:
    try:
        import pytesseract  # type: ignore
        from PIL import Image  # type: ignore
        from pytesseract import TesseractNotFoundError  # type: ignore

        image = Image.open(BytesIO(raw))
        text = pytesseract.image_to_string(image).strip()
        print("[Tesseract] OCR extracted text:", text[:120])
        return text
    except TesseractNotFoundError as exc:
        raise RuntimeError("Tesseract OCR binary not found and Gemini Vision not configured") from exc
    except Exception as exc:
        raise RuntimeError(f"OCR failed: {exc}") from exc
