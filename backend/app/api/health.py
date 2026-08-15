"""
SmartReach AI — Health Check Endpoint

Provides system status including database connectivity and configuration info.
"""

from fastapi import APIRouter
from app.core.config import settings
from app.core.database import check_database_health

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Health check endpoint.

    Returns the current status of the application, database connectivity,
    version, and whether demo mode is active.
    """
    db_healthy = await check_database_health()

    return {
        "status": "healthy" if db_healthy else "degraded",
        "version": settings.APP_VERSION,
        "database": "connected" if db_healthy else "disconnected",
        "demoMode": settings.DEMO_MODE,
    }
