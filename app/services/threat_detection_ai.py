from __future__ import annotations

import json
from typing import Any

import httpx
from pydantic import ValidationError

from app.models.schemas import ThreatScanResult
from app.services.legal_analysis_engine import legal_analysis_engine
from app.services.legal_retriever import retrieve_relevant_laws


MODEL_CHAIN = [
    "qwen2.5:7b",
    "qwen2.5:3b",
]


class ThreatDetectionAIService:
    def __init__(self) -> None:
        self._endpoint = "http://localhost:11434/api/chat"
        self._tags_endpoint = "http://localhost:11434/api/tags"
        self._model_chain = MODEL_CHAIN
        self._threat_indicators = [
            "harm",
            "kill",
            "family",
            "repay",
            "money",
            "threat",
            "extort",
            "loan",
        ]

    async def analyze_message(self, text: str) -> ThreatScanResult:
        analysis = await legal_analysis_engine.analyze_input(text)
        return ThreatScanResult(
            is_threat_detected=bool(analysis.get("threat_detected", False)),
            bns_section=str(analysis.get("law_section", "")),
            draft_fir_text=str(analysis.get("fir_draft", "")),
            reasoning_summary=str(analysis.get("reasoning_summary", "")) or None,
            evidence=analysis.get("evidence", []),
        )

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
            # Be tolerant to model variations while preserving output schema.
            if isinstance(parsed.get("evidence"), str):
                parsed["evidence"] = [parsed["evidence"]]
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

    async def _call_ollama_model(
        self,
        client: httpx.AsyncClient,
        model: str,
        text: str,
        legal_context: str,
        evidence: list[str],
    ) -> str:
        payload = {
            "model": model,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an Indian legal assistant helping vulnerable borrowers. "
                        "Analyze chat messages for threats, extortion, or intimidation. "
                        "Use the provided Legal Context as authoritative law. "
                        "Return strict JSON with the following schema: "
                        "{"
                        "'is_threat_detected': boolean, "
                        "'bns_section': string, "
                        "'draft_fir_text': string, "
                        "'reasoning_summary': string, "
                        "'evidence': [string]"
                        "}. "
                        "Reasoning summary should briefly explain why the law applies. "
                        "Evidence should contain bullet-style facts extracted from the message. "
                        "If a threat is detected, use bns_section as exact '<section> <title>' from Legal Context."
                    ),
                },
                {
                    "role": "user",
                    "content": (
                        "Return strict JSON in this schema:\n"
                        "{\n"
                        '  "is_threat_detected": boolean,\n'
                        '  "bns_section": string,\n'
                        '  "draft_fir_text": string,\n'
                        '  "reasoning_summary": string,\n'
                        '  "evidence": [string]\n'
                        "}\n\n"
                        f"User message:\n{text}\n\n"
                        f"Legal Context:\n{legal_context}\n\n"
                        "Evidence Hints:\n"
                        + "\n".join(f"- {item}" for item in evidence)
                    ),
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
            reasoning_summary=None,
            evidence=[],
        )

    def _format_legal_context(self, retrieved_laws: list[dict[str, str]]) -> str:
        if not retrieved_laws:
            return "No legal references retrieved."

        lines = ["Relevant Laws:"]
        for law in retrieved_laws:
            section = law.get("section", "")
            title = law.get("title", "")
            description = law.get("description", "")
            lines.append(f"{section} - {title}")
            lines.append(f"Definition: {description}")
            lines.append("")

        return "\n".join(lines).strip()

    def _normalize_section_from_context(
        self,
        parsed: ThreatScanResult,
        retrieved_laws: list[dict[str, str]],
    ) -> ThreatScanResult:
        if not parsed.is_threat_detected or not retrieved_laws:
            return parsed

        top_law = retrieved_laws[0]
        top_section = top_law.get("section", "").strip()
        top_title = top_law.get("title", "").strip()
        preferred = f"{top_section} {top_title}".strip()
        if not preferred:
            return parsed

        current = parsed.bns_section.strip()
        if not current:
            parsed.bns_section = preferred
            return parsed

        current_lc = current.lower()
        section_lc = top_section.lower()
        if section_lc and section_lc in current_lc:
            parsed.bns_section = preferred
            return parsed

        # Normalize partial values like "308(2)" to context-backed section label.
        if "bns" not in current_lc and any(ch.isdigit() for ch in current_lc):
            parsed.bns_section = preferred

        return parsed

    def _extract_evidence(self, text: str, retrieved_laws: list[dict[str, str]]) -> list[str]:
        lowered = (text or "").lower()
        evidence: list[str] = []

        if any(token in lowered for token in ("harm", "kill", "hurt")):
            evidence.append("Threat of physical harm detected")
        if any(token in lowered for token in ("family", "mother", "father", "children")):
            evidence.append("Threat references family or close relations")
        if any(token in lowered for token in ("repay", "return", "money", "loan", "pay")):
            evidence.append("Threat tied to financial repayment or money demand")
        if any(token in lowered for token in self._threat_indicators):
            evidence.append("Message contains threat-related indicators")

        top_law = retrieved_laws[0] if retrieved_laws else None
        if top_law:
            title = str(top_law.get("title", "")).strip()
            if title:
                evidence.append(f"Matches legal context: {title}")

        # Keep only unique items preserving insertion order.
        return list(dict.fromkeys(evidence))

    def _merge_evidence(self, parsed: ThreatScanResult, extracted: list[str]) -> ThreatScanResult:
        model_evidence = parsed.evidence or []
        merged = [item for item in model_evidence if isinstance(item, str) and item.strip()]
        merged.extend(extracted)
        parsed.evidence = list(dict.fromkeys(merged))
        return parsed


threat_detection_ai_service = ThreatDetectionAIService()
