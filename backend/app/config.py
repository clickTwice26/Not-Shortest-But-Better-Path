from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://poth:poth@localhost:5433/poth"
    redis_url: str = "redis://localhost:6380/0"

    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.0-flash"

    # Planner tuning (see PLAN.md §2)
    ellipse_factor: float = 1.4
    max_entry_nodes: int = 3
    max_exit_nodes: int = 3

    cache_ttl_seconds: int = 60 * 60 * 6

    cors_origins: str = "http://localhost:3000"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
