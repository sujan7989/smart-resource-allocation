from pydantic_settings import BaseSettings
from typing import Optional
import secrets


class Settings(BaseSettings):
    # SQLite by default for local dev; override with PostgreSQL URL for production
    DATABASE_URL: str = "sqlite:///./smart_resource.db"

    # REQUIRED in production — no insecure default.
    # Generate one with: python -c "import secrets; print(secrets.token_hex(32))"
    SECRET_KEY: str = secrets.token_hex(32)  # random per-process fallback for dev only

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    FRONTEND_URL: str = "http://localhost:5173"

    # Admin seed credentials — override via env in production
    ADMIN_EMAIL: str = "admin@smartalloc.org"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_FULL_NAME: str = "Platform Admin"

    # Rate limiting (requests per minute per IP)
    AUTH_RATE_LIMIT: int = 10

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
