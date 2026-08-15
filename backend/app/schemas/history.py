"""
SmartReach AI — Outreach History & Delivery Log Schemas
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class SendLogResponse(BaseModel):
    id: str
    user_id: str
    campaign_id: str
    campaign_name: str
    email_id: str
    contact_id: str
    recipient_name: str
    recipient_email: str
    recipient_company: str
    recipient_title: str
    subject: str
    body_snippet: str
    status: str = "sent"  # sent, delivered, failed, simulated
    error_message: Optional[str] = None
    sent_at: datetime


class SendLogListResponse(BaseModel):
    logs: List[SendLogResponse]
    total: int


class HistoryStatsResponse(BaseModel):
    total_sent: int = 0
    total_delivered: int = 0
    total_failed: int = 0
    total_campaigns: int = 0
