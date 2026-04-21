from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from pydantic import EmailStr, TypeAdapter
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import NotFoundError, ValidationError
from app.models.field import Field as FieldModel
from app.models.response import Response
from app.repositories import forms as forms_repo
from app.repositories import responses as responses_repo
from app.schemas.field import FieldType
from app.schemas.form import FormStatus
from app.schemas.response import FormSubmit, ResponseRead


def _validate_dd_mm_yyyy(value: str) -> None:
    """Raise ValidationError unless `value` matches the required DD-MM-YYYY wire format.

    `strptime` implicitly rejects impossible calendar dates like "31-02-2024".
    """
    try:
        datetime.strptime(value, "%d-%m-%Y")
    except (TypeError, ValueError) as e:
        raise ValidationError("Invalid date (expected DD-MM-YYYY)") from e


def _validate_answer(field: FieldModel, value: Any) -> None:
    """Server-side type/format check for one answer.

    Mirrors the client-side rules in `frontend/lib/public-form/validate.ts`; the server stays
    the source of truth because the client validator is only for UX. Address values are
    accepted as any dict here — nested required-subfield rules are enforced by
    `frontend` config and revalidated when we later add structured address schemas.
    """
    ft = field.type
    if ft == FieldType.SHORT_TEXT.value or ft == FieldType.LONG_TEXT.value:
        if not isinstance(value, str):
            raise ValidationError(f"Field {field.label!r} must be a string")
        return
    if ft == FieldType.EMAIL.value:
        if not isinstance(value, str):
            raise ValidationError(f"Field {field.label!r} must be a string")
        try:
            TypeAdapter(EmailStr).validate_python(value)
        except Exception as e:
            raise ValidationError(f"Field {field.label!r} must be a valid email") from e
        return
    if ft == FieldType.PHONE_NUMBER.value:
        if not isinstance(value, str) or not value.strip():
            raise ValidationError(f"Field {field.label!r} must be a non-empty string")
        return
    if ft == FieldType.CHECKBOX.value:
        if not isinstance(value, bool):
            raise ValidationError(f"Field {field.label!r} must be a boolean")
        return
    if ft == FieldType.YES_NO.value:
        if value not in ("yes", "no"):
            raise ValidationError(f"Field {field.label!r} must be yes or no")
        return
    if ft == FieldType.ADDRESS.value:
        if not isinstance(value, dict):
            raise ValidationError(f"Field {field.label!r} must be an object")
        return
    if ft == FieldType.DATE_OF_BIRTH.value:
        if not isinstance(value, str):
            raise ValidationError(f"Field {field.label!r} must be a string (DD-MM-YYYY)")
        _validate_dd_mm_yyyy(value)
        return

    raise ValidationError(f"Unsupported field type: {ft!r}")


async def submit_response(
    session: AsyncSession,
    form_id: uuid.UUID,
    body: FormSubmit,
) -> ResponseRead:
    """Persist a public submission against the current field definition of a published form.

    Enforces, in order: form exists, form is published, no duplicate `field_id` in the payload,
    every submitted id belongs to the form, every `required` field has a value, and each value
    passes `_validate_answer`. Answers are stored as a JSON list of `{field_id, value}` so the
    form can be renamed or have fields deleted/reordered without losing historical submissions.
    """
    form = await forms_repo.get_by_id_with_fields(session, form_id)
    if form is None:
        raise NotFoundError("Form not found")
    if form.status != FormStatus.PUBLISHED.value:
        raise ValidationError("Form is not accepting responses")

    fields_by_id: dict[uuid.UUID, FieldModel] = {f.id: f for f in form.fields}
    submitted: dict[uuid.UUID, Any] = {}
    seen: set[uuid.UUID] = set()
    for ans in body.answers:
        if ans.field_id in seen:
            raise ValidationError("Duplicate field id in submission")
        seen.add(ans.field_id)
        if ans.field_id not in fields_by_id:
            raise ValidationError("Unknown field id in submission")
        submitted[ans.field_id] = ans.value

    for field in form.fields:
        if field.required and field.id not in submitted:
            raise ValidationError(f"Missing required field: {field.label}")

    for fid, value in submitted.items():
        _validate_answer(fields_by_id[fid], value)

    stored = [{"field_id": str(fid), "value": val} for fid, val in submitted.items()]
    row = Response(form_id=form_id, answers=stored)
    await responses_repo.add(session, row)
    await session.commit()

    return ResponseRead(id=row.id, form_id=form_id, submitted_at=row.submitted_at)
