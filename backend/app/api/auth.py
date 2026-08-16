"""
SmartReach AI — Authentication API

Endpoints for registration with Email OTP verification, direct login,
password recovery with separate OTP verification step, and token generation.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, status
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_collection, USERS_COLLECTION
from app.core.security import hash_password, verify_password, create_access_token
from app.schemas.auth import (
    RegisterRequest,
    RegisterSendOTPRequest,
    RegisterVerifyOTPRequest,
    LoginRequest,
    ForgotPasswordRequest,
    VerifyResetOTPRequest,
    ResetPasswordRequest,
    ResendOTPRequest,
    OTPActionResponse,
    TokenResponse,
    UserBasic,
)
from app.services.otp_service import (
    send_registration_otp,
    send_forgot_password_otp,
    verify_otp,
    check_otp_validity,
    store_otp,
    generate_otp,
)

logger = logging.getLogger(__name__)
router = APIRouter()


# --- Registration Flow (2-Step with Email OTP) ---

@router.post(
    "/register/send-otp",
    response_model=OTPActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Step 1: Initiate registration and send email OTP",
)
async def register_send_otp(payload: RegisterSendOTPRequest):
    """
    Validate registration input and email a 6-digit OTP directly to the user's inbox.
    """
    users = get_collection(USERS_COLLECTION)
    clean_email = payload.email.lower().strip()

    # Check if user already exists
    existing = await users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists. Please sign in instead.",
        )

    # Hash password securely upfront
    pw_hash = hash_password(payload.password)

    # Generate and dispatch OTP email
    otp, email_sent, err = await send_registration_otp(
        email=clean_email,
        full_name=payload.full_name.strip(),
        password_hash=pw_hash,
    )

    logger.info("Registration OTP dispatched for %s (email sent: %s)", clean_email, email_sent)

    return OTPActionResponse(
        message="A 6-digit verification code has been sent to your email inbox.",
        email=clean_email,
        email_sent=email_sent,
    )


@router.post(
    "/register/verify-otp",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Step 2: Verify registration OTP and activate account",
)
async def register_verify_otp(payload: RegisterVerifyOTPRequest):
    """
    Verify the 6-digit OTP code received in email and create the user account in MongoDB.
    """
    clean_email = payload.email.lower().strip()
    is_valid, metadata = await verify_otp(clean_email, payload.otp, purpose="register")

    if not is_valid or not metadata:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code. Please check your email or request a new code.",
        )

    users = get_collection(USERS_COLLECTION)

    # Prevent race condition
    existing = await users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    full_name = metadata.get("full_name", "User")
    pw_hash = metadata.get("password_hash")

    user_doc = {
        "full_name": full_name,
        "email": clean_email,
        "password_hash": pw_hash,
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

    logger.info("New verified user created: %s (%s)", clean_email, user_id)

    token = create_access_token(user_id=user_id, email=clean_email)

    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=full_name,
            email=clean_email,
        ),
    )


# --- Direct Login Flow (No OTP on Sign In) ---

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password (Direct sign-in, no OTP)",
)
async def login(payload: LoginRequest):
    """
    Authenticate a user directly with email and password without OTP.
    """
    users = get_collection(USERS_COLLECTION)
    clean_email = payload.email.lower().strip()

    user = await users.find_one({"email": clean_email})
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user["_id"])
    logger.info("User logged in directly: %s", clean_email)

    token = create_access_token(user_id=user_id, email=clean_email)

    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=user.get("full_name", "User"),
            email=user.get("email", clean_email),
        ),
    )


# --- Forgot Password Flow (Separate Verify OTP -> Set New Password) ---

@router.post(
    "/forgot-password",
    response_model=OTPActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Forgot Password Step 1: Send recovery OTP to email",
)
async def forgot_password(payload: ForgotPasswordRequest):
    """
    Find user and email a 6-digit password reset OTP directly to their inbox.
    """
    clean_email = payload.email.lower().strip()
    users = get_collection(USERS_COLLECTION)
    user = await users.find_one({"email": clean_email})

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No account found with this email address.",
        )

    full_name = user.get("full_name", "User")
    otp, email_sent, err = await send_forgot_password_otp(
        email=clean_email,
        full_name=full_name,
    )

    logger.info("Password reset OTP sent to %s (email sent: %s)", clean_email, email_sent)

    return OTPActionResponse(
        message="A 6-digit recovery code has been sent to your email inbox.",
        email=clean_email,
        email_sent=email_sent,
    )


@router.post(
    "/verify-reset-otp",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Forgot Password Step 2: Validate OTP code before setting new password",
)
async def verify_reset_otp(payload: VerifyResetOTPRequest):
    """
    Check that the entered reset OTP is valid and not expired.
    """
    clean_email = payload.email.lower().strip()
    is_valid, _ = await check_otp_validity(clean_email, payload.otp, purpose="forgot_password")

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired recovery code. Please check your email or request a new code.",
        )

    return {
        "valid": True,
        "message": "Recovery code verified. Please set your new password.",
    }


@router.post(
    "/reset-password",
    response_model=dict,
    status_code=status.HTTP_200_OK,
    summary="Forgot Password Step 3: Set new password and consume OTP",
)
async def reset_password(payload: ResetPasswordRequest):
    """
    Verify reset OTP and save new bcrypt password in MongoDB.
    """
    clean_email = payload.email.lower().strip()
    is_valid, _ = await verify_otp(clean_email, payload.otp, purpose="forgot_password")

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset code. Please request a new recovery code.",
        )

    users = get_collection(USERS_COLLECTION)
    new_hash = hash_password(payload.new_password)
    now = datetime.now(timezone.utc)

    result = await users.update_one(
        {"email": clean_email},
        {"$set": {"password_hash": new_hash, "updated_at": now}},
    )

    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User account not found.",
        )

    logger.info("Password successfully reset for user: %s", clean_email)

    return {
        "message": "Password has been successfully reset. You can now log in with your new password.",
        "success": True,
    }


# --- Resend OTP Endpoint ---

@router.post(
    "/resend-otp",
    response_model=OTPActionResponse,
    status_code=status.HTTP_200_OK,
    summary="Resend verification or password reset OTP to email",
)
async def resend_otp(payload: ResendOTPRequest):
    """
    Resend a fresh OTP directly to the user's email.
    """
    clean_email = payload.email.lower().strip()
    otp_col = get_collection("otp_codes")
    users_col = get_collection(USERS_COLLECTION)

    if payload.purpose == "register":
        existing_otp = await otp_col.find_one({"email": clean_email, "purpose": "register"})
        full_name = existing_otp.get("metadata", {}).get("full_name", "User") if existing_otp else "User"
        pw_hash = existing_otp.get("metadata", {}).get("password_hash") if existing_otp else None

        if not pw_hash:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Registration session expired. Please fill in the sign up form again.",
            )

        otp, email_sent, err = await send_registration_otp(
            email=clean_email,
            full_name=full_name,
            password_hash=pw_hash,
        )
    else:  # forgot_password
        user = await users_col.find_one({"email": clean_email})
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No account found with this email address.",
            )
        full_name = user.get("full_name", "User")
        otp, email_sent, err = await send_forgot_password_otp(
            email=clean_email,
            full_name=full_name,
        )

    return OTPActionResponse(
        message="A fresh 6-digit code has been sent to your email inbox.",
        email=clean_email,
        email_sent=email_sent,
    )


# --- Legacy direct registration endpoint for backward compatibility ---

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Direct register (backward compatibility)",
)
async def direct_register(payload: RegisterRequest):
    """Legacy endpoint for direct registration without OTP."""
    users = get_collection(USERS_COLLECTION)
    clean_email = payload.email.lower().strip()

    existing = await users.find_one({"email": clean_email})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email already exists.",
        )

    now = datetime.now(timezone.utc)
    user_doc = {
        "full_name": payload.full_name.strip(),
        "email": clean_email,
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

    token = create_access_token(user_id=user_id, email=clean_email)
    return TokenResponse(
        access_token=token,
        user=UserBasic(
            id=user_id,
            full_name=payload.full_name.strip(),
            email=clean_email,
        ),
    )
