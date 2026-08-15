"""
SmartReach AI — Dispatcher API Endpoints

Triggers background email delivery and provides real-time progress polling.
"""

import logging
from bson import ObjectId
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_collection
from app.services.email_dispatcher import (
    dispatch_campaign_batch,
    DISPATCH_JOBS,
)

logger = logging.getLogger(__name__)
router = APIRouter()

CAMPAIGNS_COLLECTION = "campaigns"
EMAILS_COLLECTION = "emails"


@router.post(
    "/campaign/{campaign_id}",
    summary="Dispatch approved emails for a campaign",
)
async def dispatch_campaign(
    campaign_id: str,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    emails_col = get_collection(EMAILS_COLLECTION)

    try:
        camp_obj_id = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaign ID.")

    campaign = await campaigns_col.find_one({"_id": camp_obj_id, "user_id": user_id})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # Count approved emails
    approved_count = await emails_col.count_documents(
        {"campaign_id": campaign_id, "user_id": user_id, "status": "approved"}
    )
    if approved_count == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No approved emails found in this campaign. Please approve emails before dispatching.",
        )

    # Initialize job state
    DISPATCH_JOBS[campaign_id] = {
        "total": approved_count,
        "sent": 0,
        "failed": 0,
        "current_recipient": "Starting delivery queue...",
        "status": "active",
    }

    # Queue background task
    background_tasks.add_task(dispatch_campaign_batch, user_id=user_id, campaign_id=campaign_id)

    return {
        "message": f"Dispatch initiated for {approved_count} approved emails.",
        "campaign_id": campaign_id,
        "approved_count": approved_count,
    }


@router.get(
    "/campaign/{campaign_id}/status",
    summary="Get real-time dispatch progress",
)
async def get_dispatch_status(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    
    # Check in-memory active job tracker first
    if campaign_id in DISPATCH_JOBS:
        return DISPATCH_JOBS[campaign_id]

    # Fallback to database query
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    try:
        camp = await campaigns_col.find_one({"_id": ObjectId(campaign_id), "user_id": user_id})
    except Exception:
        camp = None

    if not camp:
        return {
            "total": 0,
            "sent": 0,
            "failed": 0,
            "current_recipient": "",
            "status": "idle",
        }

    return {
        "total": camp.get("emails_approved", 0) + camp.get("emails_sent", 0),
        "sent": camp.get("emails_sent", 0),
        "failed": camp.get("emails_failed", 0),
        "current_recipient": "",
        "status": camp.get("status", "idle"),
    }
