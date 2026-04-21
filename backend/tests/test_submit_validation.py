"""Per-field-type submission validation for POST /api/v1/forms/{id}/submit."""

from __future__ import annotations

from typing import Any

import pytest
import pytest_asyncio
from httpx import AsyncClient


@pytest_asyncio.fixture
async def auth_headers(client: AsyncClient) -> dict[str, str]:
    await client.post(
        "/api/v1/auth/register",
        json={"email": "validator@example.com", "password": "password123"},
    )
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "validator@example.com", "password": "password123"},
    )
    return {"Authorization": f"Bearer {r.json()['access_token']}"}


async def _create_form_with_field(
    client: AsyncClient,
    headers: dict[str, str],
    *,
    field: dict[str, Any],
) -> tuple[str, str]:
    """Create → PUT (fields + publish) → return `(form_id, field_id)` ready for /submit."""
    create = await client.post("/api/v1/forms", json={"title": "V"}, headers=headers)
    form_id = create.json()["id"]
    put = await client.put(
        f"/api/v1/forms/{form_id}",
        json={"status": "published", "fields": [field]},
        headers=headers,
    )
    assert put.status_code == 200
    field_id = put.json()["fields"][0]["id"]
    return form_id, field_id


@pytest.mark.parametrize(
    ("field", "good", "bad"),
    [
        (
            {"type": "short_text", "label": "Name", "required": True, "order": 0, "config": {}},
            "Ada",
            123,
        ),
        (
            {"type": "long_text", "label": "Bio", "required": True, "order": 0, "config": {}},
            "Multiple\nlines",
            True,
        ),
        (
            {"type": "email", "label": "Email", "required": True, "order": 0, "config": {}},
            "ada@example.com",
            "not-an-email",
        ),
        (
            {
                "type": "phone_number",
                "label": "Phone",
                "required": True,
                "order": 0,
                "config": {},
            },
            "+1 555 123 4567",
            "",
        ),
        (
            {
                "type": "checkbox",
                "label": "Agree",
                "required": True,
                "order": 0,
                "config": {"checkbox_label": "I agree"},
            },
            True,
            "true",
        ),
        (
            {
                "type": "yes_no",
                "label": "OK?",
                "required": True,
                "order": 0,
                "config": {"options": ["yes", "no"]},
            },
            "yes",
            "maybe",
        ),
        (
            {
                "type": "address",
                "label": "Address",
                "required": True,
                "order": 0,
                "config": {"fields": ["line1", "city", "postal_code", "country"]},
            },
            {"line1": "1 Main", "city": "Dublin", "postal_code": "D01", "country": "IE"},
            "not-an-object",
        ),
        (
            {
                "type": "date_of_birth",
                "label": "DOB",
                "required": True,
                "order": 0,
                "config": {"date_format": "DD-MM-YYYY"},
            },
            "15-04-1990",
            "1990-04-15",
        ),
    ],
    ids=[
        "short_text",
        "long_text",
        "email",
        "phone_number",
        "checkbox",
        "yes_no",
        "address",
        "date_of_birth",
    ],
)
async def test_submit_accepts_good_rejects_bad(
    client: AsyncClient,
    auth_headers: dict[str, str],
    field: dict[str, Any],
    good: Any,
    bad: Any,
) -> None:
    form_id, field_id = await _create_form_with_field(client, auth_headers, field=field)

    ok = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": [{"field_id": field_id, "value": good}]},
    )
    assert ok.status_code == 201, ok.text

    nope = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": [{"field_id": field_id, "value": bad}]},
    )
    assert nope.status_code == 422, nope.text


async def test_submit_rejects_impossible_calendar_date(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    """DD-MM-YYYY must also be a real calendar date (31-02-YYYY is not)."""
    form_id, field_id = await _create_form_with_field(
        client,
        auth_headers,
        field={
            "type": "date_of_birth",
            "label": "DOB",
            "required": True,
            "order": 0,
            "config": {"date_format": "DD-MM-YYYY"},
        },
    )
    resp = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": [{"field_id": field_id, "value": "31-02-1990"}]},
    )
    assert resp.status_code == 422


async def test_submit_rejects_unpublished_form(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    create = await client.post("/api/v1/forms", json={"title": "Draft"}, headers=auth_headers)
    form_id = create.json()["id"]

    resp = await client.post(
        f"/api/v1/forms/{form_id}/submit",
        json={"answers": []},
    )
    assert resp.status_code == 422
