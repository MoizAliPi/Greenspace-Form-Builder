from __future__ import annotations

import uuid
from datetime import datetime
from enum import StrEnum

from pydantic import Field

from app.schemas._base import InputModel, OutputModel
from app.schemas._fields import Slug, Title
from app.schemas.field import FieldCreate, FieldRead


class FormStatus(StrEnum):
    DRAFT = "draft"
    PUBLISHED = "published"


class FormCreate(InputModel):
    title: Title = "Untitled Form"
    slug: Slug | None = None


class FormUpdate(InputModel):
    """Partial update — send only fields to change (service applies `exclude_unset`)."""

    title: Title | None = None
    slug: Slug | None = None
    status: FormStatus | None = None
    fields: list[FieldCreate] | None = None


class FormRead(OutputModel):
    id: uuid.UUID
    owner_id: uuid.UUID
    title: Title
    slug: Slug
    status: FormStatus
    created_at: datetime
    updated_at: datetime
    fields: list[FieldRead] = Field(default_factory=list)


class FormSummary(OutputModel):
    """Form metadata without fields — for dashboard / picker lists."""

    id: uuid.UUID
    owner_id: uuid.UUID
    title: Title
    slug: Slug
    status: FormStatus
    created_at: datetime
    updated_at: datetime


class FormsListRead(OutputModel):
    items: list[FormSummary]
    total: int
