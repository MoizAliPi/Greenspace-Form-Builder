from __future__ import annotations

import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def registered_user(client: AsyncClient) -> dict[str, str]:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": "creator@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    return {"email": "creator@example.com", "token": data["access_token"]}


async def test_register_login_me(client: AsyncClient, registered_user: dict[str, str]) -> None:
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": "password123"},
    )
    assert login.status_code == 200
    token = login.json()["access_token"]

    me = await client.get(
        "/api/v1/auth/me",
        headers={"Authorization": f"Bearer {token}"},
    )
    assert me.status_code == 200
    assert me.json()["email"] == "creator@example.com"


async def test_register_duplicate_email(
    client: AsyncClient,
    registered_user: dict[str, str],
) -> None:
    r = await client.post(
        "/api/v1/auth/register",
        json={"email": registered_user["email"], "password": "otherpass12"},
    )
    assert r.status_code == 409


async def test_login_invalid_password(client: AsyncClient, registered_user: dict[str, str]) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": registered_user["email"], "password": "wrongpassword"},
    )
    assert r.status_code == 401


async def test_me_without_token(client: AsyncClient) -> None:
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
