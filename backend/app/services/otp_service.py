"""
SmartReach AI — Authentication OTP Service

Handles generation, storage, verification, and email delivery of 6-digit OTP codes
for two-factor login verification and password resets.
"""

import asyncio
import logging
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional, Tuple
from bson import ObjectId

from app.core.config import settings
from app.core.database import get_collection, USERS_COLLECTION
from app.services.email_dispatcher import send_single_email_sync

logger = logging.getLogger(__name__)

OTP_COLLECTION = "otp_codes"


def generate_otp(length: int = 6) -> str:
    """Generate a cryptographically secure numeric OTP."""
    # Generate random number between 100000 and 999999
    lower_bound = 10 ** (length - 1)
    upper_bound = (10 ** length) - 1
    return str(secrets.randbelow(upper_bound - lower_bound + 1) + lower_bound)


async def store_otp(
    email: str,
    otp: str,
    purpose: str,
    expires_in_minutes: int = 10,
) -> None:
    """
    Store or update an OTP code for a given email and purpose in MongoDB.
    """
    otp_col = get_collection(OTP_COLLECTION)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=expires_in_minutes)

    await otp_col.update_one(
        {"email": email.lower(), "purpose": purpose},
        {
            "$set": {
                "email": email.lower(),
                "otp": otp.strip(),
                "purpose": purpose,
                "expires_at": expires_at,
                "created_at": now,
            }
        },
        upsert=True,
    )
    logger.info("Stored OTP for %s [purpose: %s, expires in %dm]", email, purpose, expires_in_minutes)


async def verify_otp(email: str, otp: str, purpose: str) -> bool:
    """
    Verify if the provided OTP is valid and unexpired, then delete it upon success.
    """
    if not email or not otp:
        return False

    otp_col = get_collection(OTP_COLLECTION)
    now = datetime.now(timezone.utc)

    record = await otp_col.find_one({
        "email": email.lower(),
        "otp": otp.strip(),
        "purpose": purpose,
        "expires_at": {"$gt": now},
    })

    if record:
        # One-time use: delete immediately
        await otp_col.delete_one({"_id": record["_id"]})
        logger.info("OTP verified and consumed for %s [purpose: %s]", email, purpose)
        return True

    logger.warning("Invalid or expired OTP attempt for %s [purpose: %s]", email, purpose)
    return False


async def send_auth_otp_email(
    recipient_email: str,
    otp: str,
    purpose: str,
    user_name: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Deliver the OTP code to the recipient's email address.
    Uses user's configured SMTP settings or falls back gracefully to simulation/demo mode.
    """
    action_title = "Account Sign-In Verification" if purpose == "login" else "Password Reset Request"
    display_name = user_name or "SmartReach User"

    subject = f"Your SmartReach AI Verification Code: {otp}"

    body = f"""Hello {display_name},

Your 6-digit verification code for SmartReach AI ({action_title}) is:

    ======================
           {otp}
    ======================

This code is valid for 10 minutes.
If you did not request this verification code, please ignore this email or secure your account.

Best regards,
The SmartReach AI Team
"""

    # Look up user SMTP settings if available
    users_col = get_collection(USERS_COLLECTION)
    user_doc = await users_col.find_one({"email": recipient_email.lower()})
    smtp_settings = user_doc.get("smtp_settings", {}) if user_doc else {}

    # If no SMTP configured, use simulation mode
    if not smtp_settings or not smtp_settings.get("smtp_host") or not smtp_settings.get("smtp_user"):
        smtp_settings = {
            "simulation_mode": True,
            "sender_name": "SmartReach AI Security",
            "sender_email": "security@smartreach.ai",
        }

    # Dispatch email
    try:
        success, err = await asyncio.to_thread(
            send_single_email_sync,
            smtp_settings=smtp_settings,
            recipient_email=recipient_email,
            recipient_name=display_name,
            subject=subject,
            body=body,
        )
        if success:
            logger.info("OTP email successfully dispatched to %s", recipient_email)
            return True, None
        else:
            logger.warning("Failed to send OTP email to %s: %s", recipient_email, err)
            return False, err
    except Exception as e:
        logger.error("Exception sending OTP email to %s: %s", recipient_email, e)
        return False, str(e)
