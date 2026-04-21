from __future__ import annotations

from typing import Annotated

from pydantic import Field

Title = Annotated[str, Field(min_length=1, max_length=200)]
Slug = Annotated[str, Field(min_length=1, max_length=100, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")]
