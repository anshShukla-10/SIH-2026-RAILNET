"""Integration tests for conflict detection service against PostgreSQL."""

import asyncio
from datetime import datetime, timedelta, timezone
from prisma import Prisma
from services.conflict import find_conflicts


def test_conflict_detected_on_overlapping_window():
    """Test that a candidate window overlapping a real seeded train stop reports conflict."""

    async def run():
        db = Prisma()
        await db.connect()
        try:
            # Pick a real seeded train stop
            stop = await db.trainstop.find_first(include={"train": True})
            assert stop is not None, "Expected seeded train stops in database"

            # Create a window that clearly overlaps this stop
            window_start = stop.arrival - timedelta(minutes=15)
            window_end = stop.departure + timedelta(minutes=15)

            result = await find_conflicts(
                section_id=stop.section_id,
                start=window_start,
                end=window_end,
                db=db,
            )

            assert result.conflict_count >= 1
            conflicting_train_ids = [t.train_id for t in result.conflicting_trains]
            assert stop.train_id in conflicting_train_ids

            # Verify train metadata structure
            matched_train = next(t for t in result.conflicting_trains if t.train_id == stop.train_id)
            assert matched_train.name
            assert matched_train.arrival == stop.arrival
            assert matched_train.departure == stop.departure
        finally:
            await db.disconnect()

    asyncio.run(run())


def test_no_conflict_when_window_has_no_trains():
    """Test that a window in a time range with no scheduled trains returns zero conflicts."""

    async def run():
        db = Prisma()
        await db.connect()
        try:
            section = await db.section.find_first()
            assert section is not None, "Expected seeded sections in database"

            # Far future window where no trains are scheduled
            empty_start = datetime(2099, 1, 1, 2, 0, 0, tzinfo=timezone.utc)
            empty_end = datetime(2099, 1, 1, 4, 0, 0, tzinfo=timezone.utc)

            result = await find_conflicts(
                section_id=section.section_id,
                start=empty_start,
                end=empty_end,
                db=db,
            )

            assert result.conflict_count == 0
            assert len(result.conflicting_trains) == 0
        finally:
            await db.disconnect()

    asyncio.run(run())

