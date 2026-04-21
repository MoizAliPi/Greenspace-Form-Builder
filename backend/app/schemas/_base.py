from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class InputModel(BaseModel):
    """Request bodies — reject unknown keys."""

    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class OutputModel(BaseModel):
    """Response bodies — serialize from ORM instances."""

    model_config = ConfigDict(from_attributes=True, extra="ignore")
