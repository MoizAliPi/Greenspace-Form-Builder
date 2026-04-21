from __future__ import annotations

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

import sqlalchemy as sa
from sqlalchemy import JSON, DateTime, ForeignKey, Index, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

if TYPE_CHECKING:
    from app.models.form import Form


class Response(Base):
    __tablename__ = "responses"
    __table_args__ = (Index("ix_responses_form_id", "form_id"),)

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
    )
    form_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("forms.id", ondelete="CASCADE"),
        nullable=False,
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    # List of { "field_id": "<uuid>", "value": ... } objects.
    answers: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON,
        nullable=False,
        server_default=sa.text("'[]'"),
    )

    form: Mapped[Form] = relationship(back_populates="responses")
