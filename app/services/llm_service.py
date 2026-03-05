from __future__ import annotations

import json
import os
from typing import Any

from google import genai
from google.genai import types

GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL: str = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")


class LLMService:
    def __init__(self) -> None:
        self._client: genai.Client | None = (
            genai.Client(api_key=GEMINI_API_KEY) if GEMINI_API_KEY else None
        )

    async def run_llm(self, prompt: str) -> dict[str, Any]:
        if not self._client:
            print("[Gemini] GEMINI_API_KEY not set — returning keyword-only result.")
            return self._fallback_response()

        try:
            response = await self._client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.1,
                    max_output_tokens=2048,
                ),
            )
            raw = response.text or ""
            print(f"[Gemini] Raw response ({len(raw)} chars)")
            return self._parse_json(raw)
        except Exception as exc:
            print(f"[Gemini] API error: {exc}")
            return self._fallback_response()

    async def check_reachable(self) -> bool:
        """Ping Gemini to verify the API key and connectivity."""
        if not self._client:
            return False
        try:
            await self._client.aio.models.generate_content(
                model=GEMINI_MODEL,
                contents="ping",
                config=types.GenerateContentConfig(max_output_tokens=4),
            )
            return True
        except Exception:
            return False

    def _fallback_response(self) -> dict[str, Any]:
        return {
            "threat_detected": False,
            "threat_type": "unknown",
            "severity": "low",
            "law_section": "",
            "fir_draft": "",
            "reasoning_summary": "",
            "evidence": [],
            "confidence": 0.0,
        }

    def _parse_json(self, raw: str) -> dict[str, Any]:
        normalized = raw.strip()
        if normalized.startswith("```"):
            normalized = normalized.strip("`")
            normalized = normalized.replace("json", "", 1).strip()

        if not normalized.startswith("{"):
            start = normalized.find("{")
            end = normalized.rfind("}")
            if start != -1 and end != -1 and end > start:
                normalized = normalized[start : end + 1]

        try:
            parsed = json.loads(normalized)
            if isinstance(parsed.get("evidence"), str):
                parsed["evidence"] = [parsed["evidence"]]
            return parsed
        except Exception:
            return self._fallback_response()


llm_service = LLMService()
