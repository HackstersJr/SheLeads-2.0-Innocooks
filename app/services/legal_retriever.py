from __future__ import annotations

import json
from pathlib import Path
from typing import Any

DATASET_PATH = Path(__file__).resolve().parents[1] / "data" / "legal_sections.json"
MAX_RESULTS = 3


def load_legal_dataset() -> list[dict[str, Any]]:
    """Load legal reference entries used for lightweight keyword retrieval."""
    if not DATASET_PATH.exists():
        return []

    try:
        with DATASET_PATH.open("r", encoding="utf-8") as handle:
            payload = json.load(handle)
    except (OSError, json.JSONDecodeError):
        return []

    if not isinstance(payload, list):
        return []

    return [entry for entry in payload if isinstance(entry, dict)]


def retrieve_relevant_laws(message: str) -> list[dict[str, str]]:
    """Return top-matching laws for a user message based on keyword overlap."""
    message_lc = (message or "").lower()
    dataset = load_legal_dataset()
    if not dataset:
        return []

    scored: list[tuple[int, dict[str, Any]]] = []
    for entry in dataset:
        keywords = entry.get("keywords", [])
        if not isinstance(keywords, list):
            continue

        score = 0
        for keyword in keywords:
            if not isinstance(keyword, str):
                continue
            if keyword.lower() in message_lc:
                score += 1

        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda item: item[0], reverse=True)

    if not scored:
        # Provide a safe default legal anchor when no keyword overlap is found.
        fallback = dataset[0]
        return [
            {
                "section": str(fallback.get("section", "")),
                "title": str(fallback.get("title", "")),
                "description": str(fallback.get("description", "")),
            }
        ]

    top_matches = scored[:MAX_RESULTS]
    return [
        {
            "section": str(entry.get("section", "")),
            "title": str(entry.get("title", "")),
            "description": str(entry.get("description", "")),
        }
        for _, entry in top_matches
    ]


def retrieve_all_laws() -> list[dict[str, str]]:
    """Return every legal section in the dataset for use as full RAG context."""
    dataset = load_legal_dataset()
    return [
        {
            "section": str(entry.get("section", "")),
            "title": str(entry.get("title", "")),
            "description": str(entry.get("description", "")),
            "keywords": ", ".join(entry.get("keywords", [])),
        }
        for entry in dataset
        if isinstance(entry, dict)
    ]
