from __future__ import annotations

from sqlalchemy import text


async def test_db_fixture_creates_tables(db_session) -> None:
    """Ensure ORM metadata is valid for the test engine (SQLite in-memory)."""
    result = await db_session.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
    names = {row[0] for row in result.fetchall()}
    assert "users" in names
    assert "forms" in names
    assert "fields" in names
    assert "responses" in names
