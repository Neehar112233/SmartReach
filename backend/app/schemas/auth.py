"""
SmartReach AI — Authentication Schemas

Pydantic models for registration, login, and token responses.
"""

from pydantic import BaseModel, EmailStr, Field


class RegisterRequest(BaseModel):
    """User registration request."""
    full_name: str = Field(..., min_length=2, max_length=100, examples=["Navele Neehar"])
    email: EmailStr = Field(..., examples=["neeharnavele@gmail.com"])
    password: str = Field(..., min_length=8, max_length=128, examples=["securePassword123"])


class LoginRequest(BaseModel):
    """User login request."""
    email: EmailStr = Field(..., examples=["neeharnavele@gmail.com"])
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


class CaptchaResponse(BaseModel):
    """Captcha challenge payload."""
    captcha_id: str
    captcha_svg: str


class ResetPasswordRequest(BaseModel):
    """Password reset request with CAPTCHA validation."""
    email: EmailStr = Field(..., examples=["user@example.com"])
    captcha_id: str = Field(..., min_length=5, description="ID of the issued CAPTCHA")
    captcha_code: str = Field(..., min_length=4, max_length=10, description="CAPTCHA string entered by the user")
    new_password: str = Field(..., min_length=8, max_length=128, examples=["newSecurePass123"])


class ResetPasswordResponse(BaseModel):
    """Password reset result message."""
    message: str


# Rebuild model to resolve forward reference
TokenResponse.model_rebuild()

