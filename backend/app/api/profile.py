"""
SmartReach AI — Profile API

Endpoints for viewing and updating the authenticated user's profile.
"""

import logging
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from bson import ObjectId

from app.api.deps import get_current_user
from app.core.database import get_collection, USERS_COLLECTION
from app.schemas.user import UserProfileResponse, UserProfileUpdate

logger = logging.getLogger(__name__)
router = APIRouter()


def _user_to_response(user: dict) -> UserProfileResponse:
    """Convert a MongoDB user document to a response schema."""
    return UserProfileResponse(
        id=user.get("id") or str(user["_id"]),
        full_name=user["full_name"],
        email=user["email"],
        phone=user.get("phone"),
        linkedin_url=user.get("linkedin_url"),
        github_url=user.get("github_url"),
        portfolio_url=user.get("portfolio_url"),
        outreach_objective=user.get("outreach_objective"),
        custom_instructions=user.get("custom_instructions"),
        resume_uploaded=user.get("resume_uploaded", False),
        created_at=user["created_at"],
        updated_at=user["updated_at"],
    )


@router.get(
    "",
    response_model=UserProfileResponse,
    summary="Get current user's profile",
)
async def get_profile(current_user: dict = Depends(get_current_user)):
    """Return the authenticated user's full profile."""
    return _user_to_response(current_user)


@router.put(
    "",
    response_model=UserProfileResponse,
    summary="Update current user's profile",
)
async def update_profile(
    payload: UserProfileUpdate,
    current_user: dict = Depends(get_current_user),
):
    """
    Update the authenticated user's profile fields.
    Only provided (non-None) fields are updated.
    """
    users = get_collection(USERS_COLLECTION)

    # Build update document from only the fields that were explicitly set
    update_data = payload.model_dump(exclude_none=True)

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update.",
        )

    update_data["updated_at"] = datetime.now(timezone.utc)

    result = await users.update_one(
        {"_id": ObjectId(current_user["id"])},
        {"$set": update_data},
    )

    if result.modified_count == 0 and result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )

    # Fetch the updated document
    updated_user = await users.find_one({"_id": ObjectId(current_user["id"])})
    updated_user["id"] = str(updated_user["_id"])

    logger.info("Profile updated: %s", current_user["email"])
    return _user_to_response(updated_user)
