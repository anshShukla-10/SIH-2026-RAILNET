"""Track section endpoints."""

from typing import List

from fastapi import APIRouter, Depends
from prisma import Prisma

from api.db import get_db
from api.schemas import SectionOut

router = APIRouter(prefix="/api/sections", tags=["Sections"])


@router.get("", response_model=List[SectionOut])
async def list_sections(
    db: Prisma = Depends(get_db),
) -> List[SectionOut]:
    """List all railway track sections."""
    sections = await db.section.find_many(order={"section_id": "asc"})
    return [
        SectionOut(
            section_id=s.section_id,
            name=s.name,
            single_line=s.single_line,
        )
        for s in sections
    ]

