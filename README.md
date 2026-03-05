# SheVest Backend

FastAPI backend for SheVest with trust scoring, fraud checks, emergency loans, chit rewards, and AI legal threat screening.

## Quick Start

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Run API:

```bash
uvicorn app.main:app --reload
```

3. (Optional) Seed demo data:

```bash
python scripts/seed_demo_data.py
```

## Demo Assets

- Postman collection: `postman/SheVest.postman_collection.json`
- Seed script: `scripts/seed_demo_data.py`

## Notes

- By default, data uses in-memory fallback for hackathon speed.
- Set `USE_FIRESTORE=true` to switch to Firestore async client if configured.
- Threat detection calls local Ollama endpoint at `http://localhost:11434/api/chat`.

## Local AI Setup (Low RAM Machines)

Install local models:

```bash
ollama pull qwen2.5:3b
ollama pull qwen2.5:7b
```

The backend automatically uses a memory-safe fallback chain:

- First try: `qwen2.5:7b`
- Fallback: `qwen2.5:3b`
- Final safety: strict JSON fallback response if model calls fail

This allows demos to continue on constrained machines where the 7B model cannot load.
