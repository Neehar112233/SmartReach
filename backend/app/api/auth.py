"""
SmartReach AI — Authentication API

Endpoints for user registration, 2FA OTP sign-in verification,
password recovery, and token issuance.
"""

import asyncio
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_collection, USERS_COLLECTION
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import (
    RegisterRequest,
    LoginRequest,
    LoginInitiateResponse,
    VerifyLoginOTPRequest,
    ForgotPasswordRequest,
    ResetPasswordRequest,
    ResendOTPRequest,
    MessageResponse,
    TokenResponse,
    UserBasic,
)
from app.services.otp_service import (
    generate_otp,
    store_otp,
    verify_otp,
    send_auth_otp_email,
)

logger = logging.getLogger(__name__)
router = APIRouter()


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
    response_model=LoginInitiateResponse,
    summary="Initiate login and send 6-digit OTP to user email",
)
async def login(payload: LoginRequest):
    """
    Step 1 of Login:
    - Verifies email and password.
    - Generates a 6-digit verification code (valid for 10 minutes).
    - Dispatches code to user's registered email address.
    - Returns confirmation requiring OTP submission.
    """
    users = get_collection(USERS_COLLECTION)

    user = await users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Generate 6-digit OTP
    otp = generate_otp(6)
    await store_otp(
        email=payload.email.lower(),
        otp=otp,
        purpose="login",
        expires_in_minutes=10,
    )

    # Send email in background task/thread
    asyncio.create_task(
        send_auth_otp_email(
            recipient_email=payload.email.lower(),
            otp=otp,
            purpose="login",
            user_name=user.get("full_name"),
        )
    )

    logger.info("Login OTP dispatched for user %s", payload.email)

    # Include dev_otp if in simulation/demo mode or debug mode
    dev_code = otp if (settings.DEMO_MODE or settings.DEBUG) else None

    return LoginInitiateResponse(
        require_otp=True,
        email=payload.email.lower(),
        message="A 6-digit verification code has been sent to your email address.",
        dev_otp=dev_code,
    )


@router.post(
    "/verify-login-otp",
    response_model=TokenResponse,
    summary="Verify 6-digit OTP and complete login",
)
async def verify_login_otp(payload: VerifyLoginOTPRequest):
    """
    Step 2 of Login:
    - Validates the 6-digit OTP submitted by the user.
    - Returns JWT access token upon successful verification.
    """
    is_valid = await verify_otp(
        email=payload.email.lower(),
        otp=payload.otp,
        purpose="login",
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please request a new one.",
        )

    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    user_id = str(user["_id"])
    logger.info("User successfully completed 2FA sign-in: %s", payload.email)

    token = create_access_token(user_id=user_id, email=payload.email.lower())

    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=user["full_name"],
            email=user["email"],
        ),
    )


@router.post(
    "/forgot-password",
    response_model=MessageResponse,
    summary="Request a password reset OTP",
)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Step 1 of Password Reset:
    - Checks if the user exists.
    - Generates a 6-digit reset code and sends it via email.
    """
    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": payload.email.lower()})

    if not user:
        # Generic response for security to avoid email enumeration
        return MessageResponse(
            message="If an account exists with this email, a 6-digit password reset code has been sent.",
            email=payload.email.lower(),
        )

    otp = generate_otp(6)
    await store_otp(
        email=payload.email.lower(),
        otp=otp,
        purpose="reset_password",
        expires_in_minutes=10,
    )

    asyncio.create_task(
        send_auth_otp_email(
            recipient_email=payload.email.lower(),
            otp=otp,
            purpose="reset_password",
            user_name=user.get("full_name"),
        )
    )

    logger.info("Password reset OTP dispatched for %s", payload.email)

    dev_code = otp if (settings.DEMO_MODE or settings.DEBUG) else None

    return MessageResponse(
        message="A 6-digit password reset code has been sent to your email.",
        email=payload.email.lower(),
        dev_otp=dev_code,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    summary="Verify reset OTP and update password",
)
async def reset_password(payload: ResetPasswordRequest):
    """
    Step 2 of Password Reset:
    - Verifies the 6-digit reset OTP.
    - Hashes and updates the user's new password in MongoDB.
    """
    is_valid = await verify_otp(
        email=payload.email.lower(),
        otp=payload.otp,
        purpose="reset_password",
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code. Please request a fresh code.",
        )

    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    new_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)

    await users.update_one(
        {"_id": user["_id"]},
        {"$set": {"password_hash": new_hash, "updated_at": now}},
    )

    logger.info("Password successfully reset for user %s", payload.email)

    return MessageResponse(
        message="Your password has been successfully reset. You can now sign in with your new password.",
        email=payload.email.lower(),
    )


@router.post(
    "/resend-otp",
    response_model=MessageResponse,
    summary="Resend verification OTP code",
)
async def resend_otp(payload: ResendOTPRequest):
    """
    Resends a fresh 6-digit OTP code for login or password reset.
    """
    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": payload.email.lower()})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email.",
        )

    purpose = payload.purpose if payload.purpose in ["login", "reset_password"] else "login"
    otp = generate_otp(6)
    await store_otp(
        email=payload.email.lower(),
        otp=otp,
        purpose=purpose,
        expires_in_minutes=10,
    )

    asyncio.create_task(
        send_auth_otp_email(
            recipient_email=payload.email.lower(),
            otp=otp,
            purpose=purpose,
            user_name=user.get("full_name"),
        )
    )

    dev_code = otp if (settings.DEMO_MODE or settings.DEBUG) else None

    return MessageResponse(
        message="A new 6-digit verification code has been sent to your email.",
        email=payload.email.lower(),
        dev_otp=dev_code,
    )

