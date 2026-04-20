---
name: fastapi-best-practices
description: FastAPI conventions for this repo's async Python backend, covering project layout, layered routers/services/repositories, Pydantic v2 schemas, async SQLAlchemy 2.x, Alembic migrations, dependency injection, Supabase JWT auth, error handling, testing with pytest, logging, and performance. Use when creating, editing, or reviewing any code under backend/, adding endpoints, writing database queries or migrations, or designing auth and validation.
---

# FastAPI Best Practices (async, SQLAlchemy 2.x, Pydantic v2)

Conventions for the `backend/` FastAPI service. Apply when scaffolding the app, adding routes, writing queries, or reviewing PRs.

## Core principles

1. **Async end-to-end.** Every I/O path (DB, HTTP, auth) is `async`. Never call blocking I/O from a coroutine — offload with `run_in_executor` if unavoidable.
2. **Thin routers, fat services.** Routers handle HTTP concerns only (parsing, status codes, auth dependency). Business rules live in services; SQL lives in repositories.
3. **Pydantic is the contract.** Request/response schemas are the single source of truth for the wire format. Never return ORM models directly.
4. **Fail loud on config.** Validate env at import time (`pydantic-settings`). A missing secret must crash boot, not a request.
5. **Small, composable modules.** One concern per file. Extract a service when a router function exceeds ~30 lines or touches more than one repository.

---

## Project structure

```
backend/
  pyproject.toml
  alembic.ini
  alembic/
    versions/
    env.py
  app/
    main.py                 # FastAPI() instance, middleware, router mounting
    core/
      config.py             # Settings (pydantic-settings)
      auth.py               # Supabase JWT verify, get_current_user dep
      logging.py
      errors.py             # Exception classes + handlers
    db/
      base.py               # DeclarativeBase
      session.py            # async_engine, async_sessionmaker, get_session dep
    models/
      form.py
      field.py
      response.py
    schemas/
      form.py               # FormCreate, FormRead, FormUpdate
      field.py
      response.py
    repositories/
      forms.py
      fields.py
      responses.py
    services/
      forms.py              # publish workflow, owner checks
      submissions.py        # validate answers against current fields
    routers/
      forms.py
      responses.py
      health.py
    deps.py                 # shared FastAPI dependencies
  tests/
    conftest.py
    test_forms.py
```

**Rules:**
- Routers import **services**, never repositories directly.
- Services import **repositories**, never the session directly (repos own the session).
- Schemas live in `schemas/`; ORM models in `models/`. They are **different types** even if they look similar.

---

## Application bootstrap

```python
# app/main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.routers import forms, responses, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Form Builder API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
app.include_router(forms.router, prefix="/forms", tags=["forms"])
app.include_router(responses.router, prefix="/forms", tags=["responses"])
```

---

## Settings (pydantic-settings)

```python
# app/core/config.py
from functools import lru_cache
from pydantic import AnyUrl, Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str
    SUPABASE_JWT_SECRET: str
    CORS_ORIGINS: list[str] = Field(default_factory=list)
    LOG_LEVEL: str = "INFO"


@lru_cache
def get_settings() -> Settings:
    return Settings()  # pyright: ignore[reportCallIssue]


settings = get_settings()
```

Never call `os.getenv` outside `config.py`. Import `settings` everywhere else.

---

## Database: async SQLAlchemy 2.x

```python
# app/db/session.py
from collections.abc import AsyncIterator
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

engine = create_async_engine(settings.DATABASE_URL, pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session() -> AsyncIterator[AsyncSession]:
    async with SessionLocal() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
```

**Conventions:**
- Use `DeclarativeBase` + typed `Mapped[...]` columns (SQLAlchemy 2.0 style).
- UUID primary keys (`uuid.UUID`), `TIMESTAMP WITH TIME ZONE` for timestamps, `server_default=func.now()`.
- Commit at the **service** layer, not the repository. Repositories flush/refresh if they need the generated id.
- Always `.options(selectinload(...))` to avoid N+1 when returning collections.

### Model example

```python
# app/models/form.py
import uuid
from datetime import datetime
from sqlalchemy import String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Form(Base):
    __tablename__ = "forms"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[str] = mapped_column(String(16), default="draft", nullable=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now(), nullable=False)

    fields: Mapped[list["Field"]] = relationship(back_populates="form", cascade="all, delete-orphan", order_by="Field.order")
```

---

## Pydantic v2 schemas

```python
# app/schemas/form.py
import uuid
from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class FormBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)


class FormCreate(FormBase):
    pass


class FormRead(FormBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    owner_id: uuid.UUID
    status: str
    created_at: datetime
```

**Rules:**
- Separate `*Create`, `*Update`, `*Read` schemas. Never reuse a read model for input.
- `ConfigDict(from_attributes=True)` on read models so services can return ORM objects and FastAPI serializes via the schema.
- Validate business invariants in schemas when cheap (lengths, enums); defer cross-field rules to services.

---

## Repository pattern

```python
# app/repositories/forms.py
import uuid
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.form import Form


class FormsRepo:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, form_id: uuid.UUID) -> Form | None:
        stmt = select(Form).options(selectinload(Form.fields)).where(Form.id == form_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def add(self, form: Form) -> Form:
        self.session.add(form)
        await self.session.flush()
        return form
```

Repositories never call `commit`. They return ORM instances; services decide when to commit.

---

## Service pattern

```python
# app/services/forms.py
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFound, Forbidden
from app.models.form import Form
from app.repositories.forms import FormsRepo
from app.schemas.form import FormCreate


class FormsService:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.repo = FormsRepo(session)

    async def create(self, owner_id: uuid.UUID, payload: FormCreate) -> Form:
        form = Form(owner_id=owner_id, title=payload.title)
        await self.repo.add(form)
        await self.session.commit()
        return form

    async def get_for_owner(self, form_id: uuid.UUID, owner_id: uuid.UUID) -> Form:
        form = await self.repo.get(form_id)
        if form is None:
            raise NotFound("form")
        if form.owner_id != owner_id:
            raise Forbidden()
        return form
```

---

## Routers: thin, typed, documented

```python
# app/routers/forms.py
import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import CurrentUser, get_current_user
from app.db.session import get_session
from app.schemas.form import FormCreate, FormRead
from app.services.forms import FormsService


router = APIRouter()


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED)
async def create_form(
    payload: FormCreate,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FormRead:
    form = await FormsService(session).create(user.id, payload)
    return FormRead.model_validate(form)


@router.get("/{form_id}", response_model=FormRead)
async def get_form(
    form_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> FormRead:
    form = await FormsService(session).get_for_owner(form_id, user.id)
    return FormRead.model_validate(form)
```

**Rules:**
- Always annotate the return type and set `response_model` for schema validation on the way out.
- Pass `status_code` explicitly for non-200 successes (`201`, `204`).
- Use typed path params (`uuid.UUID`, `int`) — FastAPI validates automatically.

---

## Auth: Supabase JWT verification

```python
# app/core/auth.py
from dataclasses import dataclass
import uuid

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings

bearer = HTTPBearer(auto_error=False)


@dataclass
class CurrentUser:
    id: uuid.UUID
    email: str | None


async def get_current_user(
    creds: HTTPAuthorizationCredentials | None = Depends(bearer),
) -> CurrentUser:
    if creds is None:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "missing bearer token")
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.PyJWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "invalid token") from e
    return CurrentUser(id=uuid.UUID(payload["sub"]), email=payload.get("email"))
```

For **public endpoints** (e.g. `POST /forms/{id}/submit`), simply don't depend on `get_current_user`. For **optional auth** (public GET that behaves differently for owners), write a sibling `get_optional_user` that returns `None` on missing/invalid tokens.

---

## Error handling

```python
# app/core/errors.py
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


class AppError(Exception):
    status_code = 400
    code = "bad_request"


class NotFound(AppError):
    status_code = 404
    code = "not_found"


class Forbidden(AppError):
    status_code = 403
    code = "forbidden"


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError) -> JSONResponse:
        return JSONResponse({"error": {"code": exc.code, "message": str(exc) or exc.code}}, status_code=exc.status_code)
```

**Rules:**
- Services raise domain exceptions (`NotFound`, `Forbidden`) — never `HTTPException` (keeps services framework-agnostic and testable).
- Routers may raise `HTTPException` for HTTP-only concerns (missing headers, rate limits).
- All error responses share a single JSON shape.

---

## Migrations (Alembic)

- `alembic/env.py` imports `Base.metadata` from `app/db/base.py` so autogenerate sees all models.
- One migration per PR; **review generated SQL** — autogenerate misses enum changes and check constraints.
- Prefer **expand/contract** for schema changes on production: add columns nullable, backfill, then enforce.
- Never edit an applied migration; create a new one.

Commands:
```bash
alembic revision --autogenerate -m "add forms.owner_id"
alembic upgrade head
alembic downgrade -1   # only in dev
```

---

## Testing

```python
# tests/conftest.py
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
```

**Rules:**
- Use `pytest-asyncio` with `asyncio_mode = "auto"`.
- Test against a real Postgres (testcontainers or a dedicated test DB) — SQLite lies about dialect behavior.
- Override `get_session` and `get_current_user` with `app.dependency_overrides` in fixtures, not monkeypatching.
- One test per behavior; arrange-act-assert. Avoid shared mutable fixtures.

---

## Logging

- Use `logging.getLogger(__name__)`; configure once in `core/logging.py` (JSON in prod, plain in dev).
- Log at boundaries: inbound request (access log middleware), outbound HTTP/DB errors, auth failures.
- Never log tokens, passwords, or full request bodies for auth endpoints.

---

## Performance

- **Pooling:** tune `pool_size` / `max_overflow` for your deployment; use PgBouncer for serverless.
- **N+1:** always `selectinload` or `joinedload` relationships you access in serialization.
- **Pagination:** cursor or keyset for large lists (`ORDER BY created_at DESC, id DESC` + `WHERE (created_at, id) < (:c, :i)`). Avoid `OFFSET` on deep pages.
- **Backgrounding:** use `BackgroundTasks` for fire-and-forget side effects; reach for a real queue (Arq, Celery, Dramatiq) when retries or ordering matter.
- **Indexes:** every foreign key and every column used in `WHERE` / `ORDER BY` on hot paths.

---

## Security

- CORS: explicit origin list from settings, never `"*"` with credentials.
- Rate limit public endpoints (`slowapi` or a reverse proxy) — especially `POST /.../submit` and auth-adjacent routes.
- Validate all input via Pydantic; reject unknown fields (`model_config = ConfigDict(extra="forbid")`) on `*Create` / `*Update` schemas.
- Never interpolate user input into SQL — always bind parameters via SQLAlchemy.
- Return generic 401/403 messages; don't leak whether a resource exists.

---

## Anti-patterns to avoid

- Returning ORM models from routers (serialize through Pydantic schemas).
- Sync DB calls (`Session`, `requests`) anywhere in the async app.
- Business logic in routers or Pydantic validators.
- `commit()` in repositories.
- Catching `Exception` broadly — let the global handler deal with it.
- Hardcoded strings for status enums — use `StrEnum` and reference it everywhere.
- `print()` for diagnostics — use the logger.

---

## Pre-merge checklist

- [ ] Router is thin; logic is in a service
- [ ] Request and response have distinct Pydantic schemas with `extra="forbid"` on inputs
- [ ] All I/O is `async`
- [ ] Relationships used in the response are eager-loaded (no N+1)
- [ ] New endpoints have auth dependency (or are explicitly public)
- [ ] Errors raised are `AppError` subclasses, not ad-hoc `HTTPException`
- [ ] Alembic migration generated and reviewed
- [ ] Tests cover happy path + one failure (auth, validation, or ownership)
- [ ] `ruff check` and `pytest` pass
