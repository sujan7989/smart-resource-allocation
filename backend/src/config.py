from pydantic_settings import BaseSettings
from pydantic import field_validator
from typing import Optional
import os


class Settings(BaseSettings):
    # ── Database ──────────────────────────────────────────────────────────────
    # SQLite for local dev; set to PostgreSQL URL in production.
    DATABASE_URL: str = "sqlite:///./smart_resource.db"

    # ── Security ──────────────────────────────────────────────────────────────
    # REQUIRED in production. Generate with:
    #   python -c "import secrets; print(secrets.token_hex(32))"
    # In dev, a stable fallback is used so restarts don't invalidate sessions.
    SECRET_KEY: str = "dev-only-stable-key-do-not-use-in-production-abc123xyz789"

    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # ── CORS ──────────────────────────────────────────────────────────────────
    FRONTEND_URL: str = "http://localhost:5173"

    # ── Admin seed credentials ────────────────────────────────────────────────
    # Override ALL of these in production via environment variables.
    ADMIN_EMAIL: str = "admin@smartalloc.org"
    ADMIN_PASSWORD: str = "Admin@123"
    ADMIN_FULL_NAME: str = "Platform Admin"

    # ── Database pool (PostgreSQL only) ───────────────────────────────────────
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10

    # ── Email ─────────────────────────────────────────────────────────────────
    # RECOMMENDED: Brevo (free 300/day, works on Render free tier, any recipient)
    #   Sign up: https://app.brevo.com → API Keys → Generate a new API key
    BREVO_API_KEY: str = ""

    # Resend (free 3000/month, needs verified domain for all recipients)
    RESEND_API_KEY: str = ""

    # SMTP — blocked on Render free tier, use only on paid hosting
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""

    EMAIL_FROM_ADDRESS: str = "noreply@smartalloc.org"
    EMAIL_FROM_NAME: str = "Smart Resource Allocation"

    @field_validator("BREVO_API_KEY", "RESEND_API_KEY", "SMTP_PASSWORD", "SMTP_USER", "SMTP_HOST", "EMAIL_FROM_ADDRESS", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        """Strip accidental whitespace/newlines that Render's UI can introduce."""
        if isinstance(v, str):
            return v.strip()
        return v

    # ── Token expiry ──────────────────────────────────────────────────────────
    PASSWORD_RESET_EXPIRE_MINUTES: int = 60       # 1 hour
    ADMIN_INVITE_EXPIRE_HOURS: int = 48           # 2 days

    @field_validator("SECRET_KEY")
    @classmethod
    def warn_insecure_key(cls, v: str) -> str:
        # Warn loudly if the dev fallback is used outside of local dev
        if v == "dev-only-stable-key-do-not-use-in-production-abc123xyz789":
            env = os.getenv("RENDER") or os.getenv("RAILWAY_ENVIRONMENT") or os.getenv("DYNO")
            if env:
                import warnings
                warnings.warn(
                    "⚠️  CRITICAL: SECRET_KEY is using the insecure dev default in production! "
                    "Set the SECRET_KEY environment variable immediately.",
                    stacklevel=2,
                )
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
