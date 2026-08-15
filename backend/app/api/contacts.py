"""
SmartReach AI — HR Contacts API Endpoints

Handles CSV/Excel upload, contact listing with search & filters, inline updates, manual additions, and deletions.
"""

import logging
from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import Response

from app.api.deps import get_current_user
from app.core.database import get_collection
from app.schemas.contact import (
    ContactCreate,
    ContactUpdate,
    ContactResponse,
    ContactUploadStats,
    ContactUploadResponse,
    ContactListResponse,
)
from app.services.contact_parser import parse_contacts_data, validate_email

logger = logging.getLogger(__name__)
router = APIRouter()

CONTACTS_COLLECTION = "contacts"


def _format_contact(doc: dict) -> ContactResponse:
    """Format MongoDB contact document to ContactResponse schema."""
    return ContactResponse(
        id=str(doc["_id"]),
        user_id=str(doc["user_id"]),
        campaign_id=str(doc.get("campaign_id")) if doc.get("campaign_id") else None,
        sno=doc.get("sno", 1),
        name=doc.get("name", "Unnamed Contact"),
        email=doc.get("email", ""),
        company=doc.get("company", "Unknown"),
        title=doc.get("title", "HR / Recruiter"),
        location=doc.get("location"),
        linkedin_url=doc.get("linkedin_url"),
        is_valid=doc.get("is_valid", True),
        validation_errors=doc.get("validation_errors", []),
        email_status=doc.get("email_status", "draft"),
        created_at=doc.get("created_at", datetime.now(timezone.utc)),
        updated_at=doc.get("updated_at"),
    )


@router.post(
    "/upload",
    response_model=ContactUploadResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload and validate a CSV or Excel contacts file",
)
async def upload_contacts(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload CSV or Excel file with HR contacts.
    Parses headers, validates email formats, identifies duplicates, and saves to MongoDB.
    """
    filename = file.filename or "contacts.csv"
    fn_lower = filename.lower()
    if not (fn_lower.endswith(".csv") or fn_lower.endswith(".xlsx") or fn_lower.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please upload a valid .csv or .xlsx file.",
        )

    file_bytes = await file.read()
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    # Fetch existing contact emails for this user to check duplicates
    cursor = contacts_col.find({"user_id": user_id}, {"email": 1})
    existing_docs = await cursor.to_list(length=10000)
    existing_emails = {d["email"].lower() for d in existing_docs if "email" in d}

    # Parse and validate
    try:
        parsed_items, stats = parse_contacts_data(
            file_bytes=file_bytes,
            filename=filename,
            existing_emails=existing_emails,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=str(e))

    now = datetime.now(timezone.utc)
    docs_to_insert = []
    for item in parsed_items:
        doc = {
            **item,
            "user_id": user_id,
            "campaign_id": None,
            "created_at": now,
            "updated_at": now,
        }
        docs_to_insert.append(doc)

    if docs_to_insert:
        insert_result = await contacts_col.insert_many(docs_to_insert)
        for i, inserted_id in enumerate(insert_result.inserted_ids):
            docs_to_insert[i]["_id"] = inserted_id

    formatted = [_format_contact(d) for d in docs_to_insert]

    return ContactUploadResponse(
        message=f"Successfully processed {stats['total_rows']} contacts ({stats['valid_count']} valid, {stats['invalid_count']} with issues).",
        filename=filename,
        stats=ContactUploadStats(**stats),
        contacts=formatted,
    )


@router.get(
    "",
    response_model=ContactListResponse,
    summary="List contacts for the current user with pagination and search",
)
async def list_contacts(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    search: Optional[str] = Query(None, description="Search name, email, company, or title"),
    valid_only: Optional[bool] = Query(None, description="Filter only valid contacts"),
    campaign_id: Optional[str] = Query(None, description="Filter by campaign"),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve contacts with optional filtering by validity, campaign, or search term."""
    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    filter_query: dict = {"user_id": user_id}

    if valid_only is not None:
        filter_query["is_valid"] = valid_only

    if campaign_id:
        filter_query["campaign_id"] = campaign_id

    if search and search.strip():
        regex = {"$regex": search.strip(), "$options": "i"}
        filter_query["$or"] = [
            {"name": regex},
            {"email": regex},
            {"company": regex},
            {"title": regex},
        ]

    total = await contacts_col.count_documents(filter_query)
    skip = (page - 1) * limit

    cursor = contacts_col.find(filter_query).sort("sno", 1).skip(skip).limit(limit)
    docs = await cursor.to_list(length=limit)

    # Compute overall stats for this user
    all_cursor = contacts_col.find({"user_id": user_id})
    all_docs = await all_cursor.to_list(length=10000)

    total_rows = len(all_docs)
    valid_count = sum(1 for d in all_docs if d.get("is_valid", True))
    invalid_count = total_rows - valid_count
    duplicates_count = sum(
        1 for d in all_docs if any("duplicate" in err.lower() for err in d.get("validation_errors", []))
    )

    stats = ContactUploadStats(
        total_rows=total_rows,
        valid_count=valid_count,
        invalid_count=invalid_count,
        duplicates_count=duplicates_count,
    )

    return ContactListResponse(
        contacts=[_format_contact(d) for d in docs],
        total=total,
        page=page,
        limit=limit,
        stats=stats,
    )


@router.post(
    "",
    response_model=ContactResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually add a single HR contact",
)
async def create_contact(
    payload: ContactCreate,
    current_user: dict = Depends(get_current_user),
):
    """Add a new contact manually and run validation checks."""
    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    errors = []
    email_clean = payload.email.lower().strip()
    is_valid_email, email_err = validate_email(email_clean)
    if not is_valid_email:
        errors.append(email_err or "Invalid email format")
    else:
        existing = await contacts_col.find_one({"user_id": user_id, "email": email_clean})
        if existing:
            errors.append("Duplicate: Contact with this email already exists")

    count = await contacts_col.count_documents({"user_id": user_id})
    now = datetime.now(timezone.utc)

    doc = {
        "user_id": user_id,
        "campaign_id": payload.campaign_id,
        "sno": count + 1,
        "name": payload.name.strip(),
        "email": email_clean,
        "company": payload.company.strip(),
        "title": payload.title.strip() if payload.title else "HR / Recruiter",
        "location": payload.location.strip() if payload.location else None,
        "linkedin_url": payload.linkedin_url.strip() if payload.linkedin_url else None,
        "is_valid": len(errors) == 0,
        "validation_errors": errors,
        "email_status": "draft",
        "created_at": now,
        "updated_at": now,
    }

    result = await contacts_col.insert_one(doc)
    doc["_id"] = result.inserted_id

    return _format_contact(doc)


@router.put(
    "/{contact_id}",
    response_model=ContactResponse,
    summary="Update or fix an existing contact inline",
)
async def update_contact(
    contact_id: str,
    payload: ContactUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Update contact information and automatically re-validate errors."""
    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    try:
        obj_id = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid contact ID.")

    existing = await contacts_col.find_one({"_id": obj_id, "user_id": user_id})
    if not existing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found.")

    update_fields = {}
    if payload.name is not None:
        update_fields["name"] = payload.name.strip()
    if payload.company is not None:
        update_fields["company"] = payload.company.strip()
    if payload.title is not None:
        update_fields["title"] = payload.title.strip()
    if payload.location is not None:
        update_fields["location"] = payload.location.strip()
    if payload.linkedin_url is not None:
        update_fields["linkedin_url"] = payload.linkedin_url.strip()

    # If email is modified or re-checked
    target_email = payload.email.lower().strip() if payload.email is not None else existing.get("email", "")
    update_fields["email"] = target_email

    # Re-validate
    errors = []
    is_valid_email, email_err = validate_email(target_email)
    if not is_valid_email:
        errors.append(email_err or "Invalid email format")

    update_fields["is_valid"] = len(errors) == 0
    update_fields["validation_errors"] = errors
    update_fields["updated_at"] = datetime.now(timezone.utc)

    await contacts_col.update_one({"_id": obj_id}, {"$set": update_fields})
    updated_doc = await contacts_col.find_one({"_id": obj_id})

    return _format_contact(updated_doc)


@router.delete(
    "/{contact_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a single contact",
)
async def delete_contact(
    contact_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a contact by its ID."""
    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    try:
        obj_id = ObjectId(contact_id)
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid contact ID.")

    result = await contacts_col.delete_one({"_id": obj_id, "user_id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact not found.")

    return {"message": "Contact deleted successfully."}


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Clear all contacts for the current user",
)
async def clear_contacts(
    current_user: dict = Depends(get_current_user),
):
    """Delete all contacts uploaded by the current user."""
    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)
    result = await contacts_col.delete_many({"user_id": user_id})
    return {"message": f"Deleted {result.deleted_count} contacts."}


@router.get(
    "/sample-template",
    summary="Download a sample CSV contact template",
)
async def download_sample_template():
    """Return a clean, ready-to-use CSV template for contacts."""
    csv_content = (
        "Name,Email,Title,Company,Location,LinkedIn\n"
        "Sarah Jenkins,sarah.jenkins@techcorp.com,Technical Recruiter,TechCorp Solutions,Bangalore,https://linkedin.com/in/sarahjenkins\n"
        "Alex Rivera,alex.rivera@innovatelabs.io,Lead HR Manager,Innovate Labs,Remote,https://linkedin.com/in/alexrivera\n"
        "Priya Patel,priya.patel@globaltech.com,Head of Talent Acquisition,GlobalTech Systems,Hyderabad,https://linkedin.com/in/priyapatel\n"
        "David Chen,david.chen@nextgenai.co,Engineering Recruiting Lead,NextGen AI,San Francisco,https://linkedin.com/in/davidchen\n"
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartreach_sample_contacts.csv"},
    )


@router.get(
    "/export",
    summary="Export all contacts for the current user as CSV",
)
async def export_contacts_csv(
    valid_only: Optional[bool] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    """Export the current user's contact list as a downloadable CSV."""
    import csv
    import io

    user_id = current_user["id"]
    contacts_col = get_collection(CONTACTS_COLLECTION)

    query = {"user_id": user_id}
    if valid_only is not None:
        query["is_valid"] = valid_only

    docs = await contacts_col.find(query).sort("sno", 1).to_list(length=10000)

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["SNo", "Name", "Email", "Title", "Company", "Location", "LinkedIn", "Status", "Valid", "Errors"])

    for d in docs:
        errors_str = "; ".join(d.get("validation_errors", []))
        writer.writerow([
            d.get("sno", ""),
            d.get("name", ""),
            d.get("email", ""),
            d.get("title", ""),
            d.get("company", ""),
            d.get("location", ""),
            d.get("linkedin_url", ""),
            d.get("email_status", "draft"),
            "Yes" if d.get("is_valid", True) else "No",
            errors_str,
        ])

    csv_data = output.getvalue()
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=smartreach_contacts_export.csv"},
    )
