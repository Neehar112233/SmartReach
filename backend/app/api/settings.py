"""
SmartReach AI — Settings & SMTP Configuration API Endpoints
"""

import logging
from datetime import datetime, timezone
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_collection, USERS_COLLECTION
from app.schemas.settings import (
    SMTPSettingsUpdate,
    SMTPSettingsResponse,
    SMTPTestRequest,
    SMTPTestResponse,
)
from app.services.email_dispatcher import test_smtp_connection

logger = logging.getLogger(__name__)
router = APIRouter()


def _format_smtp_response(settings_dict: dict) -> SMTPSettingsResponse:
    has_pwd = bool(settings_dict.get("smtp_password"))
    is_conf = bool(settings_dict.get("smtp_host") and settings_dict.get("smtp_user")) or settings_dict.get("simulation_mode", False)
    
    return SMTPSettingsResponse(
        provider=settings_dict.get("provider", "custom"),
        smtp_host=settings_dict.get("smtp_host", "smtp.gmail.com"),
        smtp_port=settings_dict.get("smtp_port", 587),
        smtp_user=settings_dict.get("smtp_user", ""),
        sender_name=settings_dict.get("sender_name", ""),
        sender_email=settings_dict.get("sender_email", ""),
        use_tls=settings_dict.get("use_tls", True),
        use_ssl=settings_dict.get("use_ssl", False),
        daily_limit=settings_dict.get("daily_limit", 50),
        delay_seconds=settings_dict.get("delay_seconds", 3),
        simulation_mode=settings_dict.get("simulation_mode", False),
        attach_resume=settings_dict.get("attach_resume", True),
        is_configured=is_conf,
        has_password=has_pwd,
        connection_status=settings_dict.get("connection_status", "untested"),
        last_tested_at=settings_dict.get("last_tested_at"),
        updated_at=settings_dict.get("updated_at"),
    )


@router.get(
    "/smtp",
    response_model=SMTPSettingsResponse,
    summary="Get user SMTP and dispatch settings",
)
async def get_smtp_settings(
    current_user: dict = Depends(get_current_user),
):
    users_col = get_collection(USERS_COLLECTION)
    user_doc = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    smtp_settings = user_doc.get("smtp_settings", {}) if user_doc else {}
    return _format_smtp_response(smtp_settings)


@router.put(
    "/smtp",
    response_model=SMTPSettingsResponse,
    summary="Update SMTP configuration",
)
async def update_smtp_settings(
    payload: SMTPSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    users_col = get_collection(USERS_COLLECTION)
    user_doc = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    existing = user_doc.get("smtp_settings", {}) if user_doc else {}

    now = datetime.now(timezone.utc)
    new_settings = {
        "provider": payload.provider,
        "smtp_host": payload.smtp_host.strip(),
        "smtp_port": payload.smtp_port,
        "smtp_user": payload.smtp_user.strip(),
        "sender_name": payload.sender_name.strip(),
        "sender_email": payload.sender_email.strip(),
        "use_tls": payload.use_tls,
        "use_ssl": payload.use_ssl,
        "daily_limit": payload.daily_limit,
        "delay_seconds": payload.delay_seconds,
        "simulation_mode": payload.simulation_mode,
        "attach_resume": payload.attach_resume,
        "connection_status": existing.get("connection_status", "untested"),
        "last_tested_at": existing.get("last_tested_at"),
        "updated_at": now,
    }

    # Only update password if provided
    if payload.smtp_password is not None and payload.smtp_password.strip():
        new_settings["smtp_password"] = payload.smtp_password.strip()
    elif "smtp_password" in existing:
        new_settings["smtp_password"] = existing["smtp_password"]

    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"smtp_settings": new_settings}},
    )

    return _format_smtp_response(new_settings)


@router.post(
    "/smtp/test",
    response_model=SMTPTestResponse,
    summary="Test SMTP connection live",
)
async def test_smtp(
    payload: SMTPTestRequest,
    current_user: dict = Depends(get_current_user),
):
    users_col = get_collection(USERS_COLLECTION)
    user_doc = await users_col.find_one({"_id": ObjectId(current_user["id"])})
    existing = user_doc.get("smtp_settings", {}) if user_doc else {}

    # Merge payload with existing settings
    host = payload.smtp_host or existing.get("smtp_host", "")
    port = payload.smtp_port or existing.get("smtp_port", 587)
    user = payload.smtp_user or existing.get("smtp_user", "")
    password = payload.smtp_password or existing.get("smtp_password", "")
    use_tls = payload.use_tls if payload.use_tls is not None else existing.get("use_tls", True)
    use_ssl = payload.use_ssl if payload.use_ssl is not None else existing.get("use_ssl", False)
    simulation_mode = (
        payload.simulation_mode
        if payload.simulation_mode is not None
        else existing.get("simulation_mode", False)
    )

    success, msg, latency = test_smtp_connection(
        host=host,
        port=port,
        user=user,
        password=password,
        use_tls=use_tls,
        use_ssl=use_ssl,
        simulation_mode=simulation_mode,
    )

    # Record connection status in database
    now = datetime.now(timezone.utc)
    status_str = "connected" if success else "failed"
    await users_col.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": {"smtp_settings.connection_status": status_str, "smtp_settings.last_tested_at": now}},
    )

    return SMTPTestResponse(
        success=success,
        message=msg,
        latency_ms=latency,
    )
