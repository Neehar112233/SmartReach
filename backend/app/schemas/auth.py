"""
SmartReach AI — Authentication Schemas

Pydantic models for registration, login, and token responses.
"""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """User registration request."""
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Neehar Sharma"])
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securePassword123"])


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., examples=["securePassword123"])


class TokenResponse(BaseModel):
    """JWT token response."""
    access_token: str
    token_type: str = "bearer"
    user: "UserBasic"


class UserBasic(BaseModel):
    """Minimal user info returned with auth responses."""
    id: str
    full_name: str
    email: str


# Rebuild model to resolve forward reference
TokenResponse.model_rebuild()
