---
name: data-model-typing
description: Best practices for designing the data model and keeping strict typing across the stack — Pydantic v2 schemas in the FastAPI backend and matching TypeScript types in the Next.js frontend. Covers entity vs DTO separation, discriminated unions for polymorphic fields, Python typing discipline (Annotated, Literal, StrEnum, NewType), validation strategy, nullability, datetime/UUID/Decimal handling, and how to keep the Python and TypeScript contracts in sync. Use when adding or changing a shared type (form, field, response, user, etc.), designing a request/response schema, deciding where to validate a rule, or reviewing data-model changes.
---

# Data Model and Typing (Pydantic v2 + TypeScript)

Rules for shared types in this repo. The backend is the source of truth; the frontend mirrors it. Apply when touching anything in `backend/app/schemas/`, `backend/app/models/`, or `frontend/types/`.

## Core principles

1. **One concept, three types.** Separate the **entity** (DB row), the **wire schema** (Pydantic for API), and the **client type** (TypeScript). They look similar but evolve differently.
2. **Backend is the contract.** TS types mirror Pydantic — never the other way around. Ideally generate them from the OpenAPI schema; if hand-written, keep the mirror in one file and keep field names identical.
3. **Make illegal states unrepresentable.** Use `Literal`, `StrEnum`, discriminated unions, and `NonNegativeInt` / `EmailStr` instead of validating after the fact.
4. **Validate at the boundary, trust inside.** Every byte entering the system passes through a Pydantic schema with `extra="forbid"` on inputs. Internal functions take parsed domain objects, not `dict`.
5. **Nullable means "absent from the source."** If a field is optional only during create, model that with a separate `*Create` schema — don't pollute the read type with `| None`.

---

## Three-layer model (example: Form)

```
DB row (SQLAlchemy)        →   API wire (Pydantic)         →   Client (TypeScript)
backend/app/models/form.py      backend/app/schemas/form.py      frontend/types/form.ts

class Form(Base): ...           class FormRead(BaseModel): ...   export type Form = { ... }
                                class FormCreate(BaseModel)      export type FormCreate = { ... }
                                class FormUpdate(BaseModel)      export type FormUpdate = { ... }
```

Never import ORM models in routers or clients. Never return an ORM model from an endpoint without going through a Pydantic `*Read` schema.

---

## Pydantic v2 conventions

### Base classes by purpose

```python
# app/schemas/_base.py
from pydantic import BaseModel, ConfigDict


class InputModel(BaseModel):
    """Request bodies. Reject unknown fields to catch typos and drift."""
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OutputModel(BaseModel):
    """Response bodies. Serialize from ORM instances."""
    model_config = ConfigDict(from_attributes=True, extra="ignore")
```

All `*Create` / `*Update` schemas extend `InputModel`. All `*Read` schemas extend `OutputModel`.

### Field constraints via `Annotated`

Prefer `Annotated[T, Field(...)]` over inline `Field(...)` defaults — it keeps the type readable and reusable:

```python
from typing import Annotated
from pydantic import Field

Title = Annotated[str, Field(min_length=1, max_length=200)]
Slug = Annotated[str, Field(pattern=r"^[a-z0-9-]{1,64}$")]


class FormCreate(InputModel):
    title: Title
    slug: Slug | None = None
```

Common reusable aliases live in `app/schemas/_fields.py`.

### Enums as string literals

Use `StrEnum` for values stored in the DB; it serializes to its string and compares naturally:

```python
from enum import StrEnum


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"
```

Use `Literal["a", "b"]` only for transient discriminators (e.g. the `type` field inside a discriminated union — see below). Never stringly-type status values.

### Discriminated unions for polymorphic records

Form fields have type-specific `config`. Model each variant as its own schema with a `type` literal, then union them with a discriminator — Pydantic picks the right class automatically:

```python
from typing import Annotated, Literal
from pydantic import BaseModel, Field


class TextFieldConfig(BaseModel):
    type: Literal["text"] = "text"
    placeholder: str | None = None
    max_length: int | None = Field(default=None, ge=1, le=10_000)


class SelectFieldConfig(BaseModel):
    type: Literal["select"] = "select"
    options: list[str] = Field(min_length=1)
    multiple: bool = False


FieldConfig = Annotated[
    TextFieldConfig | SelectFieldConfig,
    Field(discriminator="type"),
]


class FieldCreate(InputModel):
    label: Annotated[str, Field(min_length=1, max_length=200)]
    required: bool = False
    config: FieldConfig
```

**Why:** every variant has its own constraints; invalid combinations (e.g. `options` on a text field) can't be expressed at all.

### Validation strategy — where rules live

| Kind of rule | Put it in |
|---|---|
| Shape and simple bounds (length, regex, range, enum) | Pydantic field constraint |
| Cross-field rules inside one schema (e.g. `end >= start`) | `@model_validator(mode="after")` |
| Rules that need the DB or other entities | **Service layer**, not Pydantic |

Never do I/O inside a validator. Validators must be pure and cheap.

### Datetime, UUID, Decimal

- **Datetimes:** always timezone-aware UTC. Type them as `datetime` and rely on Pydantic's ISO 8601 parsing; reject naive times at the boundary:
  ```python
  from datetime import datetime
  from pydantic import AwareDatetime
  created_at: AwareDatetime
  ```
- **Identifiers:** `uuid.UUID` in Python, `string` in TS (UUIDs are strings over the wire).
- **Money / precise decimals:** `Decimal` with explicit precision/scale in the DB; serialize as `string` on the wire to avoid JS float loss. Mirror as `string` in TS, parse with a library on the client only when you need arithmetic.

### Nullability vs optional

- Use `T | None` only for values that can legitimately be **null** at rest.
- Use a separate `*Create` schema (without the field) when a value is **absent on create but required after**. Don't make the read model nullable to accommodate creates.
- Use `Field(default=...)` explicitly — no bare `= None` without a comment on why.

### Model updates: partial and idempotent

Two patterns, pick per endpoint:

- **Partial update (PATCH semantics):** all fields optional, skip unset on write.
  ```python
  from pydantic import model_serializer
  class FormUpdate(InputModel):
      title: Title | None = None
      status: FormStatus | None = None

      def apply(self, form) -> None:
          data = self.model_dump(exclude_unset=True)
          for k, v in data.items():
              setattr(form, k, v)
  ```
- **Full replace (PUT semantics):** every field required; the service replaces the whole row. Prefer this for builder saves that send the full form.

### Examples in the OpenAPI schema

Add `json_schema_extra` examples to important schemas — they show up in `/docs` and help FE authors:

```python
class FormCreate(InputModel):
    title: Title
    model_config = {
        **InputModel.model_config,
        "json_schema_extra": {"examples": [{"title": "Contact form"}]},
    }
```

---

## Python typing discipline

- `from __future__ import annotations` at the top of every app module.
- Enable in `pyproject.toml`: `ruff` with `PEP8` + `pyflakes` + `B` + `UP` + `I`; plus `mypy` or `pyright` set to strict for `app/`.
- Prefer modern syntax: `list[int]`, `dict[str, int]`, `str | None`.
- `NewType` for ids that must not mix: `UserId = NewType("UserId", uuid.UUID)` so you can't pass a `FormId` where a `UserId` is expected.
- Avoid `Any`. If you truly need it, use `object` and narrow with `isinstance`, or `cast` with a comment.
- Return types are **required** on every exported function. Don't rely on inference across module boundaries.
- Use `TYPE_CHECKING` to break import cycles for type-only imports.

---

## TypeScript mirror (frontend/)

### Source-of-truth strategy

Pick one and stick with it — this repo uses (A) initially, upgrade to (B) once the API stabilizes:

**A. Hand-mirrored (MVP):** keep a single `frontend/types/api.ts` that mirrors Pydantic schemas one-to-one. Same names, same casing. Review diffs against backend PRs.

**B. Generated from OpenAPI (recommended once stable):**

```bash
pnpm add -D openapi-typescript
pnpm exec openapi-typescript http://localhost:8000/openapi.json -o frontend/types/api.gen.ts
```

Commit the generated file; regenerate in CI and fail if the diff is non-empty.

### Type conventions

- `strict: true` and `noUncheckedIndexedAccess: true` in `tsconfig.json`.
- Prefer `type` aliases for object shapes; use `interface` only when extending.
- Mirror `StrEnum` as a string literal union — not a TS `enum` (which produces a runtime object and bloats bundles):
  ```ts
  export type FormStatus = "draft" | "published";
  ```
- Mirror discriminated unions exactly — TS narrows on the discriminator just like Pydantic:
  ```ts
  export type TextFieldConfig = { type: "text"; placeholder?: string; maxLength?: number };
  export type SelectFieldConfig = { type: "select"; options: string[]; multiple: boolean };
  export type FieldConfig = TextFieldConfig | SelectFieldConfig;
  ```
- UUIDs and datetimes are `string` on the wire. Convert at the UI edge only if needed (`new Date(iso)` inside a formatter), and **don't** store `Date` in client state unless you also strip it before serializing.
- Use **branded types** to prevent id mix-ups in TS, mirroring Python `NewType`:
  ```ts
  export type FormId = string & { readonly __brand: "FormId" };
  ```
- Runtime validation at the network edge is optional but cheap — use `zod` schemas for request bodies (especially Server Actions) and for parsing untrusted responses if you don't generate from OpenAPI.

### Casing

Match the wire exactly. Python uses `snake_case` — so does the TS type. Do not translate to `camelCase` at the type layer; if the frontend prefers camel, transform at a single client boundary and expose the camel shape as a **separate** type with a clear name (`FormView` vs `FormDTO`). Mixing conventions in one type is the fastest way to drift.

---

## Worked example (Form, end-to-end)

**Pydantic (backend):**
```python
# app/schemas/form.py
import uuid
from datetime import datetime
from pydantic import AwareDatetime

from app.schemas._base import InputModel, OutputModel
from app.schemas._fields import Title
from app.schemas.field import FieldRead


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class FormCreate(InputModel):
    title: Title


class FormRead(OutputModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: Title
    status: FormStatus
    created_at: AwareDatetime
    fields: list[FieldRead]
```

**TypeScript mirror:**
```ts
// frontend/types/api.ts
import type { FieldRead } from "./field";

export type FormStatus = "draft" | "published";

export type FormCreate = { title: string };

export type FormRead = {
  id: string;
  owner_id: string;
  title: string;
  status: FormStatus;
  created_at: string;
  fields: FieldRead[];
};
```

---

## Evolving the data model (scalable habits)

- **Additive changes first.** Add new optional fields before requiring them. Backfill, then tighten. The API response is a contract with every deployed client.
- **Never reuse a field name for a new meaning.** Add a new one and deprecate the old for one release.
- **Migrations match schemas.** Every Pydantic change that affects persistence has a paired Alembic migration. Review both in the same PR.
- **JSONB is for truly variable data.** If you find yourself indexing into `config` for queries, it probably deserves promotion to a column.
- **Version at the route, not in the type.** If a breaking change is unavoidable, add `/v2/forms` rather than `FormV2` inside the same module — keeps types clean.

---

## Anti-patterns to avoid

- Reusing a read schema for input (`FormRead` as `FormCreate`). They diverge; separate them on day one.
- `dict[str, Any]` as a field type. Model the shape, even if only two variants exist today.
- TS `enum` for string values — use literal unions.
- `Optional[T]` in outputs when the value is actually always present in the DB. The `| None` will leak into every consumer.
- Stringly-typed status/kind fields (raw `str` with comments). Use `StrEnum` + `Literal`.
- Validating business rules inside Pydantic validators with DB calls. Move to the service.
- Hand-writing a TS enum that mirrors a Python `StrEnum` by value — drift is inevitable. Use literal unions generated or mirrored once.
- Naming inputs and outputs identically (`Form` for both). Always suffix: `FormCreate`, `FormUpdate`, `FormRead`.

---

## Pre-merge checklist

- [ ] Input schemas extend `InputModel` (`extra="forbid"`); output schemas extend `OutputModel` (`from_attributes=True`)
- [ ] Each entity has distinct `*Create`, `*Update` (if mutable), and `*Read` schemas
- [ ] Polymorphic fields use discriminated unions, not `dict[str, Any]`
- [ ] Datetimes are timezone-aware; UUIDs typed as `uuid.UUID`; money as `Decimal`
- [ ] Enums are `StrEnum` (Python) and literal unions (TS)
- [ ] TS mirror updated in the same PR and names match exactly
- [ ] Alembic migration added if persistence changed
- [ ] `ruff` / `mypy` (or `pyright`) and `tsc --noEmit` pass
