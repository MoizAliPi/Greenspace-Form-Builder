from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.models.form import Form
from app.models.user import User
from app.repositories import fields as fields_repo
from app.repositories import forms as forms_repo
from app.repositories import responses as responses_repo
from app.schemas.field import FieldCreate
from app.schemas.form import FormCreate, FormRead, FormsListRead, FormStatus, FormUpdate
from app.schemas.response import AnswerRead, FormSubmit, ResponseDetail, ResponseRead, ResponsesRead
from app.services import submissions_service
from app.services.mappers import field_create_to_model, form_model_to_read, form_model_to_summary
from app.utils.slug import generate_auto_slug, slugify_title


def _assert_unique_field_ids_when_present(field_creates: list[FieldCreate]) -> None:
    """Reject duplicate `id` values so we never hit DB UNIQUE on `fields.id`."""
    seen: set[uuid.UUID] = set()
    for fc in field_creates:
        data = fc.model_dump(mode="python")
        raw = data.get("id")
        if raw is None:
            continue
        fid = raw if isinstance(raw, uuid.UUID) else uuid.UUID(str(raw))
        if fid in seen:
            raise ValidationError(
                "Duplicate field id in fields array. Omit `id` for new fields, "
                "or use a unique id per field (do not reuse the OpenAPI example UUID).",
            )
        seen.add(fid)


async def create_form(session: AsyncSession, owner_id: uuid.UUID, body: FormCreate) -> FormRead:
    if body.slug is not None:
        slug = body.slug
        if await forms_repo.get_by_slug(session, slug):
            raise ValidationError("Slug already taken")
    else:
        base = slugify_title(body.title)
        slug = generate_auto_slug(base)
        while await forms_repo.get_by_slug(session, slug):
            slug = generate_auto_slug(base)

    form = Form(
        owner_id=owner_id,
        title=body.title,
        slug=slug,
        status=FormStatus.DRAFT.value,
    )
    await forms_repo.add(session, form)
    await session.commit()
    loaded = await forms_repo.get_by_id_with_fields(session, form.id)
    assert loaded is not None
    return form_model_to_read(loaded)


async def list_forms_for_owner(
    session: AsyncSession,
    owner: User,
    *,
    limit: int,
    offset: int,
) -> FormsListRead:
    total = await forms_repo.count_for_owner(session, owner.id)
    rows = await forms_repo.list_for_owner(
        session,
        owner.id,
        limit=limit,
        offset=offset,
    )
    return FormsListRead(
        items=[form_model_to_summary(f) for f in rows],
        total=total,
    )


async def get_form(session: AsyncSession, form_id: uuid.UUID, user: User | None) -> FormRead:
    form = await forms_repo.get_by_id_with_fields(session, form_id)
    if form is None:
        raise NotFoundError("Form not found")
    if form.status != FormStatus.PUBLISHED.value:
        if user is None or user.id != form.owner_id:
            raise NotFoundError("Form not found")
    return form_model_to_read(form)


async def update_form(
    session: AsyncSession,
    form_id: uuid.UUID,
    owner: User,
    body: FormUpdate,
) -> FormRead:
    form = await forms_repo.get_by_id_with_fields(session, form_id)
    if form is None:
        raise NotFoundError("Form not found")
    if form.owner_id != owner.id:
        raise ForbiddenError("Not allowed")

    patch = body.model_dump(exclude_unset=True)
    if "title" in patch and body.title is not None:
        form.title = body.title
    if "slug" in patch and body.slug is not None:
        other = await forms_repo.get_by_slug(session, body.slug)
        if other is not None and other.id != form.id:
            raise ValidationError("Slug already taken")
        form.slug = body.slug
    if "status" in patch and body.status is not None:
        form.status = body.status.value

    if "fields" in patch:
        field_creates = body.fields or []
        _assert_unique_field_ids_when_present(field_creates)
        await fields_repo.delete_for_form(session, form.id)
        for fc in field_creates:
            session.add(field_create_to_model(form.id, fc))

    form.updated_at = datetime.now(UTC)
    await session.commit()

    loaded = await forms_repo.get_by_id_with_fields(session, form_id)
    assert loaded is not None
    return form_model_to_read(loaded)


async def submit_form(
    session: AsyncSession,
    form_id: uuid.UUID,
    body: FormSubmit,
) -> ResponseRead:
    """Public submit endpoint — validation and persistence live in `submissions_service`."""
    return await submissions_service.submit_response(session, form_id, body)


async def list_form_responses(
    session: AsyncSession,
    form_id: uuid.UUID,
    owner: User,
    *,
    limit: int,
    offset: int,
) -> ResponsesRead:
    form = await forms_repo.get_by_id_with_fields(session, form_id)
    if form is None:
        raise NotFoundError("Form not found")
    if form.owner_id != owner.id:
        raise ForbiddenError("Not allowed")

    total = await responses_repo.count_for_form(session, form_id)
    rows = await responses_repo.list_for_form(session, form_id, limit=limit, offset=offset)
    labels = {f.id: f.label for f in form.fields}

    details: list[ResponseDetail] = []
    for row in rows:
        answers_read: list[AnswerRead] = []
        for item in row.answers:
            fid_raw = item.get("field_id")
            if fid_raw is None:
                continue
            fid = uuid.UUID(str(fid_raw))
            answers_read.append(
                AnswerRead(
                    field_id=fid,
                    field_label=labels.get(fid, "Unknown field"),
                    value=item.get("value"),
                )
            )
        details.append(
            ResponseDetail(
                id=row.id,
                submitted_at=row.submitted_at,
                answers=answers_read,
            )
        )

    return ResponsesRead(form_id=form_id, total=total, responses=details)
