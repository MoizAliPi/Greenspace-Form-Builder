# Form Builder

A Typeform-style form builder with a **Next.js** frontend and a **FastAPI** backend, backed by **Supabase Postgres**.

## Why This Stack

FastAPI gives us async-first Python, auto-generated Swagger docs, and Pydantic schemas that become the single source of truth for wire types. Next.js App Router lets us keep the builder and dashboard as client-heavy pages while serving the public form as a server component. JSONB in Postgres keeps field config flexible without a migration for every new field type.

## Features

- [ ] Form builder with drag-and-drop field reordering
- [ ] Field types: short text, long text, email, phone number, checkbox, yes/no, address, date of birth
- [ ] Authenticated creators (Supabase email + password)
- [ ] Public form view for respondents
- [ ] Response collection and paginated dashboard
- [ ] Auto-generated API docs at `/docs`

## Data Model

| Table | Purpose |
|---|---|
| `forms` | Form metadata — title, slug, status, owner |
| `fields` | Ordered fields with JSONB config per type |
| `responses` | One row per submission, JSONB answers |

## Local Setup

### Prerequisites

- Python 3.12+
- Node.js 20+
- PostgreSQL (or Supabase project)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env   # fill in DATABASE_URL and SUPABASE_JWT_SECRET
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Frontend

```bash
cd frontend
npm install
cp .env.local.example .env.local   # fill in Supabase keys
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
│   │   ├── core/          # config, auth, errors
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
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/formbuilder
CORS_ORIGINS=["http://localhost:3000"]
SUPABASE_JWT_SECRET=your-supabase-jwt-secret

# frontend/.env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```
