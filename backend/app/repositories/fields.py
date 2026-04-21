from __future__ import annotations

import uuid

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.field import Field


async def delete_for_form(session: AsyncSession, form_id: uuid.UUID) -> None:
    await session.execute(delete(Field).where(Field.form_id == form_id))
