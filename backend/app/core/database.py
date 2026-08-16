"""
SmartReach AI — MongoDB Database Connection

Uses Motor (async MongoDB driver) with FastAPI lifespan events.
"""

import logging
import re
import urllib.parse
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from app.core.config import settings

logger = logging.getLogger(__name__)

# Module-level references (set during app lifespan)
_client: AsyncIOMotorClient | None = None
_database: AsyncIOMotorDatabase | None = None


def sanitize_mongodb_uri(uri: str) -> str:
    """Ensure username and password in MongoDB URI are properly RFC 3986 encoded."""
    if not uri or not uri.startswith("mongodb"):
        return uri
    pattern = re.compile(r"^(mongodb(?:\+srv)?:\/\/)([^:]+):(.+)@([^/?#]+)(.*)$")
    match = pattern.match(uri)
    if match:
        scheme, user, password, host, rest = match.groups()
        clean_user = urllib.parse.quote_plus(urllib.parse.unquote_plus(user))
        clean_password = urllib.parse.quote_plus(urllib.parse.unquote_plus(password))
        return f"{scheme}{clean_user}:{clean_password}@{host}{rest}"
    return uri


async def connect_to_mongodb() -> None:
    """Initialize the MongoDB connection pool."""
    global _client, _database
    try:
        sanitized_uri = sanitize_mongodb_uri(settings.MONGODB_URI)
        _client = AsyncIOMotorClient(
            sanitized_uri,
            serverSelectionTimeoutMS=5000,
        )
        _database = _client[settings.DATABASE_NAME]
        # Verify the connection
        await _client.admin.command("ping")
        logger.info(
            "Connected to MongoDB: %s (db: %s)",
            sanitized_uri.split("@")[-1] if "@" in sanitized_uri else sanitized_uri,
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
