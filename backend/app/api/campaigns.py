"""
SmartReach AI — Campaigns API Endpoints

Handles campaign lifecycle: create, list, inspect, update, delete, and trigger AI batch email generation.
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, status

from app.api.deps import get_current_user
from app.core.database import get_collection, USERS_COLLECTION
from app.schemas.campaign import (
    CampaignCreate,
    CampaignUpdate,
    CampaignResponse,
    CampaignListResponse,
)
from app.schemas.email import BatchGenerateResponse, GeneratedEmailResponse
from app.services.email_generator import generate_single_email

logger = logging.getLogger(__name__)
router = APIRouter()

CAMPAIGNS_COLLECTION = "campaigns"
EMAILS_COLLECTION = "emails"
CONTACTS_COLLECTION = "contacts"


def _format_campaign(doc: dict) -> CampaignResponse:
    return CampaignResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        name=doc.get("name", "Untitled Campaign"),
        target_role=doc.get("target_role", "Software Engineer"),
        tone=doc.get("tone", "professional"),
        custom_instructions=doc.get("custom_instructions"),
        subject_line_style=doc.get("subject_line_style", "direct"),
        status=doc.get("status", "draft"),
        total_contacts=doc.get("total_contacts", 0),
        emails_generated=doc.get("emails_generated", 0),
        emails_approved=doc.get("emails_approved", 0),
        emails_sent=doc.get("emails_sent", 0),
        emails_failed=doc.get("emails_failed", 0),
        contact_ids=doc.get("contact_ids", []),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at"),
    )


@router.post(
    "",
    response_model=CampaignResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new outreach campaign",
)
async def create_campaign(
    payload: CampaignCreate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    contacts_col = get_collection(CONTACTS_COLLECTION)

    contact_ids = payload.contact_ids
    if not contact_ids:
        # Default: select all valid contacts for this user
        cursor = contacts_col.find({"user_id": user_id, "is_valid": True}, {"_id": 1})
        valid_docs = await cursor.to_list(length=5000)
        contact_ids = [str(d["_id"]) for d in valid_docs]

    now = datetime.now(timezone.utc)
    doc = {
        "user_id": user_id,
        "name": payload.name.strip(),
        "target_role": payload.target_role.strip(),
        "tone": payload.tone,
        "custom_instructions": payload.custom_instructions.strip() if payload.custom_instructions else None,
        "subject_line_style": payload.subject_line_style or "direct",
        "status": "draft",
        "total_contacts": len(contact_ids),
        "emails_generated": 0,
        "emails_approved": 0,
        "emails_sent": 0,
        "emails_failed": 0,
        "contact_ids": contact_ids,
        "created_at": now,
        "updated_at": now,
    }

    result = await campaigns_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    # Update contacts to link with this campaign
    if contact_ids:
        obj_ids = []
        for cid in contact_ids:
            try:
                obj_ids.append(ObjectId(cid))
            except Exception:
                pass
        if obj_ids:
            await contacts_col.update_many(
                {"_id": {"$in": obj_ids}},
                {"$set": {"campaign_id": str(result.inserted_id)}},
            )

    return _format_campaign(doc)


@router.get(
    "",
    response_model=CampaignListResponse,
    summary="List all campaigns for the current user",
)
async def list_campaigns(
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    emails_col = get_collection(EMAILS_COLLECTION)

    cursor = campaigns_col.find({"user_id": user_id}).sort("created_at", -1)
    docs = await cursor.to_list(length=100)

    # Sync real-time counts from emails collection for each campaign
    formatted = []
    for doc in docs:
        c_id = str(doc["_id"])
        total_gen = await emails_col.count_documents({"campaign_id": c_id})
        total_app = await emails_col.count_documents({"campaign_id": c_id, "status": "approved"})
        total_sent = await emails_col.count_documents({"campaign_id": c_id, "status": "sent"})
        total_fail = await emails_col.count_documents({"campaign_id": c_id, "status": "failed"})

        doc["emails_generated"] = total_gen
        doc["emails_approved"] = total_app
        doc["emails_sent"] = total_sent
        doc["emails_failed"] = total_fail

        formatted.append(_format_campaign(doc))

    return CampaignListResponse(campaigns=formatted, total=len(formatted))


@router.get(
    "/{campaign_id}",
    response_model=CampaignResponse,
    summary="Get campaign details by ID",
)
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    emails_col = get_collection(EMAILS_COLLECTION)

    try:
        obj_id = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaign ID.")

    doc = await campaigns_col.find_one({"_id": obj_id, "user_id": user_id})
    if not doc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # Update real-time counts
    c_id = str(doc["_id"])
    doc["emails_generated"] = await emails_col.count_documents({"campaign_id": c_id})
    doc["emails_approved"] = await emails_col.count_documents({"campaign_id": c_id, "status": "approved"})
    doc["emails_sent"] = await emails_col.count_documents({"campaign_id": c_id, "status": "sent"})
    doc["emails_failed"] = await emails_col.count_documents({"campaign_id": c_id, "status": "failed"})

    return _format_campaign(doc)


@router.put(
    "/{campaign_id}",
    response_model=CampaignResponse,
    summary="Update campaign configuration",
)
async def update_campaign(
    campaign_id: str,
    payload: CampaignUpdate,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)

    try:
        obj_id = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaign ID.")

    existing = await campaigns_col.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name.strip()
    if payload.target_role is not None:
        update_fields["target_role"] = payload.target_role.strip()
    if payload.tone is not None:
        update_fields["tone"] = payload.tone
    if payload.custom_instructions is not None:
        update_fields["custom_instructions"] = payload.custom_instructions.strip()
    if payload.subject_line_style is not None:
        update_fields["subject_line_style"] = payload.subject_line_style
    if payload.status is not None:
        update_fields["status"] = payload.status

    update_fields["updated_at"] = datetime.now(timezone.utc)

    await campaigns_col.update_one({"_id": obj_id}, {"$set": update_fields})
    updated = await campaigns_col.find_one({"_id": obj_id})
    return _format_campaign(updated)


@router.delete(
    "/{campaign_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete campaign and its generated emails",
)
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    emails_col = get_collection(EMAILS_COLLECTION)

    try:
        obj_id = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaign ID.")

    result = await campaigns_col.delete_one({"_id": obj_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # Cascade delete generated emails
    await emails_col.delete_many({"campaign_id": campaign_id, "user_id": user_id})

    return {"message": "Campaign and associated emails deleted successfully."}


@router.post(
    "/{campaign_id}/generate",
    response_model=BatchGenerateResponse,
    summary="Batch generate personalized emails for all contacts in this campaign",
)
async def generate_campaign_emails(
    campaign_id: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Trigger AI cold email generation for all contacts associated with this campaign.
    """
    user_id = current_user["id"]
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)
    contacts_col = get_collection(CONTACTS_COLLECTION)
    emails_col = get_collection(EMAILS_COLLECTION)
    users_col = get_collection(USERS_COLLECTION)

    try:
        obj_id = ObjectId(campaign_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid campaign ID.")

    campaign = await campaigns_col.find_one({"_id": obj_id, "user_id": user_id})
    if not campaign:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Campaign not found.")

    # Get user profile
    user_doc = await users_col.find_one({"_id": ObjectId(user_id)})
    profile_data = user_doc.get("extracted_profile", {}) if user_doc else {}
    if not profile_data:
        profile_data = {
            "full_name": user_doc.get("full_name", "Candidate"),
            "skills": user_doc.get("skills", []),
        }

    # Fetch contacts
    contact_ids = campaign.get("contact_ids", [])
    if not contact_ids:
        # Grab all valid contacts for this user
        cursor = contacts_col.find({"user_id": user_id, "is_valid": True})
        contacts = await cursor.to_list(length=5000)
    else:
        obj_cids = []
        for cid in contact_ids:
            try:
                obj_cids.append(ObjectId(cid))
            except Exception:
                pass
        cursor = contacts_col.find({"_id": {"$in": obj_cids}})
        contacts = await cursor.to_list(length=5000)

    if not contacts:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No valid contacts found for this campaign. Please upload contacts first.",
        )

    # Set campaign status to generating
    await campaigns_col.update_one({"_id": obj_id}, {"$set": {"status": "generating"}})

    # Concurrency-controlled generation
    sem = asyncio.Semaphore(5)
    generated_emails = []
    failed_count = 0

    async def _process_contact(contact: dict):
        nonlocal failed_count
        async with sem:
            c_id = str(contact["_id"])
            try:
                subject, body = await generate_single_email(
                    candidate_profile=profile_data,
                    recipient={
                        "name": contact.get("name", "Recruiter"),
                        "company": contact.get("company", "Company"),
                        "title": contact.get("title", "HR Manager"),
                    },
                    target_role=campaign.get("target_role", "Software Engineer"),
                    tone=campaign.get("tone", "professional"),
                    custom_instructions=campaign.get("custom_instructions"),
                    subject_style=campaign.get("subject_line_style", "direct"),
                )

                now = datetime.now(timezone.utc)
                email_doc = {
                    "campaign_id": campaign_id,
                    "user_id": user_id,
                    "contact_id": c_id,
                    "recipient_name": contact.get("name", "Recruiter"),
                    "recipient_email": contact.get("email", ""),
                    "recipient_company": contact.get("company", ""),
                    "recipient_title": contact.get("title", "HR / Recruiter"),
                    "subject": subject,
                    "body": body,
                    "status": "draft",
                    "error_message": None,
                    "generated_at": now,
                    "updated_at": now,
                }

                # Upsert into emails collection
                res = await emails_col.update_one(
                    {"campaign_id": campaign_id, "contact_id": c_id},
                    {"$set": email_doc},
                    upsert=True,
                )
                if res.upserted_id:
                    email_doc["_id"] = res.upserted_id
                else:
                    existing_email = await emails_col.find_one({"campaign_id": campaign_id, "contact_id": c_id})
                    email_doc["_id"] = existing_email["_id"]

                generated_emails.append(email_doc)
            except Exception as e:
                logger.error("Failed to generate email for contact %s: %s", c_id, e)
                failed_count += 1

    await asyncio.gather(*[_process_contact(c) for c in contacts])

    # Update campaign status
    await campaigns_col.update_one(
        {"_id": obj_id},
        {
            "$set": {
                "status": "ready",
                "emails_generated": len(generated_emails),
                "total_contacts": len(contacts),
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    formatted_emails = [
        GeneratedEmailResponse(
            id=str(e["_id"]),
            campaign_id=str(e["campaign_id"]),
            user_id=str(e["user_id"]),
            contact_id=str(e["contact_id"]),
            recipient_name=e["recipient_name"],
            recipient_email=e["recipient_email"],
            recipient_company=e["recipient_company"],
            recipient_title=e["recipient_title"],
            subject=e["subject"],
            body=e["body"],
            status=e["status"],
            error_message=e.get("error_message"),
            generated_at=e["generated_at"],
            updated_at=e.get("updated_at"),
        )
        for e in generated_emails
    ]

    return BatchGenerateResponse(
        message=f"Generated {len(formatted_emails)} personalized emails.",
        campaign_id=campaign_id,
        generated_count=len(formatted_emails),
        failed_count=failed_count,
        emails=formatted_emails,
    )
