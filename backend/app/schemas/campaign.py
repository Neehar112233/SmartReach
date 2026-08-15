"""
SmartReach AI — Campaign Schemas
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class CampaignBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120, description="Campaign Name")
    target_role: str = Field(..., min_length=2, max_length=100, description="Target Role (e.g. Senior Full Stack Engineer)")
    tone: str = Field("professional", description="Tone: professional, casual, enthusiastic, or concise")
    custom_instructions: Optional[str] = Field(None, max_length=1000, description="Custom prompt instructions for the AI")
    subject_line_style: Optional[str] = Field("direct", description="Style: direct, value, curious, or referral")


class CampaignCreate(CampaignBase):
    contact_ids: Optional[List[str]] = Field(None, description="Specific contact IDs to include, or None for all valid contacts")


class CampaignUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=120)
    target_role: Optional[str] = Field(None, min_length=2, max_length=100)
    tone: Optional[str] = None
    custom_instructions: Optional[str] = None
    subject_line_style: Optional[str] = None
    status: Optional[str] = None


class CampaignResponse(CampaignBase):
    id: str
    user_id: str
    status: str = "draft"  # draft, generating, ready, sending, completed, paused
    total_contacts: int = 0
    emails_generated: int = 0
    emails_approved: int = 0
    emails_sent: int = 0
    emails_failed: int = 0
    contact_ids: List[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: Optional[datetime] = None


class CampaignListResponse(BaseModel):
    campaigns: List[CampaignResponse]
    total: int
