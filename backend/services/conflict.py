from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import BaseModel
from prisma import Prisma


class ConflictingTrain(BaseModel):
    train_id: str
    name: str
    arrival: datetime
    departure: datetime


class ConflictResult(BaseModel):
    conflict_count: int
    conflicting_trains: List[ConflictingTrain]


def _ensure_utc(dt: datetime) -> datetime:
    """Ensure datetime is timezone-aware in UTC."""
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


async def find_conflicts(
    section_id: str,
    start: datetime,
    end: datetime,
    db: Optional[Prisma] = None,
    cached_stops: Optional[List[Any]] = None,
) -> ConflictResult:
    """Query train stops on section_id that overlap [start, end).

    Overlap definition:
      a_start < b_end AND b_start < a_end
      i.e. stop.arrival < end AND stop.departure > start

    Returns ConflictResult with conflict_count and conflicting_trains.
    """
    start_utc = _ensure_utc(start)
    end_utc = _ensure_utc(end)

    if cached_stops is not None:
        conflicting_trains: List[ConflictingTrain] = []
        for s in cached_stops:
            if s.section_id != section_id:
                continue
            s_arr = _ensure_utc(s.arrival)
            s_dep = _ensure_utc(s.departure)
            if s_arr < end_utc and s_dep > start_utc:
                train_name = s.train.name if s.train else s.train_id
                conflicting_trains.append(
                    ConflictingTrain(
                        train_id=s.train_id,
                        name=train_name,
                        arrival=s_arr,
                        departure=s_dep,
                    )
                )
        return ConflictResult(
            conflict_count=len(conflicting_trains),
            conflicting_trains=conflicting_trains,
        )

    should_disconnect = False
    if db is None:
        db = Prisma()
        await db.connect()
        should_disconnect = True

    try:
        # Fetch train stops for the given section, including train details
        stops = await db.trainstop.find_many(
            where={
                "section_id": section_id,
                "arrival": {"lt": end_utc},
                "departure": {"gt": start_utc},
            },
            include={"train": True},
            order={"arrival": "asc"},
        )

        conflicting_trains: List[ConflictingTrain] = []
        for s in stops:
            # Overlap check: s.arrival < end_utc and s.departure > start_utc
            s_arr = _ensure_utc(s.arrival)
            s_dep = _ensure_utc(s.departure)
            if s_arr < end_utc and s_dep > start_utc:
                train_name = s.train.name if s.train else s.train_id
                conflicting_trains.append(
                    ConflictingTrain(
                        train_id=s.train_id,
                        name=train_name,
                        arrival=s_arr,
                        departure=s_dep,
                    )
                )

        return ConflictResult(
            conflict_count=len(conflicting_trains),
            conflicting_trains=conflicting_trains,
        )
    finally:
        if should_disconnect:
            await db.disconnect()

