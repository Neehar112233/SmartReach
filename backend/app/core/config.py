"""
SmartReach AI — Application Configuration

Loads environment variables using Pydantic Settings.
All secrets and configurable values come from .env or environment variables.
"""

from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # --- Application ---
    APP_NAME: str = "SmartReach AI"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    DEMO_MODE: bool = True

    # --- MongoDB ---
    MONGODB_URI: str = "mongodb://localhost:27017"
    DATABASE_NAME: str = "smartreach"

    # --- JWT Authentication ---
    JWT_SECRET: str = "change-this-to-a-strong-random-secret"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRY_HOURS: int = 24

    # --- AI ---
    AI_API_KEY: Optional[str] = None
    AI_MODEL: str = "gpt-4o-mini"

    # --- Google OAuth ---
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/auth/google/callback"

    # --- URLs ---
    FRONTEND_URL: str = "http://localhost:5173"
    BACKEND_URL: str = "http://localhost:8000"

    # --- File Upload Limits ---
    MAX_RESUME_SIZE_MB: int = 10
    MAX_CONTACTS_FILE_SIZE_MB: int = 25

    # --- Email Sending ---
    EMAIL_BATCH_SIZE: int = 25
    EMAIL_DELAY_SECONDS: float = 2.0
    MAX_CONSECUTIVE_FAILURES: int = 5

    # --- System Email (for Auth OTPs & Password Resets) ---
    RESEND_API_KEY: Optional[str] = None
    SYSTEM_SMTP_HOST: str = "smtp.gmail.com"
    SYSTEM_SMTP_PORT: int = 587
    SYSTEM_SMTP_USER: Optional[str] = None
    SYSTEM_SMTP_PASSWORD: Optional[str] = None
    SYSTEM_SMTP_SENDER_EMAIL: Optional[str] = None
    SYSTEM_SMTP_SENDER_NAME: str = "SmartReach AI"
    SYSTEM_SMTP_USE_TLS: bool = True
    SYSTEM_SMTP_USE_SSL: bool = False
    OTP_EXPIRY_MINUTES: int = 10


    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        "extra": "ignore",
    }


# Singleton instance
settings = Settings()
