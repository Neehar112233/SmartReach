"""
SmartReach AI — Authentication Schemas

Pydantic models for registration, email OTP verification, login,
password recovery, and token responses.
"""

from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """Legacy/direct user registration request."""
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Neehar Sharma"])
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securePassword123"])


class RegisterSendOTPRequest(BaseModel):
    """Initiate registration by validating credentials and sending verification OTP."""
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Neehar Sharma"])
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securePassword123"])


class RegisterVerifyOTPRequest(BaseModel):
    """Verify registration OTP and create user account."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class LoginRequest(BaseModel):
    """Direct user login request."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    password: str = Field(..., examples=["securePassword123"])


class ForgotPasswordRequest(BaseModel):
    """Request password reset OTP email."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])


class VerifyResetOTPRequest(BaseModel):
    """Validate password reset OTP code before asking for new password."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])


class ResetPasswordRequest(BaseModel):
    """Submit reset OTP with new password."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    otp: str = Field(..., min_length=6, max_length=6, examples=["123456"])
    new_password: str = Field(..., min_length=8, max_length=128, examples=["newSecurePassword123"])


class ResendOTPRequest(BaseModel):
    """Resend verification or reset OTP code."""
    email: EmailStr = Field(..., examples=["neehar@example.com"])
    purpose: Literal["register", "forgot_password"] = Field(..., examples=["register"])


class OTPActionResponse(BaseModel):
    """Generic response for OTP triggering actions (never exposes OTP)."""
    message: str
    email: str
    email_sent: bool = True


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
