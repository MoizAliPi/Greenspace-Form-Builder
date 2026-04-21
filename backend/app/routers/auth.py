from __future__ import annotations

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.db.session import get_session
from app.models.user import User
from app.schemas.auth import TokenResponse, UserLogin, UserRead, UserRegister
from app.services import auth_service

router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    body: UserRegister,
    session: AsyncSession = Depends(get_session),
) -> TokenResponse:
    _, token = await auth_service.register_user(session, email=body.email, password=body.password)
    return TokenResponse(access_token=token)


@router.post("/login", response_model=TokenResponse)
async def login(body: UserLogin, session: AsyncSession = Depends(get_session)) -> TokenResponse:
    _, token = await auth_service.login_user(session, email=body.email, password=body.password)
    return TokenResponse(access_token=token)


@router.get("/me", response_model=UserRead)
async def me(current: User = Depends(get_current_user)) -> UserRead:
    return UserRead.model_validate(current)
