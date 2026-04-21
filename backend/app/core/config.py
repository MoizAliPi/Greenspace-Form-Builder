from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = Field(
        default="sqlite+aiosqlite:///./formbuilder.db",
        description="Async SQLAlchemy URL; default is local SQLite for development.",
    )
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    JWT_SECRET: str = Field(
        default="dev-insecure-jwt-secret-change-me-in-production-32chars",
        min_length=32,
    )
    JWT_ALGORITHM: str = Field(default="HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60 * 24 * 7)
    LOG_LEVEL: str = Field(default="INFO")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
