from __future__ import annotations

import uuid

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_access_token_user_id
from app.db.session import get_session
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User:
    """FastAPI dependency for strictly-authenticated routes.

    Returns the `User` row that owns the Bearer token, or raises 401 for every failure mode
    (missing header, wrong scheme, invalid/expired token, user row deleted after token issue).
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        user_id: uuid.UUID = decode_access_token_user_id(credentials.credentials)
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from None
    user = await session.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def get_current_user_optional(
    credentials: HTTPAuthorizationCredentials | None = Depends(security),
    session: AsyncSession = Depends(get_session),
) -> User | None:
    """FastAPI dependency for routes open to anonymous users but aware of the owner.

    Used by `GET /forms/{id}` so an authenticated owner can view their own draft while
    anonymous respondents still hit the published-only branch. Any credential problem
    (missing, wrong scheme, bad token) resolves to `None` instead of 401.
    """
    if credentials is None or credentials.scheme.lower() != "bearer":
        return None
    try:
        user_id: uuid.UUID = decode_access_token_user_id(credentials.credentials)
    except JWTError:
        return None
    return await session.get(User, user_id)
