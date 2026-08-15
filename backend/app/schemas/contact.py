"""
SmartReach AI — Contact Schemas
"""

from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel, Field


class ContactBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100, description="Full Name of HR / Recruiter")
    email: str = Field(..., min_length=3, max_length=150, description="Contact Email Address")
    company: str = Field(..., min_length=1, max_length=100, description="Company / Organization Name")
    title: Optional[str] = Field("HR / Recruiter", max_length=100, description="Designation or Role Title")
    location: Optional[str] = Field(None, max_length=100, description="City / Region")
    linkedin_url: Optional[str] = Field(None, max_length=255, description="LinkedIn Profile URL")


class ContactCreate(ContactBase):
    campaign_id: Optional[str] = None


class ContactUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    email: Optional[str] = Field(None, min_length=3, max_length=150)
    company: Optional[str] = Field(None, min_length=1, max_length=100)
    title: Optional[str] = Field(None, max_length=100)
    location: Optional[str] = Field(None, max_length=100)
    linkedin_url: Optional[str] = Field(None, max_length=255)
    campaign_id: Optional[str] = None


class ContactResponse(ContactBase):
    id: str
    user_id: str
    campaign_id: Optional[str] = None
    sno: int = 1
    is_valid: bool = True
    validation_errors: List[str] = Field(default_factory=list)
    email_status: str = "draft"
    created_at: datetime
    updated_at: Optional[datetime] = None


class ContactUploadStats(BaseModel):
    total_rows: int = 0
    valid_count: int = 0
    invalid_count: int = 0
    duplicates_count: int = 0


class ContactUploadResponse(BaseModel):
    message: str
    filename: str
    stats: ContactUploadStats
    contacts: List[ContactResponse]


class ContactListResponse(BaseModel):
    contacts: List[ContactResponse]
    total: int
    page: int
    limit: int
    stats: ContactUploadStats
