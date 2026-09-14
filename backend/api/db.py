"""Database connection provider for FastAPI endpoints."""

from prisma import Prisma

# Global database client singleton
db = Prisma()


async def get_db() -> Prisma:
    """FastAPI dependency yielding a connected Prisma database client."""
    if not db.is_connected():
        await db.connect()
    return db

