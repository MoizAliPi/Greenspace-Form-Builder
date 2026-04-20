from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = Field(default="postgresql+asyncpg://user:password@localhost:5432/formbuilder")
    CORS_ORIGINS: list[str] = Field(default_factory=lambda: ["http://localhost:3000"])
    SUPABASE_JWT_SECRET: str = Field(default="")
    LOG_LEVEL: str = Field(default="INFO")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
