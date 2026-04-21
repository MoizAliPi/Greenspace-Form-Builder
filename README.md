# Greenspace Form Builder

A Typeform-style form builder with a Next.js frontend and a FastAPI backend. Local development uses SQLite and JWT auth from the API.

## Prerequisites

- Python 3.12+
- Node.js 20+

## Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate 
pip install -e ".[dev]"
cp .env.example .env
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

API: http://localhost:8000 · OpenAPI: http://localhost:8000/docs

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: http://localhost:3000

## Tests

```bash
cd backend && pytest
```

## Project structure

```
Greenspace-Challenge/
├── backend/
│   ├── alembic/           # migrations
│   ├── app/
│   │   ├── core/          # config, security, errors
│   │   ├── db/            # engine, session
│   │   ├── models/        # SQLAlchemy models
│   │   ├── repositories/  # data access
│   │   ├── routers/       # FastAPI routes
│   │   ├── schemas/       # Pydantic API types
│   │   └── services/      # business logic
│   └── tests/
└── frontend/
    ├── app/               # App Router pages & layouts
    ├── components/        # UI (builder, public form, auth, …)
    ├── lib/               # API client, auth, env, utils
    └── types/             # TypeScript types
```

## Environment

Settings load from **`backend/.env`** (see `backend/.env.example`). Pydantic reads these at startup; they are used in code:

| Variable | Used for |
| -------- | -------- |
| `DATABASE_URL` | SQLAlchemy engine and Alembic (`app/db/session.py`, `alembic/env.py`) |
| `CORS_ORIGINS` | Browser CORS allowlist (`app/main.py`) |
| `JWT_SECRET` | Signing and verifying access tokens (`app/core/security.py`) |

Defaults exist in `app/core/config.py` for local dev (including `DATABASE_URL` and `JWT_SECRET`), so a missing `.env` still runs.


## Working Demo

https://www.loom.com/share/07516bd8387a4cb3a1994c137585a8ad





