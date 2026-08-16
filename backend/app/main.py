"""
SmartReach AI — FastAPI Application

Main application factory with lifespan management, CORS, and router includes.
"""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import connect_to_mongodb, close_mongodb_connection, get_collection, USERS_COLLECTION
from app.api.health import router as health_router
from app.api.auth import router as auth_router
from app.api.profile import router as profile_router
from app.api.resume import router as resume_router
from app.api.contacts import router as contacts_router
from app.api.campaigns import router as campaigns_router
from app.api.emails import router as emails_router
from app.api.settings import router as settings_router
from app.api.dispatch import router as dispatch_router
from app.api.history import router as history_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: connect to DB on startup, disconnect on shutdown."""
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    logger.info("Demo mode: %s", "ON" if settings.DEMO_MODE else "OFF")

    # Startup
    try:
        await connect_to_mongodb()
        # Create indexes
        await _create_indexes()
    except Exception as e:
        logger.warning("MongoDB connection failed: %s — running in degraded mode", e)

    yield

    # Shutdown
    await close_mongodb_connection()
    logger.info("Application shutdown complete.")


async def _create_indexes():
    """Create MongoDB indexes for optimal query performance."""
    try:
        users = get_collection(USERS_COLLECTION)
        await users.create_index("email", unique=True)
        
        contacts = get_collection("contacts")
        await contacts.create_index([("user_id", 1), ("email", 1)])
        await contacts.create_index([("user_id", 1), ("is_valid", 1)])

        campaigns = get_collection("campaigns")
        await campaigns.create_index([("user_id", 1), ("created_at", -1)])

        emails = get_collection("emails")
        await emails.create_index([("campaign_id", 1), ("status", 1)])
        await emails.create_index([("user_id", 1), ("status", 1)])

        send_logs = get_collection("send_logs")
        await send_logs.create_index([("user_id", 1), ("sent_at", -1)])
        await send_logs.create_index([("campaign_id", 1), ("status", 1)])

        otp_codes = get_collection("otp_codes")
        await otp_codes.create_index([("email", 1), ("purpose", 1)])
        await otp_codes.create_index("expires_at", expireAfterSeconds=0)
        logger.info("MongoDB indexes created.")
    except Exception as e:
        logger.warning("Failed to create indexes: %s", e)


# --- Create FastAPI App ---

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="AI-Powered Personalized HR Email Automation Platform",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
    lifespan=lifespan,
)

# --- CORS ---

allowed_origins = [origin.strip() for origin in settings.FRONTEND_URL.split(",") if origin.strip()]

# In development or default mode, also allow common localhost variants
if settings.DEBUG or "localhost" in settings.FRONTEND_URL:
    allowed_origins.extend([
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ])

app.add_middleware(
    CORSMiddleware,
    allow_origins=list(set(allowed_origins)),
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Routers ---

app.include_router(health_router, prefix="/api", tags=["Health"])
app.include_router(auth_router, prefix="/api/auth", tags=["Authentication"])
app.include_router(profile_router, prefix="/api/profile", tags=["Profile"])
app.include_router(resume_router, prefix="/api/resume", tags=["Resume"])
app.include_router(contacts_router, prefix="/api/contacts", tags=["Contacts"])
app.include_router(campaigns_router, prefix="/api/campaigns", tags=["Campaigns"])
app.include_router(emails_router, prefix="/api/emails", tags=["Emails"])
app.include_router(settings_router, prefix="/api/settings", tags=["Settings"])
app.include_router(dispatch_router, prefix="/api/dispatch", tags=["Dispatch"])
app.include_router(history_router, prefix="/api/history", tags=["History"])


@app.get("/", include_in_schema=False)
async def root():
    """Root redirect to API docs."""
    return {
        "application": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "docs": "/api/docs",
    }
