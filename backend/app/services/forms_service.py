from __future__ import annotations

import uuid
from datetime import UTC, datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.errors import ForbiddenError, NotFoundError, ValidationError
from app.models.form import Form
from app.models.user import User
from app.repositories import forms as forms_repo
from app.repositories import responses as responses_repo
from app.schemas.field import FieldCreate
from app.schemas.form import FormCreate, FormRead, FormsListRead, FormStatus, FormUpdate
from app.schemas.response import AnswerRead, FormSubmit, ResponseDetail, ResponseRead, ResponsesRead
from app.services import submissions_service
from app.services.mappers import field_create_to_model, form_model_to_read, form_model_to_summary
from app.utils.slug import generate_auto_slug, slugify_title


def _assert_unique_field_ids_when_present(field_creates: list[FieldCreate]) -> None:
    """Reject payloads whose fields reuse the same `id`.

    Fails fast with a clear 422 instead of letting the DB raise a UNIQUE constraint error
    halfway through the rewrite in `update_form`. Fields without an `id` are ignored — they
    will be assigned fresh UUIDs on insert.
    """
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
    """Create a draft form for `owner_id`.

    If the caller provides a slug, it must be globally unique. Otherwise we derive one from the
    title and retry `generate_auto_slug` until the database accepts it, so concurrent callers
    with the same title do not collide on the `forms.slug` UNIQUE index.
    """
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
    """Return a form if the caller is allowed to see it, else 404.

    Published forms are visible to anyone (including anonymous respondents). Drafts are only
    visible to their owner, and we return 404 (not 403) for non-owners so the existence of a
    draft is not leaked.
    """
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
    """Patch form metadata and/or fully replace the fields collection.

    Only keys present in the request (`model_dump(exclude_unset=True)`) are applied, so callers
    can PATCH-style update title, slug, status, or fields independently. When `fields` is
    present we do a full replace: every existing Field is ORM-deleted (to keep the session's
    identity map in sync, since `expire_on_commit=False` otherwise leaves stale rows cached)
    and the payload is re-inserted. After commit we refresh `form.fields` so the response
    reflects what was actually persisted, not the pre-commit in-memory state.

    Raises:
        NotFoundError: No form with `form_id`.
        ForbiddenError: Caller is not the form owner.
        ValidationError: Slug collision, or duplicate field ids in the payload.
    """
    form = await forms_repo.get_by_id_with_fields(session, form_id)
    if form is None:
        raise NotFoundError("Form not found")
    if form.owner_id != owner.id:
        raise ForbiddenError("Not allowed")

    patch = body.model_dump(exclude_unset=True)
    updating_fields = "fields" in patch

    if "title" in patch and body.title is not None:
        form.title = body.title
    if "slug" in patch and body.slug is not None:
        other = await forms_repo.get_by_slug(session, body.slug)
        if other is not None and other.id != form.id:
            raise ValidationError("Slug already taken")
        form.slug = body.slug
    if "status" in patch and body.status is not None:
        form.status = body.status.value

    if updating_fields:
        field_creates = body.fields or []
        _assert_unique_field_ids_when_present(field_creates)
        # ORM delete (not bulk DELETE) so SQLAlchemy evicts the existing Field rows from the
        # session's identity map before we re-insert rows with the same ids.
        for existing in list(form.fields):
            await session.delete(existing)
        await session.flush()
        for fc in field_creates:
            session.add(field_create_to_model(form.id, fc))

    form.updated_at = datetime.now(UTC)
    await session.commit()

    if updating_fields:
        # `expire_on_commit=False` means the collection is still pointing at the pre-commit
        # Field objects. Reload from the DB so `form_model_to_read` returns the saved state.
        await session.refresh(form, attribute_names=["fields"])

    return form_model_to_read(form)


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
    """Return the owner-visible responses for a form with answers joined to current field labels.

    Answers are stored as a JSON list of `{field_id, value}` so fields that are renamed or
    deleted after submission still display sensibly. We resolve each stored `field_id` against
    the form's current fields; unknown ids (e.g. a field deleted since the submission) fall
    back to the label "Unknown field" rather than being dropped, so dashboards remain
    consistent with historical totals.
    """
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
