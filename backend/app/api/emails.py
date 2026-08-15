"""
SmartReach AI — Generated Emails API Endpoints

Handles generated cold email inspection, rich editing, status updates (Approve/Reject), regeneration, and bulk actions.
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user
from app.core.database import get_collection, USERS_COLLECTION
from app.schemas.email import (
    EmailUpdate,
    GeneratedEmailResponse,
    EmailListResponse,
)
from app.services.email_generator import generate_single_email

logger = logging.getLogger(__name__)
router = APIRouter()

EMAILS_COLLECTION = "emails"
CAMPAIGNS_COLLECTION = "campaigns"
CONTACTS_COLLECTION = "contacts"


def _format_email(doc: dict) -> GeneratedEmailResponse:
    return GeneratedEmailResponse(
        id=str(doc["_id"]),
        campaign_id=str(doc["campaign_id"]),
        user_id=str(doc["user_id"]),
        contact_id=str(doc["contact_id"]),
        recipient_name=doc.get("recipient_name", "Recruiter"),
        recipient_email=doc.get("recipient_email", ""),
        recipient_company=doc.get("recipient_company", "Company"),
        recipient_title=doc.get("recipient_title", "HR / Recruiter"),
        subject=doc.get("subject", ""),
        body=doc.get("body", ""),
        status=doc.get("status", "draft"),
        error_message=doc.get("error_message"),
        generated_at=doc.get("generated_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at"),
    )


@router.get(
    "/campaign/{campaign_id}",
    response_model=EmailListResponse,
    summary="Get all generated emails for a campaign",
)
async def list_campaign_emails(
    campaign_id: str,
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (draft, approved, rejected, sent)"),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    emails_col = get_collection(EMAILS_COLLECTION)

    query = {"user_id": user_id, "campaign_id": campaign_id}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()

    cursor = emails_col.find(query).sort("generated_at", 1)
    docs = await cursor.to_list(length=1000)

    # Compute status counts for this campaign
    all_cursor = emails_col.find({"user_id": user_id, "campaign_id": campaign_id})
    all_docs = await all_cursor.to_list(length=1000)
    counts = {
        "all": len(all_docs),
        "draft": sum(1 for d in all_docs if d.get("status") == "draft"),
        "approved": sum(1 for d in all_docs if d.get("status") == "approved"),
        "rejected": sum(1 for d in all_docs if d.get("status") == "rejected"),
        "sent": sum(1 for d in all_docs if d.get("status") == "sent"),
        "failed": sum(1 for d in all_docs if d.get("status") == "failed"),
    }

    return EmailListResponse(
        emails=[_format_email(d) for d in docs],
        total=len(docs),
        counts=counts,
    )


@router.get(
    "/{email_id}",
    response_model=GeneratedEmailResponse,
    summary="Get single email details",
)
async def get_email(
    email_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    emails_col = get_collection(EMAILS_COLLECTION)

    try:
        obj_id = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email ID.")

    doc = await emails_col.find_one({"_id": obj_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    return _format_email(doc)


@router.put(
    "/{email_id}",
    response_model=GeneratedEmailResponse,
    summary="Update email subject/body or approve/reject",
)
async def update_email(
    email_id: str,
    payload: EmailUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    emails_col = get_collection(EMAILS_COLLECTION)

    try:
        obj_id = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email ID.")

    existing = await emails_col.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    update_fields = {}
    if payload.subject is not None:
        update_fields["subject"] = payload.subject.strip()
    if payload.body is not None:
        update_fields["body"] = payload.body.strip()
    if payload.status is not None:
        valid_statuses = ["draft", "approved", "rejected", "sent", "failed"]
        if payload.status not in valid_statuses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid status. Must be one of {valid_statuses}")
        update_fields["status"] = payload.status

    update_fields["updated_at"] = datetime.now(timezone.utc)

    await emails_col.update_one({"_id": obj_id}, {"$set": update_fields})
    updated = await emails_col.find_one({"_id": obj_id})
    return _format_email(updated)


@router.post(
    "/{email_id}/regenerate",
    response_model=GeneratedEmailResponse,
    summary="Regenerate a single personalized email using AI",
)
async def regenerate_single_email_endpoint(
    email_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    emails_col = get_collection(EMAILS_COLLECTION)
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    users_col = get_collection(USERS_COLLECTION)

    try:
        obj_id = ObjectId(email_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid email ID.")

    email_doc = await emails_col.find_one({"_id": obj_id, "user_id": user_id})
    if not email_doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Email not found.")

    campaign = await campaigns_col.find_one({"_id": ObjectId(email_doc["campaign_id"])})
    target_role = campaign.get("target_role", "Software Engineer") if campaign else "Software Engineer"
    tone = campaign.get("tone", "professional") if campaign else "professional"
    custom_instructions = campaign.get("custom_instructions") if campaign else None
    subject_style = campaign.get("subject_line_style", "direct") if campaign else "direct"

    user_doc = await users_col.find_one({"_id": ObjectId(user_id)})
    profile_data = user_doc.get("extracted_profile", {}) if user_doc else {}

    subject, body = await generate_single_email(
        candidate_profile=profile_data,
        recipient={
            "name": email_doc.get("recipient_name", "Recruiter"),
            "company": email_doc.get("recipient_company", "Company"),
            "title": email_doc.get("recipient_title", "HR / Recruiter"),
        },
        target_role=target_role,
        tone=tone,
        custom_instructions=custom_instructions,
        subject_style=subject_style,
    )

    update_fields = {
        "subject": subject,
        "body": body,
        "status": "draft",
        "updated_at": datetime.now(timezone.utc),
    }

    await emails_col.update_one({"_id": obj_id}, {"$set": update_fields})
    updated = await emails_col.find_one({"_id": obj_id})
    return _format_email(updated)


@router.post(
    "/campaign/{campaign_id}/approve-all",
    summary="Bulk approve all draft emails in a campaign",
)
async def approve_all_emails(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    emails_col = get_collection(EMAILS_COLLECTION)

    result = await emails_col.update_many(
        {"user_id": user_id, "campaign_id": campaign_id, "status": "draft"},
        {"$set": {"status": "approved", "updated_at": datetime.now(timezone.utc)}},
    )

    return {
        "message": f"Successfully approved {result.modified_count} emails.",
        "approved_count": result.modified_count,
    }
