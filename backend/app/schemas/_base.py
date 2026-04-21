from __future__ import annotations

from datetime import UTC, datetime
from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict


def _assume_utc(value: datetime | str) -> datetime:
    """Attach UTC tz info to naive datetimes so API responses always include an offset.

    SQLite ignores ``DateTime(timezone=True)`` and returns naive datetimes, which Pydantic
    then serializes without a ``Z``/``+00:00`` suffix. Browsers parse such strings as local
    time, so the UI shows the UTC wall clock as if it were the viewer's timezone. We store
    all timestamps in UTC, so the safe default is to tag naive values as UTC on the way out.
    """
    if isinstance(value, datetime) and value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value


UtcDatetime = Annotated[datetime, BeforeValidator(_assume_utc)]
"""datetime that normalizes to timezone-aware UTC during Pydantic validation."""


class InputModel(BaseModel):
    """Request bodies — reject unknown keys."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OutputModel(BaseModel):
    """Response bodies — serialize from ORM instances."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")
