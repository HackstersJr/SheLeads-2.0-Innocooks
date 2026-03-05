from __future__ import annotations

import os

import httpx
from fastapi import APIRouter

from app.services.firebase import is_firestore_enabled
from app.services.legal_retriever import load_legal_dataset
from app.services.llm_service import llm_service

router = APIRouter(prefix="/system", tags=["system"])


@router.get("/health", response_model=dict[str, str])
async def system_health() -> dict[str, str]:
    firestore_status = "connected" if is_firestore_enabled() else "disabled"

    dataset = load_legal_dataset()
    rag_status = "loaded" if dataset else "missing"

    gemini_key_present = bool(os.getenv("GEMINI_API_KEY", ""))
    gemini_status = "key_set" if gemini_key_present else "no_key"

    ollama_status = "unreachable"
    try:
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get("http://localhost:11434/api/tags")
            if resp.status_code == 200:
                ollama_status = "reachable"
    except Exception:
        pass

    return {
        "api": "ok",
        "firestore": firestore_status,
        "rag_dataset": rag_status,
        "gemini": gemini_status,
        "ollama": ollama_status,
    }
