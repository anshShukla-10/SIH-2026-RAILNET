"""Train timetable and route endpoints."""

from typing import List

from fastapi import APIRouter, Depends, Query
from prisma import Prisma

from api.db import get_db
from api.schemas import TrainOut

router = APIRouter(prefix="/api/trains", tags=["Trains"])


@router.get("", response_model=List[TrainOut])
async def list_trains(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Prisma = Depends(get_db),
) -> List[TrainOut]:
    """List scheduled trains with pagination."""
    trains = await db.train.find_many(
        skip=skip,
        take=limit,
        order={"train_id": "asc"},
    )
    return [
        TrainOut(
            train_id=t.train_id,
            name=t.name,
            source=t.source,
            destination=t.destination,
            run_days=t.run_days,
        )
        for t in trains
    ]

