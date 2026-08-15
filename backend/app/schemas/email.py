"""
SmartReach AI — Generated Email Schemas
"""

from typing import Dict, List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class EmailUpdate(BaseModel):
    subject: Optional[str] = Field(None, min_length=3, max_length=200)
    body: Optional[str] = Field(None, min_length=10)
    status: Optional[str] = Field(None, description="Status: draft, approved, rejected")


class GeneratedEmailResponse(BaseModel):
    id: str
    campaign_id: str
    user_id: str
    contact_id: str
    recipient_name: str
    recipient_email: str
    recipient_company: str
    recipient_title: str
    subject: str
    body: str
    status: str = "draft"  # draft, approved, rejected, sent, failed
    error_message: Optional[str] = None
    generated_at: datetime
    updated_at: Optional[datetime] = None


class EmailListResponse(BaseModel):
    emails: List[GeneratedEmailResponse]
    total: int
    counts: Dict[str, int] = Field(default_factory=dict)


class BatchGenerateResponse(BaseModel):
    message: str
    campaign_id: str
    generated_count: int
    failed_count: int
    emails: List[GeneratedEmailResponse]
