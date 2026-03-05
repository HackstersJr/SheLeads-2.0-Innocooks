from __future__ import annotations

from typing import Any

from app.services.legal_retriever import retrieve_all_laws
from app.services.llm_service import llm_service


class LegalAnalysisEngine:
    # Primary triggers — any single hit = threat_detected (explicit harm/action words)
    _PRIMARY_THREAT_KEYWORDS = frozenset({
        "harm", "kill", "hurt", "threat", "threaten",
        "leak", "harass", "warn", "consequences", "regret",
        "suffer", "action", "collection", "agent",
        "beat", "violence",
    })

    # Financial context words — only upgrade type to "extortion" when a primary
    # trigger is ALSO present; never trigger threat_detected alone.
    _FINANCIAL_CONTEXT_KEYWORDS = frozenset({
        "repay", "money", "loan", "dues", "pay",
    })

    # Sexual violence keywords — always critical, always trigger on their own
    _SEXUAL_VIOLENCE_KEYWORDS = frozenset({
        "rape", "raped", "raping", "molest", "molestation",
        "sexually", "sexual assault", "forced", "touched me",
        "touched her", "stripped", "undress",
    })

    # Physical violence keywords — always high severity, trigger on their own
    _PHYSICAL_VIOLENCE_KEYWORDS = frozenset({
        "beat", "beaten", "hit me", "slapped", "punched",
        "kicked", "physically", "attacked", "assault",
    })

    def __init__(self) -> None:
        # Keep for backward compatibility with other callers; not used in detection.
        self._threat_keywords: set[str] = set()

    async def analyze_input(self, text: str) -> dict[str, Any]:
        threat_signal = self._detect_threat_pattern(text)
        print("Threat pattern detection result:", threat_signal)

        all_laws = retrieve_all_laws()
        print(f"RAG context: {len(all_laws)} legal sections loaded for Gemini")

        prompt = self._build_prompt(text, all_laws, threat_signal)
        print("Sending prompt to Gemini")
        llm_result = await llm_service.run_llm(prompt)

        normalized = self._normalize_result(llm_result, threat_signal, all_laws)
        return normalized

    def _detect_threat_pattern(self, text: str) -> dict[str, Any]:
        lowered = (text or "").lower()

        # Tier 1: sexual violence — critical, standalone trigger
        sexual_hits = [kw for kw in self._SEXUAL_VIOLENCE_KEYWORDS if kw in lowered]

        # Tier 2: physical violence — high, standalone trigger
        physical_hits = [kw for kw in self._PHYSICAL_VIOLENCE_KEYWORDS if kw in lowered]

        # Tier 3: primary threat words — standalone trigger
        primary_hits = [kw for kw in self._PRIMARY_THREAT_KEYWORDS if kw in lowered]

        # Financial context words only amplify; never trigger alone
        financial_hits = [kw for kw in self._FINANCIAL_CONTEXT_KEYWORDS if kw in lowered]

        all_evidence = sexual_hits + physical_hits + primary_hits
        threat_detected = bool(all_evidence)  # financial_hits NOT included here

        if sexual_hits:
            threat_type = "sexual_assault"
            severity = "critical"
        elif physical_hits:
            threat_type = "physical_assault"
            severity = "high"
        elif primary_hits and financial_hits:
            threat_type = "extortion"
            severity = "high" if any(t in lowered for t in ("kill", "harm")) else "medium"
        elif primary_hits:
            threat_type = "intimidation"
            severity = "high" if any(t in lowered for t in ("kill", "harm")) else "medium"
        else:
            threat_type = "none"
            severity = "low"

        return {
            "threat_detected": threat_detected,
            "threat_type": threat_type,
            "severity": severity,
            "evidence": [f"Keyword match: {item}" for item in all_evidence],
            "confidence": min(0.95, 0.5 + 0.1 * len(all_evidence)) if all_evidence else 0.05,
        }

    def _build_prompt(self, text: str, laws: list[dict[str, str]], signal: dict[str, Any]) -> str:
        law_lines = []
        for law in laws:
            law_lines.append(
                f"• {law.get('section', '')} — {law.get('title', '')}: "
                f"{law.get('description', '')} "
                f"[keywords: {law.get('keywords', '')}]"
            )

        legal_corpus = "\n".join(law_lines).strip() or "No local dataset available — use your built-in knowledge of Indian law."
        evidence_hints = "\n".join(f"- {item}" for item in signal.get("evidence", [])) or "- None"

        return (
            "You are an expert Indian legal assistant integrated into a women's safety application.\n"
            "Your task is to analyse the victim's message and identify any legal violations under "
            "the Bharatiya Nyaya Sanhita (BNS), IT Act, RBI guidelines, or other applicable Indian law.\n\n"
            "## Legal Knowledge Base (RAG context)\n"
            "Use the sections below as your primary reference. You also have full knowledge of "
            "Indian law and must supplement these sections where relevant:\n\n"
            f"{legal_corpus}\n\n"
            "## Keyword Detection Hints (pre-analysis)\n"
            f"{evidence_hints}\n\n"
            "## Victim's Message\n"
            f"{text}\n\n"
            "## Instructions\n"
            "1. Carefully read the message and identify ALL applicable offences.\n"
            "2. Match the offence to the most specific BNS / IT Act section.\n"
            "3. CRITICAL RULES:\n"
            "   - Any report of rape, sexual assault, or molestation → threat_detected=true, "
            "severity=critical, threat_type=sexual_assault, cite BNS 63 and/or BNS 74.\n"
            "   - Physical violence (beating, slapping, attacking) → threat_detected=true, "
            "severity=high, threat_type=physical_assault.\n"
            "   - Financial coercion with threats → threat_type=extortion, cite BNS 308.\n"
            "   - Harassment or intimidation without violence → threat_type=intimidation, cite BNS 351.\n"
            "   - Neutral/safe messages → threat_detected=false, threat_type=none, severity=low.\n"
            "4. Draft a formal FIR complaint in 2-3 sentences when threat_detected=true.\n\n"
            "Return ONLY a valid JSON object with these exact keys:\n"
            "threat_detected (bool), threat_type (string: extortion|intimidation|physical_assault|"
            "sexual_assault|none), severity (string: critical|high|medium|low), "
            "law_section (string, most relevant section citation), fir_draft (string), "
            "reasoning_summary (string, 1-2 sentences), evidence (array of strings), "
            "confidence (float 0.0-1.0)"
        )

    # Maps threat_type to the most appropriate fallback BNS section when Gemini
    # returns an empty or missing law_section.
    _THREAT_TYPE_SECTION_FALLBACK: dict[str, str] = {
        "extortion": "BNS 308 (Extortion)",
        "intimidation": "BNS 351 (Criminal Intimidation)",
        "physical_assault": "BNS 115 (Voluntarily Causing Hurt)",
        "sexual_assault": "BNS 63 (Rape) / BNS 74 (Assault with intent to outrage modesty)",
    }

    def _normalize_result(
        self,
        llm_result: dict[str, Any],
        signal: dict[str, Any],
        retrieved_laws: list[dict[str, str]],
    ) -> dict[str, Any]:
        evidence: list[str] = []
        llm_evidence = llm_result.get("evidence", [])
        if isinstance(llm_evidence, list):
            evidence.extend(str(item) for item in llm_evidence if str(item).strip())
        evidence.extend(signal.get("evidence", []))
        evidence = list(dict.fromkeys(evidence))

        llm_threat_detected = bool(llm_result.get("threat_detected", False))
        signal_threat_detected = bool(signal.get("threat_detected", False))
        threat_detected = llm_threat_detected or signal_threat_detected

        threat_type = str(llm_result.get("threat_type") or "").strip()
        if not threat_type or threat_type == "unknown":
            threat_type = str(signal.get("threat_type") or "unknown")

        severity = str(llm_result.get("severity") or "").strip()
        if not severity or severity == "low":
            severity = str(signal.get("severity") or "low")

        # Use Gemini's section if valid; fall back to threat-type mapping; clear if no threat.
        llm_section = str(llm_result.get("law_section") or "").strip()
        if not threat_detected:
            law_section = ""
        elif llm_section:
            law_section = llm_section
        else:
            law_section = self._THREAT_TYPE_SECTION_FALLBACK.get(threat_type, "")
        fir_draft = str(llm_result.get("fir_draft") or "")
        reasoning_summary = str(llm_result.get("reasoning_summary") or "")

        if threat_detected and not fir_draft:
            threat_type_val = str(signal.get("threat_type", ""))
            if threat_type_val == "sexual_assault":
                fir_draft = (
                    "The complainant reports that they were subjected to sexual assault by the accused. "
                    "This complaint is filed under BNS Section 63 (Rape) and BNS Section 74 (Assault or criminal force "
                    "to woman with intent to outrage her modesty). Immediate police investigation is requested. "
                    "The complainant requests protection and legal action against the accused."
                )
            elif threat_type_val == "physical_assault":
                fir_draft = (
                    "The complainant states that they were physically assaulted by the accused. "
                    f"Requested action under {law_section or 'BNS 115 (Voluntarily causing hurt)'}."
                )
            else:
                fir_draft = (
                    "The complainant states that the accused used threatening language "
                    "to coerce repayment of money, causing fear and intimidation. "
                    f"Requested action under {law_section or 'relevant legal provisions'}."
                )

        if threat_detected and not reasoning_summary:
            threat_type_val = str(signal.get("threat_type", ""))
            if threat_type_val == "sexual_assault":
                reasoning_summary = (
                    "Language indicating sexual assault was detected in the complainant's message. "
                    "This is a critical severity incident requiring immediate police intervention."
                )
            else:
                reasoning_summary = (
                    "Threat-related language and coercive cues were detected in the message, "
                    "matching retrieved legal context."
                )

        try:
            confidence = float(llm_result.get("confidence", signal.get("confidence", 0.0)))
        except (TypeError, ValueError):
            confidence = float(signal.get("confidence", 0.0))

        if signal_threat_detected:
            confidence = max(confidence, float(signal.get("confidence", 0.0)))

        return {
            "threat_detected": threat_detected,
            "threat_type": threat_type,
            "severity": severity,
            "law_section": law_section,
            "fir_draft": fir_draft,
            "reasoning_summary": reasoning_summary,
            "evidence": evidence,
            "confidence": max(0.0, min(1.0, confidence)),
        }


legal_analysis_engine = LegalAnalysisEngine()
