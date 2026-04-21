from __future__ import annotations

import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "creator@example.com", "password": "password123"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "creator@example.com", "password": "password123"},
    )
    token = r.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


async def test_list_my_forms(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    empty = await client.get("/api/v1/forms", headers=auth_headers)
    assert empty.status_code == 200
    assert empty.json() == {"items": [], "total": 0}

    await client.post("/api/v1/forms", json={"title": "One"}, headers=auth_headers)
    await client.post("/api/v1/forms", json={"title": "Two"}, headers=auth_headers)
    lst = await client.get("/api/v1/forms?limit=10&offset=0", headers=auth_headers)
    assert lst.status_code == 200
    data = lst.json()
    assert data["total"] == 2
    assert len(data["items"]) == 2
    titles = {item["title"] for item in data["items"]}
    assert titles == {"One", "Two"}


async def test_create_and_get_published(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post(
        "/api/v1/forms",
        json={"title": "My survey"},
        headers=auth_headers,
    )
    assert r.status_code == 201
    form = r.json()
    form_id = form["id"]
    assert form["status"] == "draft"
    assert form["fields"] == []

    g = await client.get(f"/api/v1/forms/{form_id}", headers=auth_headers)
    assert g.status_code == 200

    anon = await client.get(f"/api/v1/forms/{form_id}")
    assert anon.status_code == 404

    u = await client.put(
        f"/api/v1/forms/{form_id}",
        json={"status": "published"},
        headers=auth_headers,
    )
    assert u.status_code == 200
    assert u.json()["status"] == "published"

    pub = await client.get(f"/api/v1/forms/{form_id}")
    assert pub.status_code == 200
    assert pub.json()["id"] == form_id


async def test_submit_validation(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post("/api/v1/forms", json={"title": "T"}, headers=auth_headers)
    form_id = r.json()["id"]
    field_body = {
        "type": "short_text",
        "label": "Name",
        "required": True,
        "order": 0,
        "config": {},
    }
    await client.put(
        f"/api/v1/forms/{form_id}",
        json={"status": "published", "fields": [field_body]},
        headers=auth_headers,
    )
    form = (await client.get(f"/api/v1/forms/{form_id}")).json()
    field_id = form["fields"][0]["id"]

    bad = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": []},
    )
    assert bad.status_code == 422

    ok = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": [{"field_id": field_id, "value": "Ada"}]},
    )
    assert ok.status_code == 201


async def test_responses_owner_only(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    r = await client.post("/api/v1/forms", json={"title": "R"}, headers=auth_headers)
    form_id = r.json()["id"]
    other = await client.post(
        "/api/v1/auth/register",
        json={"email": "other@example.com", "password": "password123"},
    )
    assert other.status_code == 201
    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "other@example.com", "password": "password123"},
    )
    other_token = login.json()["access_token"]
    resp = await client.get(
        f"/api/v1/forms/{form_id}/responses",
        headers={"Authorization": f"Bearer {other_token}"},
    )
    assert resp.status_code == 403

    mine = await client.get(
        f"/api/v1/forms/{form_id}/responses",
        headers=auth_headers,
    )
    assert mine.status_code == 200
    assert mine.json()["total"] == 0


async def test_duplicate_slug_on_create(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    await client.post(
        "/api/v1/forms",
        json={"title": "X", "slug": "same-slug"},
        headers=auth_headers,
    )
    dup = await client.post(
        "/api/v1/forms",
        json={"title": "Y", "slug": "same-slug"},
        headers=auth_headers,
    )
    assert dup.status_code == 422


async def test_duplicate_field_ids_rejected(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    rid = await client.post("/api/v1/forms", json={"title": "Dup"}, headers=auth_headers)
    form_id = rid.json()["id"]
    shared = "3fa85f64-5717-4562-b3fc-2c963f66afa6"
    field_body = {
        "type": "short_text",
        "id": shared,
        "label": "A",
        "required": False,
        "order": 0,
        "config": {},
    }
    r = await client.put(
        f"/api/v1/forms/{form_id}",
        json={"fields": [field_body, {**field_body, "label": "B", "order": 1}]},
        headers=auth_headers,
    )
    assert r.status_code == 422
