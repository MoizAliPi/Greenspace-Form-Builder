from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import Field

from app.schemas._base import InputModel, OutputModel


class AnswerSubmit(InputModel):
    field_id: uuid.UUID
    value: Any


class FormSubmit(InputModel):
    answers: list[AnswerSubmit] = Field(default_factory=list)


class ResponseRead(OutputModel):
    id: uuid.UUID
    form_id: uuid.UUID
    submitted_at: datetime


class AnswerRead(OutputModel):
    field_id: uuid.UUID
    field_label: str
    value: Any


class ResponseDetail(OutputModel):
    id: uuid.UUID
    submitted_at: datetime
    answers: list[AnswerRead]


class ResponsesRead(OutputModel):
    form_id: uuid.UUID
    total: int
    responses: list[ResponseDetail]


class PaginationParams(InputModel):
    """Query params for `GET /forms/{id}/responses`."""

    limit: int = Field(default=50, ge=1, le=200)
    offset: int = Field(default=0, ge=0)
