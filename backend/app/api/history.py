"""
SmartReach AI — Outreach History & Send Logs API Endpoints
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status

from app.api.deps import get_current_user
from app.core.database import get_collection
from app.schemas.history import (
    SendLogResponse,
    SendLogListResponse,
    HistoryStatsResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter()

LOGS_COLLECTION = "send_logs"
CAMPAIGNS_COLLECTION = "campaigns"


def _format_log(doc: dict) -> SendLogResponse:
    return SendLogResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        campaign_id=str(doc.get("campaign_id", "")),
        campaign_name=doc.get("campaign_name", "Campaign"),
        email_id=str(doc.get("email_id", "")),
        contact_id=str(doc.get("contact_id", "")),
        recipient_name=doc.get("recipient_name", "Recruiter"),
        recipient_email=doc.get("recipient_email", ""),
        recipient_company=doc.get("recipient_company", "Company"),
        recipient_title=doc.get("recipient_title", "HR / Recruiter"),
        subject=doc.get("subject", ""),
        body_snippet=doc.get("body_snippet", ""),
        status=doc.get("status", "sent"),
        error_message=doc.get("error_message"),
        sent_at=doc.get("sent_at", datetime.now(timezone.utc)),
    )


@router.get(
    "",
    response_model=SendLogListResponse,
    summary="List outreach history send logs with search and filters",
)
async def list_history_logs(
    status_filter: Optional[str] = Query(None, alias="status"),
    search: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=5000),
    skip: int = Query(0, ge=0),
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    logs_col = get_collection(LOGS_COLLECTION)

    query = {"user_id": user_id}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()

    if search and search.strip():
        s = search.strip()
        query["$or"] = [
            {"recipient_name": {"$regex": s, "$options": "i"}},
            {"recipient_email": {"$regex": s, "$options": "i"}},
            {"recipient_company": {"$regex": s, "$options": "i"}},
            {"subject": {"$regex": s, "$options": "i"}},
            {"campaign_name": {"$regex": s, "$options": "i"}},
        ]

    total = await logs_col.count_documents(query)
    cursor = logs_col.find(query).sort("sent_at", -1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    return SendLogListResponse(
        logs=[_format_log(d) for d in docs],
        total=total,
    )


@router.get(
    "/stats",
    response_model=HistoryStatsResponse,
    summary="Get aggregated outreach delivery statistics",
)
async def get_history_stats(
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    logs_col = get_collection(LOGS_COLLECTION)
    campaigns_col = get_collection(CAMPAIGNS_COLLECTION)

    all_logs = await logs_col.find({"user_id": user_id}).to_list(length=20000)
    total_campaigns = await campaigns_col.count_documents({"user_id": user_id})

    total_sent = len(all_logs)
    total_delivered = sum(1 for d in all_logs if d.get("status") in ["delivered", "simulated", "sent"])
    total_failed = sum(1 for d in all_logs if d.get("status") == "failed")

    return HistoryStatsResponse(
        total_sent=total_sent,
        total_delivered=total_delivered,
        total_failed=total_failed,
        total_campaigns=total_campaigns,
    )


@router.delete(
    "",
    summary="Clear outreach history logs",
)
async def clear_history_logs(
    current_user: dict = Depends(get_current_user),
):
    user_id = current_user["id"]
    logs_col = get_collection(LOGS_COLLECTION)

    result = await logs_col.delete_many({"user_id": user_id})
    return {"message": f"Cleared {result.deleted_count} history logs."}


@router.get(
    "/export",
    summary="Export outreach history logs as CSV",
)
async def export_history_csv(
    status_filter: Optional[str] = Query(None, alias="status"),
    current_user: dict = Depends(get_current_user),
):
    """Export delivery logs to a downloadable CSV file."""
    import csv
    import io
    from fastapi.responses import Response

    user_id = current_user["id"]
    logs_col = get_collection(LOGS_COLLECTION)

    query = {"user_id": user_id}
    if status_filter and status_filter.lower() != "all":
        query["status"] = status_filter.lower()

    docs = await logs_col.find(query).sort("sent_at", -1).to_list(length=10000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Recipient Name",
        "Recipient Email",
        "Title",
        "Company",
        "Campaign",
        "Subject",
        "Status",
        "Error Message",
        "Sent At",
    ])

    for d in docs:
        sent_at_str = d.get("sent_at", "")
        if isinstance(sent_at_str, datetime):
            sent_at_str = sent_at_str.isoformat()

        writer.writerow([
            d.get("recipient_name", ""),
            d.get("recipient_email", ""),
            d.get("recipient_title", ""),
            d.get("recipient_company", ""),
            d.get("campaign_name", ""),
            d.get("subject", ""),
            d.get("status", "sent"),
            d.get("error_message") or "",
            sent_at_str,
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartreach_outreach_history.csv"},
    )
