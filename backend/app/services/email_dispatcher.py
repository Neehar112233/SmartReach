"""
SmartReach AI — Email Dispatcher & SMTP Delivery Service

Handles live SMTP testing, email composition, rate-limited queuing with jitter,
and audit logging into send_logs collection.
"""

import asyncio
import email.utils
import logging
import os
import random
import smtplib
import time
from datetime import datetime, timezone
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, Optional, Tuple
from bson import ObjectId

from app.core.database import get_collection

logger = logging.getLogger(__name__)

# In-memory dispatch jobs tracking for real-time progress polling
DISPATCH_JOBS: Dict[str, dict] = {}


def test_smtp_connection(
    host: str,
    port: int,
    user: str,
    password: str,
    use_tls: bool = True,
    use_ssl: bool = False,
    simulation_mode: bool = False,
) -> Tuple[bool, str, Optional[float]]:
    """
    Test connectivity and authentication with an SMTP server.
    """
    if simulation_mode:
        time.sleep(0.3)
        return True, "Sandbox Simulation Mode: Connection verified successfully.", 42.0

    if not host or not user or not password:
        return False, "Host, username, and password are required.", None

    start_time = time.perf_counter()
    server = None
    try:
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=10)
        else:
            server = smtplib.SMTP(host, port, timeout=10)
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()

        server.login(user, password)
        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)
        server.quit()
        return True, f"Successfully authenticated with {host}:{port}.", elapsed_ms

    except smtplib.SMTPAuthenticationError as e:
        logger.warning("SMTP auth failed for %s: %s", user, e)
        return False, f"Authentication failed: {e.smtp_error.decode('utf-8', errors='ignore') if hasattr(e, 'smtp_error') else str(e)}", None
    except smtplib.SMTPConnectError as e:
        return False, f"Could not connect to {host}:{port}: {e}", None
    except Exception as e:
        logger.warning("SMTP connection error: %s", e)
        return False, f"Connection failed: {str(e)}", None
    finally:
        if server:
            try:
                server.close()
            except Exception:
                pass


def send_single_email_sync(
    smtp_settings: dict,
    recipient_email: str,
    recipient_name: str,
    subject: str,
    body: str,
    attachment_path: Optional[str] = None,
    attachment_filename: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Synchronously compose and deliver a single email via SMTP with optional file attachment.
    """
    simulation_mode = smtp_settings.get("simulation_mode", False)
    if simulation_mode:
        time.sleep(0.4)
        return True, None

    host = smtp_settings.get("smtp_host")
    port = smtp_settings.get("smtp_port", 587)
    user = smtp_settings.get("smtp_user")
    password = smtp_settings.get("smtp_password")
    sender_name = smtp_settings.get("sender_name") or user
    sender_email = smtp_settings.get("sender_email") or user
    use_tls = smtp_settings.get("use_tls", True)
    use_ssl = smtp_settings.get("use_ssl", False)

    if not host or not user or not password:
        return False, "SMTP configuration incomplete (missing host, user, or password)."

    has_attachment = bool(attachment_path and os.path.isfile(attachment_path))

    if has_attachment:
        msg = MIMEMultipart("mixed")
        msg["Subject"] = subject
        msg["From"] = email.utils.formataddr((sender_name, sender_email))
        msg["To"] = email.utils.formataddr((recipient_name, recipient_email))
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid(domain=sender_email.split("@")[-1] if "@" in sender_email else "smartreach.ai")

        # Inner body
        part_text = MIMEText(body, "plain", "utf-8")
        msg.attach(part_text)

        # Attachment
        try:
            fname = attachment_filename or os.path.basename(attachment_path)
            with open(attachment_path, "rb") as f:
                file_bytes = f.read()
            att_part = MIMEApplication(file_bytes, Name=fname)
            att_part["Content-Disposition"] = f'attachment; filename="{fname}"'
            msg.attach(att_part)
            logger.info("Attached resume '%s' to email for %s", fname, recipient_email)
        except Exception as e:
            logger.warning("Could not attach file %s: %s", attachment_path, e)
    else:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = email.utils.formataddr((sender_name, sender_email))
        msg["To"] = email.utils.formataddr((recipient_name, recipient_email))
        msg["Date"] = email.utils.formatdate(localtime=True)
        msg["Message-ID"] = email.utils.make_msgid(domain=sender_email.split("@")[-1] if "@" in sender_email else "smartreach.ai")

        part_text = MIMEText(body, "plain", "utf-8")
        msg.attach(part_text)

    server = None
    try:
        if use_ssl:
            server = smtplib.SMTP_SSL(host, port, timeout=15)
        else:
            server = smtplib.SMTP(host, port, timeout=15)
            server.ehlo()
            if use_tls:
                server.starttls()
                server.ehlo()

        server.login(user, password)
        server.sendmail(sender_email, [recipient_email], msg.as_string())
        server.quit()
        return True, None
    except Exception as e:
        logger.error("Failed to send email to %s: %s", recipient_email, e)
        return False, str(e)
    finally:
        if server:
            try:
                server.close()
            except Exception:
                pass


async def dispatch_campaign_batch(user_id: str, campaign_id: str):
    """
    Background batch processor to dispatch all approved emails for a campaign.
    """
    campaigns_col = get_collection("campaigns")
    emails_col = get_collection("emails")
    contacts_col = get_collection("contacts")
    logs_col = get_collection("send_logs")
    users_col = get_collection("users")

    camp_obj_id = ObjectId(campaign_id)
    campaign = await campaigns_col.find_one({"_id": camp_obj_id, "user_id": user_id})
    if not campaign:
        logger.error("Campaign %s not found for dispatch", campaign_id)
        return

    # Fetch SMTP settings and profile details from user document
    user_doc = await users_col.find_one({"_id": ObjectId(user_id)})
    smtp_settings = user_doc.get("smtp_settings", {}) if user_doc else {}
    if not smtp_settings:
        # Default to safe simulation mode if not yet configured
        smtp_settings = {"simulation_mode": True, "delay_seconds": 2}

    # Check resume attachment preference and presence
    attach_resume_pref = smtp_settings.get("attach_resume", True)
    resume_path = user_doc.get("resume_path") if user_doc else None
    resume_filename = user_doc.get("resume_filename") or "Resume.pdf"
    
    actual_attachment_path = None
    actual_attachment_name = None
    if attach_resume_pref and resume_path and os.path.isfile(resume_path):
        actual_attachment_path = resume_path
        actual_attachment_name = resume_filename

    # Fetch approved emails
    cursor = emails_col.find({"campaign_id": campaign_id, "user_id": user_id, "status": "approved"})
    approved_emails = await cursor.to_list(length=1000)

    if not approved_emails:
        logger.info("No approved emails to dispatch for campaign %s", campaign_id)
        DISPATCH_JOBS[campaign_id] = {
            "total": 0,
            "sent": 0,
            "failed": 0,
            "status": "completed",
            "message": "No approved emails found.",
        }
        return

    # Mark campaign as sending
    await campaigns_col.update_one({"_id": camp_obj_id}, {"$set": {"status": "sending"}})

    total = len(approved_emails)
    sent_count = 0
    failed_count = 0

    DISPATCH_JOBS[campaign_id] = {
        "total": total,
        "sent": 0,
        "failed": 0,
        "current_recipient": "",
        "status": "active",
    }

    base_delay = smtp_settings.get("delay_seconds", 3)

    for idx, email_doc in enumerate(approved_emails):
        rec_name = email_doc.get("recipient_name", "Recruiter")
        rec_email = email_doc.get("recipient_email", "")
        subject = email_doc.get("subject", "")
        body = email_doc.get("body", "")

        DISPATCH_JOBS[campaign_id]["current_recipient"] = f"{rec_name} ({rec_email})"

        # Send email in thread pool to prevent blocking event loop
        success, err = await asyncio.to_thread(
            send_single_email_sync,
            smtp_settings=smtp_settings,
            recipient_email=rec_email,
            recipient_name=rec_name,
            subject=subject,
            body=body,
            attachment_path=actual_attachment_path,
            attachment_filename=actual_attachment_name,
        )

        now = datetime.now(timezone.utc)
        if success:
            sent_count += 1
            # Update email doc
            await emails_col.update_one(
                {"_id": email_doc["_id"]},
                {"$set": {"status": "sent", "updated_at": now}},
            )
            # Update contact doc
            if email_doc.get("contact_id"):
                try:
                    await contacts_col.update_one(
                        {"_id": ObjectId(email_doc["contact_id"])},
                        {"$set": {"email_status": "sent"}},
                    )
                except Exception:
                    pass

            # Log audit record
            log_doc = {
                "user_id": user_id,
                "campaign_id": campaign_id,
                "campaign_name": campaign.get("name", "Campaign"),
                "email_id": str(email_doc["_id"]),
                "contact_id": str(email_doc.get("contact_id", "")),
                "recipient_name": rec_name,
                "recipient_email": rec_email,
                "recipient_company": email_doc.get("recipient_company", ""),
                "recipient_title": email_doc.get("recipient_title", "HR"),
                "subject": subject,
                "body_snippet": body[:120] + "...",
                "status": "delivered" if not smtp_settings.get("simulation_mode") else "simulated",
                "resume_attached": bool(actual_attachment_path),
                "resume_filename": actual_attachment_name if actual_attachment_path else None,
                "error_message": None,
                "sent_at": now,
            }
            await logs_col.insert_one(log_doc)
        else:
            failed_count += 1
            await emails_col.update_one(
                {"_id": email_doc["_id"]},
                {"$set": {"status": "failed", "error_message": err, "updated_at": now}},
            )
            log_doc = {
                "user_id": user_id,
                "campaign_id": campaign_id,
                "campaign_name": campaign.get("name", "Campaign"),
                "email_id": str(email_doc["_id"]),
                "contact_id": str(email_doc.get("contact_id", "")),
                "recipient_name": rec_name,
                "recipient_email": rec_email,
                "recipient_company": email_doc.get("recipient_company", ""),
                "recipient_title": email_doc.get("recipient_title", "HR"),
                "subject": subject,
                "body_snippet": body[:120] + "...",
                "status": "failed",
                "resume_attached": bool(actual_attachment_path),
                "resume_filename": actual_attachment_name if actual_attachment_path else None,
                "error_message": err,
                "sent_at": now,
            }
            await logs_col.insert_one(log_doc)

        DISPATCH_JOBS[campaign_id]["sent"] = sent_count
        DISPATCH_JOBS[campaign_id]["failed"] = failed_count

        # Apply humanized delay with jitter between emails (except last one)
        if idx < total - 1:
            jitter = random.uniform(0.2, 0.8)
            await asyncio.sleep(base_delay + jitter)

    # Mark campaign as completed
    await campaigns_col.update_one(
        {"_id": camp_obj_id},
        {
            "$set": {
                "status": "completed",
                "emails_sent": sent_count,
                "emails_failed": failed_count,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    DISPATCH_JOBS[campaign_id]["status"] = "completed"
    DISPATCH_JOBS[campaign_id]["current_recipient"] = ""
    logger.info("Finished dispatching campaign %s: %d sent, %d failed", campaign_id, sent_count, failed_count)
