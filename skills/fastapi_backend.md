# FastAPI Backend Principles

## Core Rules
- All endpoints must be `async`.
- Use Pydantic for request and response validation.
- API routes must not contain business logic.
- Business logic must live in service layers.
- Use routers grouped by domain.

## Architecture
- `api` -> request handling
- `services` -> business logic
- `models` -> schemas

## Response Design
- Endpoints must return structured JSON responses.
