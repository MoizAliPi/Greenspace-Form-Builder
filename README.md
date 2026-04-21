# Form Builder

A Typeform-style form builder with a **Next.js** frontend and a **FastAPI** backend. The default stack for local development uses **SQLite** on disk and **JWT-based auth** issued by the API (no external database or auth provider required for reviewers).

## Why This Stack

FastAPI gives us async-first Python, auto-generated Swagger docs, and Pydantic schemas that become the single source of truth for wire types. Next.js App Router lets us keep the builder and dashboard as client-heavy pages while serving the public form as a server component. JSON columns keep field config flexible without a migration for every new field type.

## Features

- [ ] Form builder with drag-and-drop field reordering
- [ ] Field types: short text, long text, email, phone number, checkbox, yes/no, address, date of birth
- [ ] Authenticated creators (email + password via API JWT)
- [ ] Public form view for respondents
- [ ] Response collection and paginated dashboard
- [ ] Auto-generated API docs at `/docs`

## Data Model

| Table       | Purpose                                              |
| ----------- | ---------------------------------------------------- |
| `users`     | Creators — email + password hash                     |
| `forms`     | Form metadata — title, slug, status, `owner_id` → users |
| `fields`    | Ordered fields with JSON `config` per type         |
| `responses` | One row per submission, JSON `answers`             |

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 20+

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # optional: set JWT_SECRET for non-local sharing
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

By default the API uses `DATABASE_URL=sqlite+aiosqlite:///./formbuilder.db` (file created next to the working directory). Auth endpoints:

- `POST /api/v1/auth/register` — create account, returns JWT
- `POST /api/v1/auth/login` — returns JWT
- `GET /api/v1/auth/me` — `Authorization: Bearer <token>`

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # optional; defaults match local API
npm run dev
```

App: http://localhost:3000

### Run Tests

```bash
cd backend
pytest tests/ -v
```

## Project Structure

```
form-builder/
├── backend/               # FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── core/          # config, security, auth deps, errors
│   │   ├── db/            # engine, session, Base
│   │   ├── models/        # SQLAlchemy ORM models
│   │   ├── schemas/       # Pydantic request/response schemas
│   │   ├── repositories/  # async DB queries
│   │   ├── services/      # business logic
│   │   └── routers/       # HTTP route handlers
│   ├── alembic/           # migrations
│   └── tests/
└── frontend/              # Next.js App Router
    ├── app/               # pages and layouts
    ├── components/        # UI components
    ├── hooks/             # TanStack Query hooks
    ├── lib/               # API client, utils, env
    └── types/             # shared TypeScript types
```

## Environment Variables

```bash
# backend/.env
DATABASE_URL=sqlite+aiosqlite:///./formbuilder.db
CORS_ORIGINS=["http://localhost:3000"]
JWT_SECRET=replace-with-a-long-random-secret-at-least-32-chars

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

The default `JWT_SECRET` in `app/core/config.py` is for local development only; set a strong secret when deploying or sharing an environment.
