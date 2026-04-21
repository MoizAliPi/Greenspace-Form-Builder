from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.response import Response


async def add(session: AsyncSession, row: Response) -> Response:
    session.add(row)
    await session.flush()
    await session.refresh(row)
    return row


async def count_for_form(session: AsyncSession, form_id: uuid.UUID) -> int:
    stmt = select(func.count()).select_from(Response).where(Response.form_id == form_id)
    result = await session.execute(stmt)
    return int(result.scalar_one())


async def list_for_form(
    session: AsyncSession,
    form_id: uuid.UUID,
    *,
    limit: int,
    offset: int,
) -> list[Response]:
    stmt = (
        select(Response)
        .where(Response.form_id == form_id)
        .order_by(Response.submitted_at.desc())
        .limit(limit)
        .offset(offset)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())
