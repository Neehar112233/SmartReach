"""
SmartReach AI — Authentication Schemas

Pydantic models for registration, login, and token responses.
"""

from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """User registration request."""
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Neehar Sharma"])
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securePassword123"])


class LoginRequest(BaseModel):
    """User login credential verification."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., examples=["securePassword123"])


class LoginInitiateResponse(BaseModel):
    """Response when credentials are valid, requesting OTP verification."""
    require_otp: bool = True
    email: str
    message: str
    dev_otp: Optional[str] = None


class VerifyLoginOTPRequest(BaseModel):
    """Submit 6-digit OTP to complete login."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class ForgotPasswordRequest(BaseModel):
    """Request password reset code."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])


class ResetPasswordRequest(BaseModel):
    """Submit OTP and new password to reset account password."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    new_password: str = Field(..., min_length=8, max_length=128, examples=["newSecurePass123"])


class ResendOTPRequest(BaseModel):
    """Request a fresh OTP code."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    purpose: str = Field("login", examples=["login", "reset_password"])


class MessageResponse(BaseModel):
    """Generic message response."""
    message: str
    email: Optional[str] = None
    dev_otp: Optional[str] = None


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

