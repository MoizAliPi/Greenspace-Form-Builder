from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.form import Form


async def get_by_id_with_fields(session: AsyncSession, form_id: uuid.UUID) -> Form | None:
    stmt = select(Form).where(Form.id == form_id).options(selectinload(Form.fields))
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_by_slug(session: AsyncSession, slug: str) -> Form | None:
    stmt = select(Form).where(Form.slug == slug)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def add(session: AsyncSession, form: Form) -> Form:
    session.add(form)
    await session.flush()
    await session.refresh(form)
    return form


async def count_for_owner(session: AsyncSession, owner_id: uuid.UUID) -> int:
    stmt = select(func.count()).select_from(Form).where(Form.owner_id == owner_id)
    result = await session.execute(stmt)
    return int(result.scalar_one())


async def list_for_owner(
    session: AsyncSession,
    owner_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> list[Form]:
    stmt = (
        select(Form)
        .where(Form.owner_id == owner_id)
        .order_by(Form.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
