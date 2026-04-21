from __future__ import annotations

from fastapi import Query

from app.schemas.response import PaginationParams


def pagination_params(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> PaginationParams:
    return PaginationParams(limit=limit, offset=offset)
