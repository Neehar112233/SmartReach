"""
SmartReach AI — Authentication API

Endpoints for user registration and login.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from bson import ObjectId

from app.core.database import get_collection, USERS_COLLECTION
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    TokenResponse,
    UserBasic,
    CaptchaResponse,
    ResetPasswordRequest,
    ResetPasswordResponse,
)
from app.services.captcha_service import generate_captcha, verify_captcha

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get(
    "/captcha",
    response_model=CaptchaResponse,
    summary="Generate a CAPTCHA challenge",
)
async def get_captcha():
    """Generate a visual SVG CAPTCHA challenge with signed verification token."""
    captcha_id, captcha_svg = generate_captcha()
    return CaptchaResponse(
        captcha_id=captcha_id,
        captcha_svg=captcha_svg,
    )


@router.post(
    "/reset-password",
    response_model=ResetPasswordResponse,
    summary="Reset password with CAPTCHA validation",
)
async def reset_password(payload: ResetPasswordRequest):
    """
    Reset user password after verifying CAPTCHA.
    
    1. Validates the CAPTCHA challenge.
    2. Finds the user account.
    3. Hashes the new password and updates the database record.
    """
    # 1. Verify CAPTCHA
    is_valid_captcha = verify_captcha(payload.captcha_id, payload.captcha_code)
    if not is_valid_captcha:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired CAPTCHA code. Please click refresh and try again.",
        )

    # 2. Find user in database
    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found associated with this email address.",
        )

    # 3. Hash new password and update user record
    now = datetime.now(timezone.utc)
    new_password_hash = hash_password(payload.new_password)

    await users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "updated_at": now,
            }
        },
    )

    logger.info("Password successfully reset for user: %s", payload.email.lower())

    return ResetPasswordResponse(
        message="Password has been successfully updated. You can now log in."
    )


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user",
)
async def register(payload: RegisterRequest):
    """
    Create a new user account.

    - Validates that the email is not already registered.
    - Hashes the password with bcrypt.
    - Returns a JWT access token.
    """
    users = get_collection(USERS_COLLECTION)

    # Check for existing user
    existing = await users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    # Create user document
    now = datetime.now(timezone.utc)
    user_doc = {
        "full_name": payload.full_name.strip(),
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "phone": None,
        "linkedin_url": None,
        "github_url": None,
        "portfolio_url": None,
        "outreach_objective": None,
        "custom_instructions": None,
        "resume_uploaded": False,
        "extracted_profile": None,
        "created_at": now,
        "updated_at": now,
    }

    result = await users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    logger.info("New user registered: %s (%s)", payload.email, user_id)

    # Create JWT
    token = create_access_token(user_id=user_id, email=payload.email.lower())

    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=payload.full_name.strip(),
            email=payload.email.lower(),
        ),
    )


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
async def login(payload: LoginRequest):
    """
    Authenticate a user and return a JWT access token.
    """
    users = get_collection(USERS_COLLECTION)

    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user["_id"])
    logger.info("User logged in: %s", payload.email)

    token = create_access_token(user_id=user_id, email=payload.email.lower())

    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=user["full_name"],
            email=user["email"],
        ),
    )

