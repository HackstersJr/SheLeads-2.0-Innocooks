from __future__ import annotations

import json
from typing import Any

import httpx
from pydantic import ValidationError

from app.models.schemas import ThreatScanResult


MODEL_CHAIN = [
    "qwen2.5:7b",
    "qwen2.5:3b",
]


class ThreatDetectionAIService:
    def __init__(self) -> None:
        self._endpoint = "http://localhost:11434/api/chat"
        self._tags_endpoint = "http://localhost:11434/api/tags"
        self._keywords = [
            "kill",
            "harm",
            "send money now",
            "come to your house",
            "beat you",
        ]
        self._model_chain = MODEL_CHAIN

    async def analyze_message(self, text: str) -> ThreatScanResult:
        print("Running threat detection analysis")
        if not self._passes_keyword_filter(text):
            return self._safe_fallback()

        async with httpx.AsyncClient(timeout=30) as client:
            installed_models = await self._get_installed_models(client)
            for model in self._model_chain:
                print(f"Attempting model: {model}")
                if installed_models and model not in installed_models:
                    print("Model failed — trying next fallback")
                    continue

                try:
                    raw_content = await self._call_ollama_model(client=client, model=model, text=text)
                    parsed = self._parse_strict_json(raw_content)
                    if parsed.is_threat_detected or parsed.bns_section or parsed.draft_fir_text:
                        print(f"Using model: {model}")
                    return parsed
                except Exception as error:
                    error_text = str(error).lower()
                    if "model requires more system memory" in error_text:
                        print("Model failed — insufficient memory")
                    print("Model failed — trying next fallback")
                    continue

        return self._safe_fallback()

    def _passes_keyword_filter(self, text: str) -> bool:
        lowered = text.lower()
        return any(keyword in lowered for keyword in self._keywords)

    def _parse_strict_json(self, raw_content: str) -> ThreatScanResult:
        try:
            normalized = raw_content.strip()
            if normalized.startswith("```"):
                normalized = normalized.strip("`")
                normalized = normalized.replace("json", "", 1).strip()

            if not normalized.startswith("{"):
                start = normalized.find("{")
                end = normalized.rfind("}")
                if start != -1 and end != -1 and end > start:
                    normalized = normalized[start : end + 1]

            parsed: dict[str, Any] = json.loads(normalized)
            return ThreatScanResult.model_validate(parsed)
        except (json.JSONDecodeError, ValidationError, TypeError):
            return self._safe_fallback()

    async def _get_installed_models(self, client: httpx.AsyncClient) -> set[str]:
        try:
            response = await client.get(self._tags_endpoint)
            response.raise_for_status()
            payload = response.json()
            models = payload.get("models", [])
            names = {str(model.get("name", "")) for model in models}
            return {name for name in names if name}
        except Exception:
            return set()

    async def _call_ollama_model(self, client: httpx.AsyncClient, model: str, text: str) -> str:
        payload = {
            "model": model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are a legal threat detector for Indian women safety reports. "
                        "Return only strict JSON with keys: "
                        "is_threat_detected (bool), bns_section (string), draft_fir_text (string)."
                    ),
                },
                {
                    "role": "user",
                    "content": f"Analyze this text for extortion, threat, or violence:\n{text}",
                },
            ],
        }

        response = await client.post(self._endpoint, json=payload)
        if response.status_code >= 400:
            raise RuntimeError(response.text)

        body = response.json()
        return str(body.get("message", {}).get("content", ""))

    def _safe_fallback(self) -> ThreatScanResult:
        return ThreatScanResult(
            is_threat_detected=False,
            bns_section="",
            draft_fir_text="",
        )


threat_detection_ai_service = ThreatDetectionAIService()
