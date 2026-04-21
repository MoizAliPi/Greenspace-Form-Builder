from __future__ import annotations

import uuid

from pydantic import TypeAdapter

from app.models.field import Field as FieldModel
from app.models.form import Form as FormModel
from app.schemas.field import FieldCreate, FieldRead, FieldType
from app.schemas.form import FormRead, FormStatus, FormSummary


def field_create_to_model(form_id: uuid.UUID, fc: FieldCreate) -> FieldModel:
    data = fc.model_dump(mode="python")
    raw_id = data.get("id")
    if raw_id is None:
        field_id = uuid.uuid4()
    elif isinstance(raw_id, uuid.UUID):
        field_id = raw_id
    else:
        field_id = uuid.UUID(str(raw_id))
    t = data["type"]
    if isinstance(t, FieldType):
        t = t.value
    return FieldModel(
        id=field_id,
        form_id=form_id,
        type=str(t),
        label=data["label"],
        required=data["required"],
        order=data["order"],
        config=data["config"],
    )


def field_model_to_read(field: FieldModel) -> FieldRead:
    payload = {
        "id": field.id,
        "form_id": field.form_id,
        "type": field.type,
        "label": field.label,
        "required": field.required,
        "order": field.order,
        "config": field.config,
        "created_at": field.created_at,
    }
    return TypeAdapter(FieldRead).validate_python(payload)


def form_model_to_summary(form: FormModel) -> FormSummary:
    return FormSummary(
        id=form.id,
        owner_id=form.owner_id,
        title=form.title,
        slug=form.slug,
        status=FormStatus(form.status),
        created_at=form.created_at,
        updated_at=form.updated_at,
    )


def form_model_to_read(form: FormModel) -> FormRead:
    fields_read = [field_model_to_read(f) for f in form.fields]
    return FormRead(
        id=form.id,
        owner_id=form.owner_id,
        title=form.title,
        slug=form.slug,
        status=FormStatus(form.status),
        created_at=form.created_at,
        updated_at=form.updated_at,
        fields=fields_read,
    )
