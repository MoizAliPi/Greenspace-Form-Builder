from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Body, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user, get_current_user_optional
from app.db.session import get_session
from app.deps.pagination import pagination_params
from app.models.user import User
from app.schemas.form import FormCreate, FormRead, FormsListRead, FormUpdate
from app.schemas.response import FormSubmit, PaginationParams, ResponseRead, ResponsesRead
from app.services import forms_service

_FORM_UPDATE_EXAMPLES = {
    "omit_field_ids": {
        "summary": "Replace fields — omit `id` (recommended)",
        "description": "Leave `id` out; the server assigns a new UUID per field.",
        "value": {
            "title": "Customer intake",
            "status": "published",
            "fields": [
                {
                    "type": "short_text",
                    "label": "Full name",
                    "required": True,
                    "order": 0,
                    "config": {"placeholder": "Jane Doe"},
                },
                {
                    "type": "email",
                    "label": "Work email",
                    "required": True,
                    "order": 1,
                    "config": {},
                },
            ],
        },
    },
    "unique_field_ids": {
        "summary": "Stable ids — must be unique per field",
        "description": "If you send `id`, each field needs a different UUID.",
        "value": {
            "fields": [
                {
                    "type": "short_text",
                    "id": "11111111-1111-4111-8111-111111111111",
                    "label": "A",
                    "required": False,
                    "order": 0,
                    "config": {},
                },
                {
                    "type": "email",
                    "id": "22222222-2222-4222-8222-222222222222",
                    "label": "B",
                    "required": False,
                    "order": 1,
                    "config": {},
                },
            ],
        },
    },
}

router = APIRouter(prefix="/api/v1/forms", tags=["forms"])


@router.get("", response_model=FormsListRead)
async def list_my_forms(
    session: AsyncSession = Depends(get_session),
    current: User = Depends(get_current_user),
    pagination: PaginationParams = Depends(pagination_params),
) -> FormsListRead:
    return await forms_service.list_forms_for_owner(
        session,
        current,
        limit=pagination.limit,
        offset=pagination.offset,
    )


@router.post("", response_model=FormRead, status_code=status.HTTP_201_CREATED)
async def create_form(
    body: FormCreate,
    session: AsyncSession = Depends(get_session),
    current: User = Depends(get_current_user),
) -> FormRead:
    return await forms_service.create_form(session, current.id, body)


@router.get("/{form_id}", response_model=FormRead)
async def get_form(
    form_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(get_current_user_optional),
) -> FormRead:
    return await forms_service.get_form(session, form_id, user)


@router.put("/{form_id}", response_model=FormRead)
async def update_form(
    form_id: uuid.UUID,
    body: Annotated[FormUpdate, Body(openapi_examples=_FORM_UPDATE_EXAMPLES)],
    session: AsyncSession = Depends(get_session),
    current: User = Depends(get_current_user),
) -> FormRead:
    return await forms_service.update_form(session, form_id, current, body)


@router.post(
    "/{form_id}/submit",
    response_model=ResponseRead,
    status_code=status.HTTP_201_CREATED,
)
async def submit_form(
    form_id: uuid.UUID,
    body: FormSubmit,
    session: AsyncSession = Depends(get_session),
) -> ResponseRead:
    return await forms_service.submit_form(session, form_id, body)


@router.get("/{form_id}/responses", response_model=ResponsesRead)
async def list_responses(
    form_id: uuid.UUID,
    session: AsyncSession = Depends(get_session),
    current: User = Depends(get_current_user),
    pagination: PaginationParams = Depends(pagination_params),
) -> ResponsesRead:
    return await forms_service.list_form_responses(
        session,
        form_id,
        current,
        limit=pagination.limit,
        offset=pagination.offset,
    )
