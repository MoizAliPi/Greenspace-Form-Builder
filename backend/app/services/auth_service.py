from __future__ import annotations

from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.repositories import user as user_repo


async def register_user(session: AsyncSession, *, email: str, password: str) -> tuple[User, str]:
    """Create a new account and return `(user, access_token)`.

    Emails are normalized (trimmed + lowercased) before uniqueness checks so "Ada@x.com" and
    "ada@x.com" cannot both register. Passwords are bcrypt-hashed; the plaintext is never
    persisted or logged.
    """
    normalized = email.strip().lower()
    existing = await user_repo.get_user_by_email(session, normalized)
    if existing is not None:
        raise HTTPException(status_code=409, detail="Email already registered")
    user = await user_repo.create_user(
        session,
        email=normalized,
        password_hash=hash_password(password),
    )
    await session.commit()
    token = create_access_token(user.id)
    return user, token


async def login_user(session: AsyncSession, *, email: str, password: str) -> tuple[User, str]:
    """Verify credentials and return `(user, access_token)`, else raise 401.

    Returns the same generic "Invalid email or password" error for both unknown-email and
    wrong-password cases so callers cannot enumerate registered emails.
    """
    normalized = email.strip().lower()
    user = await user_repo.get_user_by_email(session, normalized)
    if user is None or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    return user, token
