from __future__ import annotations

from uuid import uuid4

from pydantic import TypeAdapter

from app.schemas.field import FieldCreate, FieldRead, FieldType, ShortTextFieldCreate
from app.schemas.form import FormRead, FormStatus


def test_field_create_discriminated_union() -> None:
    raw = {
        "type": "short_text",
        "label": "Name",
        "required": True,
        "order": 0,
        "config": {"placeholder": "Your name", "max_length": 100},
    }
    parsed = TypeAdapter(FieldCreate).validate_python(raw)
    assert isinstance(parsed, ShortTextFieldCreate)
    assert parsed.type is FieldType.SHORT_TEXT


def test_form_read_nested_field_union() -> None:
    fid = uuid4()
    oid = uuid4()
    kid = uuid4()
    payload = {
        "id": str(fid),
        "owner_id": str(oid),
        "title": "Contact",
        "slug": "contact",
        "status": "draft",
        "created_at": "2026-01-01T00:00:00Z",
        "updated_at": "2026-01-01T00:00:00Z",
        "fields": [
            {
                "id": str(kid),
                "form_id": str(fid),
                "type": "short_text",
                "label": "Name",
                "required": True,
                "order": 0,
                "config": {},
                "created_at": "2026-01-01T00:00:00Z",
            }
        ],
    }
    form = FormRead.model_validate(payload)
    assert form.status is FormStatus.DRAFT
    assert len(form.fields) == 1
    TypeAdapter(FieldRead).validate_python(form.fields[0].model_dump())
