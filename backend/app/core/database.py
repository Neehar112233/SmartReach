"""
SmartReach AI — MongoDB Database Connection

Uses Motor (async MongoDB driver) with FastAPI lifespan events.
"""

import logging
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level references (set during app lifespan)
_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


async def connect_to_mongodb() -> None:
    """Initialize the MongoDB connection pool."""
    global _client, _database
    try:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
        )
        _database = _client[settings.DATABASE_NAME]
        # Verify the connection
        await _client.admin.command("ping")
        logger.info(
            "Connected to MongoDB: %s (db: %s)",
            settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else settings.MONGODB_URI,
            settings.DATABASE_NAME,
        )
    except Exception as e:
        logger.error("Failed to connect to MongoDB: %s", e)
        _client = None
        _database = None
        raise


async def close_mongodb_connection() -> None:
    """Close the MongoDB connection pool."""
    global _client, _database
    if _client:
        _client.close()
        logger.info("MongoDB connection closed.")
    _client = None
    _database = None


def get_database() -> AsyncIOMotorDatabase:
    """Get the database instance. Raises if not connected."""
    if _database is None:
        raise RuntimeError(
            "Database is not initialized. Ensure the application lifespan started correctly."
        )
    return _database


async def check_database_health() -> bool:
    """Check if the database connection is healthy."""
    if _client is None:
        return False
    try:
        await _client.admin.command("ping")
        return True
    except Exception:
        return False


# --- Collection Helpers ---

def get_collection(name: str):
    """Get a MongoDB collection by name."""
    return get_database()[name]


# Collection name constants
USERS_COLLECTION = "users"
CAMPAIGNS_COLLECTION = "campaigns"
CONTACTS_COLLECTION = "contacts"
GENERATED_EMAILS_COLLECTION = "generated_emails"
EMAIL_LOGS_COLLECTION = "email_logs"
OAUTH_TOKENS_COLLECTION = "oauth_tokens"
