"""
SmartReach AI — Resume API Endpoints

Handles resume upload, PDF text extraction, AI profile enrichment, and profile fine-tuning.
"""

import os
import re
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from bson import ObjectId

from app.api.deps import get_current_user
from app.core.database import get_collection, USERS_COLLECTION
from app.schemas.resume import (
    ExtractedProfile,
    ResumeUploadResponse,
    ResumeUpdateRequest,
)
from app.services.resume_parser import extract_text_from_pdf
from app.services.ai_service import enrich_resume_with_ai

logger = logging.getLogger(__name__)
router = APIRouter()

# Storage directory for resumes
UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post(
    "/upload",
    response_model=ResumeUploadResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload and parse a PDF resume",
)
async def upload_resume(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    """
    Upload a PDF resume.
    1. Validates file format and size.
    2. Extracts clean text with PyMuPDF.
    3. Runs AI & heuristic enrichment for skills, experience, education, and projects.
    4. Persists the structured profile to MongoDB.
    """
    filename = file.filename or "resume.pdf"
    if not filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only PDF files are supported at this time.",
        )

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File size exceeds the 10MB limit.",
        )
    if len(file_bytes) == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The uploaded file is empty.",
        )

    # 1. Save file locally
    safe_filename = re.sub(r'[^a-zA-Z0-9_.-]', '_', filename)
    user_id = current_user["id"]
    save_path = UPLOAD_DIR / f"{user_id}_{safe_filename}"
    try:
        with open(save_path, "wb") as f:
            f.write(file_bytes)
    except Exception as e:
        logger.error("Failed to write resume file: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not save file to disk.",
        )

    # 2. Extract text with PyMuPDF
    try:
        raw_text = extract_text_from_pdf(file_bytes)
        if not raw_text or len(raw_text.strip()) < 20:
            raise ValueError("The PDF appears to be empty or contains only unscanned images.")
    except Exception as e:
        logger.error("PyMuPDF extraction failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to read text from resume: {str(e)}",
        )

    # 3. Enrich with AI (or heuristic fallback)
    extracted_profile = await enrich_resume_with_ai(raw_text)

    # 4. Update MongoDB user record
    users = get_collection(USERS_COLLECTION)
    now = datetime.now(timezone.utc)

    update_payload = {
        "resume_uploaded": True,
        "resume_filename": filename,
        "resume_path": str(save_path),
        "extracted_profile": extracted_profile.model_dump(),
        "raw_resume_text": raw_text,
        "updated_at": now,
    }

    # Auto-fill missing user profile fields if extracted
    if not current_user.get("phone") and extracted_profile.phone:
        update_payload["phone"] = extracted_profile.phone
    if not current_user.get("linkedin_url") and extracted_profile.linkedin_url:
        update_payload["linkedin_url"] = extracted_profile.linkedin_url
    if not current_user.get("github_url") and extracted_profile.github_url:
        update_payload["github_url"] = extracted_profile.github_url
    if not current_user.get("portfolio_url") and extracted_profile.portfolio_url:
        update_payload["portfolio_url"] = extracted_profile.portfolio_url

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {"$set": update_payload},
    )

    logger.info("Resume successfully uploaded and parsed for user: %s", current_user["email"])

    return ResumeUploadResponse(
        message="Resume uploaded and parsed successfully.",
        filename=filename,
        resume_uploaded=True,
        extracted_profile=extracted_profile,
    )


@router.get(
    "",
    response_model=ExtractedProfile,
    summary="Get user's extracted resume profile",
)
async def get_resume_profile(current_user: dict = Depends(get_current_user)):
    """Retrieve the current user's structured resume profile."""
    extracted = current_user.get("extracted_profile")
    if not extracted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No resume profile found for this user.",
        )
    return ExtractedProfile(**extracted)


@router.put(
    "",
    response_model=ExtractedProfile,
    summary="Update user's extracted profile data",
)
async def update_resume_profile(
    payload: ResumeUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save manual edits made to skills, projects, experience, or education."""
    users = get_collection(USERS_COLLECTION)
    user_id = current_user["id"]
    now = datetime.now(timezone.utc)

    profile_dict = payload.extracted_profile.model_dump()

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "extracted_profile": profile_dict,
                "updated_at": now,
            }
        },
    )

    logger.info("Extracted resume profile updated by user: %s", current_user["email"])
    return payload.extracted_profile


@router.delete(
    "",
    status_code=status.HTTP_200_OK,
    summary="Delete uploaded resume and extracted data",
)
async def delete_resume(current_user: dict = Depends(get_current_user)):
    """Reset resume upload state and delete stored file."""
    users = get_collection(USERS_COLLECTION)
    user_id = current_user["id"]
    resume_path = current_user.get("resume_path")

    if resume_path and os.path.exists(resume_path):
        try:
            os.remove(resume_path)
        except Exception as e:
            logger.warning("Could not delete file %s: %s", resume_path, e)

    await users.update_one(
        {"_id": ObjectId(user_id)},
        {
            "$set": {
                "resume_uploaded": False,
                "resume_filename": None,
                "resume_path": None,
                "extracted_profile": None,
                "raw_resume_text": None,
                "updated_at": datetime.now(timezone.utc),
            }
        },
    )

    return {"message": "Resume data removed successfully."}
