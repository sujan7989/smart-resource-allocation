from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    # SQLite by default for local dev; override with PostgreSQL URL for production
    DATABASE_URL: str = "sqlite:///./smart_resource.db"
    SECRET_KEY: str = "dev-secret-key-change-in-production-abc123xyz"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    FRONTEND_URL: str = "http://localhost:5173"

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
