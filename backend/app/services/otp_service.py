"""
SmartReach AI — OTP & System Email Service

Manages 6-digit OTP generation, persistence with TTL in MongoDB,
and system-level SMTP email delivery for Registration and Password Resets.
"""

import asyncio
import email.utils
import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional, Tuple

from app.core.config import settings
from app.core.database import get_collection

logger = logging.getLogger(__name__)

OTP_COLLECTION = "otp_codes"


def generate_otp() -> str:
    """Generate a cryptographically secure 6-digit numeric OTP."""
    return f"{secrets.randbelow(900000) + 100000}"


def send_system_email_sync(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    text_content: str,
    html_content: str,
) -> Tuple[bool, Optional[str]]:
    """
    Synchronously compose and deliver a system transactional email via SMTP.
    """
    host = settings.SYSTEM_SMTP_HOST
    port = settings.SYSTEM_SMTP_PORT
    user = settings.SYSTEM_SMTP_USER
    password = settings.SYSTEM_SMTP_PASSWORD
    sender_email = settings.SYSTEM_SMTP_SENDER_EMAIL or user
    sender_name = settings.SYSTEM_SMTP_SENDER_NAME

    if not host or not user or not password:
        logger.warning("System SMTP credentials not configured. Email to %s skipped.", recipient_email)
        return False, "System SMTP is not configured on the server."

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = email.utils.formataddr((sender_name, sender_email))
    msg["To"] = email.utils.formataddr((recipient_name, recipient_email))
    msg["Date"] = email.utils.formatdate(localtime=True)
    domain = sender_email.split("@")[-1] if "@" in sender_email else "smartreach.ai"
    msg["Message-ID"] = email.utils.make_msgid(domain=domain)

    # Attach text and html alternatives
    part_text = MIMEText(text_content, "plain", "utf-8")
    part_html = MIMEText(html_content, "html", "utf-8")
    msg.attach(part_text)
    msg.attach(part_html)

    server = None
    try:
        if settings.SYSTEM_SMTP_USE_SSL:
            server = smtplib.SMTP_SSL(host, port, timeout=12)
        else:
            server = smtplib.SMTP(host, port, timeout=12)
            server.ehlo()
            if settings.SYSTEM_SMTP_USE_TLS:
                server.starttls()
                server.ehlo()

        server.login(user, password)
        server.sendmail(sender_email, [recipient_email], msg.as_string())
        server.quit()
        logger.info("System email successfully sent to %s [%s]", recipient_email, subject)
        return True, None
    except Exception as e:
        logger.error("Failed to send system email to %s: %s", recipient_email, e)
        return False, str(e)
    finally:
        if server:
            try:
                server.close()
            except Exception:
                pass


async def send_system_email(
    recipient_email: str,
    recipient_name: str,
    subject: str,
    text_content: str,
    html_content: str,
) -> Tuple[bool, Optional[str]]:
    """Asynchronous wrapper for system SMTP email delivery."""
    return await asyncio.to_thread(
        send_system_email_sync,
        recipient_email=recipient_email,
        recipient_name=recipient_name,
        subject=subject,
        text_content=text_content,
        html_content=html_content,
    )


def _render_email_template(title: str, greeting: str, description: str, otp: str, footnote: str) -> Tuple[str, str]:
    """Generate both plain text and rich HTML versions of transactional OTP emails."""
    plain_text = f"""{title}

{greeting},

{description}

Verification Code: {otp}

(This code is valid for {settings.OTP_EXPIRY_MINUTES} minutes. Do not share it with anyone.)

{footnote}

Best regards,
The SmartReach AI Team
"""

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 15px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background: linear-gradient(180deg, #1e293b 0%, #0f172a 100%); border: 1px solid #334155; border-radius: 16px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4); padding: 36px 28px; text-align: left;">
          <!-- Logo & Brand Header -->
          <tr>
            <td style="padding-bottom: 24px; text-align: center; border-bottom: 1px solid #334155;">
              <div style="display: inline-block; background: #4f46e5; border-radius: 10px; padding: 8px 14px; color: #ffffff; font-weight: 800; font-size: 18px; letter-spacing: -0.5px;">
                ⚡ SmartReach <span style="color: #a5b4fc;">AI</span>
              </div>
            </td>
          </tr>

          <!-- Heading -->
          <tr>
            <td style="padding-top: 28px;">
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #ffffff; letter-spacing: -0.5px; text-align: center;">{title}</h1>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #94a3b8; text-align: center;">{greeting}</p>
              <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 22px; color: #cbd5e1; text-align: center;">{description}</p>
            </td>
          </tr>

          <!-- OTP Box -->
          <tr>
            <td align="center" style="padding: 10px 0 26px 0;">
              <div style="display: inline-block; background: #090d16; border: 1.5px dashed #6366f1; border-radius: 12px; padding: 16px 36px; text-align: center;">
                <span style="font-family: 'Courier New', Courier, monospace; font-size: 34px; font-weight: 800; letter-spacing: 8px; color: #818cf8;">{otp}</span>
              </div>
              <p style="margin: 12px 0 0 0; font-size: 12px; color: #94a3b8;">Valid for <strong>{settings.OTP_EXPIRY_MINUTES} minutes</strong>. Please do not share this code.</p>
            </td>
          </tr>

          <!-- Footnote & Security -->
          <tr>
            <td style="border-top: 1px solid #334155; padding-top: 20px;">
              <p style="margin: 0 0 8px 0; font-size: 12px; line-height: 18px; color: #64748b; text-align: center;">{footnote}</p>
              <p style="margin: 0; font-size: 12px; color: #475569; text-align: center;">© 2026 SmartReach AI. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""
    return plain_text, html


async def store_otp(
    email: str,
    otp: str,
    purpose: str,
    metadata: Optional[dict] = None,
) -> None:
    """Save OTP record with expiry in MongoDB."""
    col = get_collection(OTP_COLLECTION)
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)

    # Invalidate previous unconsumed OTPs for this email and purpose
    await col.delete_many({"email": email.lower(), "purpose": purpose})

    doc = {
        "email": email.lower(),
        "otp": otp.strip(),
        "purpose": purpose,
        "metadata": metadata or {},
        "created_at": now,
        "expires_at": expires_at,
    }
    await col.insert_one(doc)


async def verify_otp(email: str, otp: str, purpose: str) -> Tuple[bool, Optional[dict]]:
    """
    Validate OTP against MongoDB records.
    Returns (True, metadata) if valid, or (False, None).
    Consumes OTP on successful validation.
    """
    col = get_collection(OTP_COLLECTION)
    now = datetime.now(timezone.utc)

    record = await col.find_one({
        "email": email.lower(),
        "otp": otp.strip(),
        "purpose": purpose,
        "expires_at": {"$gt": now},
    })

    if not record:
        return False, None

    # Consume OTP so it cannot be re-used
    await col.delete_one({"_id": record["_id"]})
    return True, record.get("metadata", {})


async def send_registration_otp(
    email: str,
    full_name: str,
    password_hash: str,
) -> Tuple[str, bool, Optional[str]]:
    """
    Generate and dispatch registration verification OTP email.
    Stores metadata so the user account can be created upon OTP confirmation.
    """
    otp = generate_otp()
    await store_otp(
        email=email,
        otp=otp,
        purpose="register",
        metadata={"full_name": full_name, "password_hash": password_hash},
    )

    title = "Verify Your SmartReach AI Account"
    greeting = f"Hello {full_name},"
    description = "Thank you for creating your account. Please enter the 6-digit verification code below to activate your SmartReach AI workspace."
    footnote = "If you didn't initiate this registration, you can safely disregard this message."

    plain_text, html = _render_email_template(title, greeting, description, otp, footnote)
    success, err = await send_system_email(
        recipient_email=email,
        recipient_name=full_name,
        subject=f"{otp} is your SmartReach AI verification code",
        text_content=plain_text,
        html_content=html,
    )

    return otp, success, err


async def send_forgot_password_otp(
    email: str,
    full_name: str,
) -> Tuple[str, bool, Optional[str]]:
    """
    Generate and dispatch password reset OTP email.
    """
    otp = generate_otp()
    await store_otp(
        email=email,
        otp=otp,
        purpose="forgot_password",
        metadata={"email": email.lower()},
    )

    title = "Reset Your SmartReach AI Password"
    greeting = f"Hello {full_name},"
    description = "We received a request to reset your password. Use the 6-digit security code below to set a new password."
    footnote = "If you did not request a password reset, please ignore this email or contact support if you suspect unauthorized activity."

    plain_text, html = _render_email_template(title, greeting, description, otp, footnote)
    success, err = await send_system_email(
        recipient_email=email,
        recipient_name=full_name,
        subject=f"{otp} is your SmartReach AI password reset code",
        text_content=plain_text,
        html_content=html,
    )

    return otp, success, err
