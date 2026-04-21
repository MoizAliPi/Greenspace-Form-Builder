from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

import bcrypt
from jose import JWTError, jwt

from app.core.config import settings


def hash_password(password: str) -> str:
    digest = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    return digest.decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("ascii"))


def create_access_token(user_id: uuid.UUID) -> str:
    """Return a signed HS256 JWT carrying the user id as `sub` with a UTC `exp` claim.

    Expiry is a fixed window (`ACCESS_TOKEN_EXPIRE_MINUTES`) because the MVP has no refresh
    token flow; the frontend re-authenticates by prompting login when it sees a 401.
    """
    expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": str(user_id),
        "exp": int(expire.timestamp()),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_access_token_user_id(token: str) -> uuid.UUID:
    """Verify signature + expiry and return the `sub` as a UUID, else raise `JWTError`.

    We collapse every failure (bad signature, expired, missing `sub`, non-UUID `sub`) to a
    single `JWTError` so callers can't branch on failure reasons and accidentally leak info.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
        sub = payload.get("sub")
        if sub is None:
            raise JWTError("missing sub")
        return uuid.UUID(str(sub))
    except (JWTError, ValueError) as e:
        raise JWTError("invalid token") from e
