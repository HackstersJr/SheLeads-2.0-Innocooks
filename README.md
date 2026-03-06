<div align="center">
  <img src="SV-Frntend/public/icon-512.png" alt="SheVest Logo" width="120" style="border-radius:24px" />

  # SheVest — Financial & Legal Shield for Women

  **B2B2C FinTech ecosystem empowering rural women through micro-credit, chit-fund rewards, P2P lending, and an AI-powered legal bodyguard.**

  [![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
  [![React](https://img.shields.io/badge/Frontend-React_18-61DAFB?logo=react)](https://react.dev/)
  [![Vite PWA](https://img.shields.io/badge/PWA-Vite_Plugin_PWA-646CFF?logo=vite)](https://vite-pwa-org.netlify.app/)
  [![Gemini AI](https://img.shields.io/badge/AI-Gemini_Vision-4285F4?logo=google)](https://ai.google.dev/)
  [![Firebase](https://img.shields.io/badge/DB-Firestore-FFCA28?logo=firebase)](https://firebase.google.com/)
</div>

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
  - [Backend](#backend-setup)
  - [Frontend](#frontend-setup)
- [Running the App](#running-the-app)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Demo Credentials](#demo-credentials)
- [Project Structure](#project-structure)

---

## Overview

SheVest is a mobile-first PWA built for the **SheLeads Hackathon**. It bridges the gap between rural women borrowers and NGO/B2B partners by providing:

- **Micro-credit & Chit Funds** — earn trust points, unlock credit lines
- **P2P Lending Marketplace** — fractional loan funding by microinvestors
- **Emergency Loans** — instant disbursal for verified, high-trust borrowers
- **AI Legal Bodyguard** — scan WhatsApp screenshots and voice messages for predatory lending clauses, harassment, or fraud — auto-generates FIR drafts
- **Trust Engine** — a dynamic, event-driven credit score replacing traditional CIBIL for unbanked users

---

## Key Features

| Module | Capability |
|---|---|
| **Auth** | OTP-based phone login · KYC registration (Aadhaar + UPI) · NGO admin login |
| **Trust Engine** | Real-time score (0–100) · event log · admin moderation |
| **Chit Fund** | Monthly installment tracking · cycle completion rewards |
| **Loans** | Emergency loans · P2P marketplace · fractional funding · default simulation |
| **Legal Bodyguard** | AI threat scan of text messages & screenshot OCR (Gemini Vision) |
| **AI Analysis** | Text analysis · image/screenshot OCR · audio transcription (Gemini) |
| **Fraud Detection** | Suspicious activity logs · pattern-based threat classification |
| **PWA** | Installable on Android & iOS · offline support · push-ready |
| **B2B White-label** | NGO partner dashboard · language toggle (EN / हिं) |

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Mobile Browser / PWA               │
│              React 18 + Vite + Tailwind              │
└───────────────────────┬─────────────────────────────┘
                        │ HTTPS / REST JSON
┌───────────────────────▼─────────────────────────────┐
│               FastAPI Backend (Python)               │
│  /auth  /chit  /loans  /legal  /ai  /admin  /system  │
│                                                      │
│  ┌──────────────┐  ┌───────────────┐  ┌──────────┐  │
│  │ Trust Engine │  │  Threat AI    │  │ Gemini   │  │
│  │ (scoring)    │  │  (fraud scan) │  │ Vision   │  │
│  └──────────────┘  └───────────────┘  └──────────┘  │
└───────────────────────┬─────────────────────────────┘
                        │
         ┌──────────────▼──────────────┐
         │  Firebase Firestore / RAM   │
         │  (toggled via USE_FIRESTORE)│
         └─────────────────────────────┘
```

---

## Tech Stack

**Backend**
- Python 3.11+ · FastAPI · Uvicorn (ASGI)
- Pydantic v2 · python-jose (JWT) · passlib (bcrypt)
- Google Generative AI SDK (Gemini Vision + Audio)
- Firebase Admin SDK / Firestore
- Pytesseract + Pillow (OCR fallback)
- Pytest (15+ integration tests)

**Frontend**
- React 18 · React Router v6
- Vite 5 + vite-plugin-pwa (service worker, manifest)
- Tailwind CSS 3 · Framer Motion
- Lucide React icons

---

## Prerequisites

| Tool | Version |
|---|---|
| Python | 3.11+ |
| Node.js | 18+ |
| npm | 9+ |
| Git | any |
| (Optional) Tesseract OCR | 5.x |
| (Optional) Ollama | for local LLM fallback |

---

## Installation

### Backend Setup

```bash
# 1. Clone the repository
git clone https://github.com/HackstersJr/SheLeads-2.0-Innocooks.git
cd SheLeads-2.0-Innocooks

# 2. Create and activate virtual environment
python -m venv .venv

# Windows
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# 3. Install Python dependencies
pip install -r requirements.txt

# 4. (Optional) Seed demo data
python scripts/seed_demo_data.py
```

### Frontend Setup

```bash
cd SV-Frntend

# Install Node dependencies
npm install
```

---

## Running the App

### Start the Backend

```bash
# From repo root, with venv activated
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

The API will be available at `http://localhost:8000`.  
Interactive docs: `http://localhost:8000/docs`

### Start the Frontend

```bash
cd SV-Frntend

# For local development
npm run dev

# For mobile testing on the same Wi-Fi network
npm run dev -- --host
```

Vite will print the local network URL (e.g. `http://192.168.x.x:5173`) — open that on your phone.

### Production Build

```bash
cd SV-Frntend
npm run build
npm run preview
```

---

## Environment Variables

### Backend — `.env` (repo root)

| Variable | Default | Description |
|---|---|---|
| `USE_FIRESTORE` | `false` | Set `true` to use Firestore instead of in-memory store |
| `FIREBASE_KEY_PATH` | `firebase_key.json` | Path to Firebase service account JSON |
| `GEMINI_API_KEY` | — | Google AI Studio API key for Gemini Vision / Audio |
| `JWT_SECRET_KEY` | auto | Secret for signing JWT tokens |

### Frontend — `SV-Frntend/.env.local`

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE` | `http://localhost:8000` | Backend API base URL (use LAN IP for mobile testing) |

Example for mobile testing:
```env
VITE_API_BASE=http://192.168.x.x:8000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/send-otp` | Send OTP to phone number |
| `POST` | `/auth/verify-otp` | Verify OTP, returns JWT |
| `POST` | `/auth/register` | Register new borrower (KYC) |
| `POST` | `/auth/ngo-login` | NGO admin login |
| `POST` | `/chit/pay-installment` | Record monthly chit installment |
| `POST` | `/loans/emergency` | Apply for emergency micro-loan |
| `POST` | `/loans/p2p` | Create a P2P loan listing |
| `POST` | `/loans/p2p/{id}/fund` | Fund a P2P loan (fractional) |
| `GET` | `/loans/marketplace` | List all open P2P loan listings |
| `POST` | `/legal/scan-threat` | AI scan of a text message for threats |
| `POST` | `/legal/analyze-threat` | Deep legal threat analysis |
| `POST` | `/ai/analyze-text` | Analyze raw legal text |
| `POST` | `/ai/analyze-screenshot` | OCR + analyze image/screenshot |
| `POST` | `/ai/analyze-audio` | Transcribe + analyze audio file |
| `GET` | `/admin/suspicious-activity` | List flagged suspicious activities |
| `POST` | `/admin/trust/moderate` | Manually adjust a user's trust score |
| `GET` | `/system/health` | Health check |

Full interactive docs available at `http://localhost:8000/docs` when the backend is running.

---

## Demo Credentials

All demo data is seeded by `scripts/seed_demo_data.py`.

| Role | Phone / ID | Password / OTP |
|---|---|---|
| Borrower | Any 10-digit number | OTP shown on screen (demo mode) |
| NGO Admin | `admin` | `shevest2024` |

> In demo mode the generated OTP is returned directly in the API response and displayed on the login screen in amber text — no SMS gateway required.

---

## Project Structure

```
SheLeads-2.0-Innocooks/
├── app/
│   ├── main.py                 # FastAPI app, CORS, router registration
│   ├── api/
│   │   ├── auth.py             # OTP login, KYC registration, JWT
│   │   ├── chit.py             # Chit fund installment payments
│   │   ├── loans.py            # Emergency & P2P loans, marketplace
│   │   ├── legal.py            # Threat scan, OCR, AI legal analysis
│   │   ├── admin.py            # Trust moderation, suspicious activity
│   │   └── system.py           # Health check
│   ├── models/
│   │   └── schemas.py          # Pydantic models (User, Loan, Trust…)
│   └── services/
│       ├── trust_engine.py     # Dynamic trust scoring
│       ├── threat_detection_ai.py  # AI fraud / threat classifier
│       ├── legal_analysis_engine.py # Legal clause analyser
│       ├── ocr_service.py      # Gemini Vision OCR
│       ├── llm_service.py      # Gemini text + audio transcription
│       ├── firebase.py         # Firestore client
│       └── jwt_service.py      # JWT sign / verify
├── SV-Frntend/
│   ├── public/
│   │   ├── icon-192.png        # PWA icon
│   │   └── icon-512.png        # PWA icon (large)
│   ├── src/
│   │   ├── views/              # Page-level components
│   │   ├── components/         # Shared UI components
│   │   ├── api/shevestApi.js   # API client (fetch wrapper)
│   │   └── context/AppContext.jsx  # Global auth + i18n state
│   ├── vite.config.js          # Vite + PWA config
│   └── index.html
├── tests/                      # Pytest integration tests
├── scripts/                    # Seed & demo scripts
├── postman/                    # Postman collection
└── requirements.txt
```

---

## Local AI Setup (Optional)

For offline AI threat detection without a Gemini API key:

```bash
# Install Ollama (https://ollama.com)
ollama pull qwen2.5:7b   # primary model
ollama pull qwen2.5:3b   # fallback for low-RAM machines
```

The backend automatically falls back: `qwen2.5:7b` → `qwen2.5:3b` → strict JSON fallback.

---

<div align="center">
  Built with ❤️ for <strong>SheLeads Hackathon 2026</strong> · Team Innocooks
</div>

