"""
SmartReach AI — Settings & SMTP Pydantic Schemas
"""

from datetime import datetime
from typing import Optional, Literal
from pydantic import BaseModel, Field


class SMTPSettingsUpdate(BaseModel):
    provider: Literal["gmail", "outlook", "sendgrid", "custom"] = "gmail"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: Optional[str] = None
    sender_name: str = ""
    sender_email: str = ""
    use_tls: bool = True
    use_ssl: bool = False
    daily_limit: int = Field(default=50, ge=1, le=500)
    delay_seconds: int = Field(default=3, ge=1, le=60)
    simulation_mode: bool = False
    attach_resume: bool = True


class SMTPSettingsResponse(BaseModel):
    provider: str = "custom"
    smtp_host: str = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: str = ""
    sender_name: str = ""
    sender_email: str = ""
    use_tls: bool = True
    use_ssl: bool = False
    daily_limit: int = 50
    delay_seconds: int = 3
    simulation_mode: bool = False
    attach_resume: bool = True
    is_configured: bool = False
    has_password: bool = False
    connection_status: str = "untested"
    last_tested_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class SMTPTestRequest(BaseModel):
    provider: Optional[str] = "gmail"
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    use_tls: Optional[bool] = None
    use_ssl: Optional[bool] = None
    simulation_mode: Optional[bool] = None


class SMTPTestResponse(BaseModel):
    success: bool
    message: str
    latency_ms: float = 0.0
