"""
SmartReach AI — User Profile Schemas

Pydantic models for user profile read/update operations.
"""

from pydantic import BaseModel, EmailStr, Field, HttpUrl
from typing import Optional
from datetime import datetime


class UserProfileResponse(BaseModel):
    """Full user profile returned from the API."""
    id: str
    full_name: str
    email: str
    phone: Optional[str] = None
    linkedin_url: Optional[str] = None
    github_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    outreach_objective: Optional[str] = None
    custom_instructions: Optional[str] = None
    resume_uploaded: bool = False
    created_at: datetime
    updated_at: datetime


class UserProfileUpdate(BaseModel):
    """Fields that can be updated on the user profile."""
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    phone: Optional[str] = Field(None, max_length=20)
    linkedin_url: Optional[str] = Field(None, max_length=500)
    github_url: Optional[str] = Field(None, max_length=500)
    portfolio_url: Optional[str] = Field(None, max_length=500)
    outreach_objective: Optional[str] = Field(None, max_length=1000)
    custom_instructions: Optional[str] = Field(None, max_length=2000)
