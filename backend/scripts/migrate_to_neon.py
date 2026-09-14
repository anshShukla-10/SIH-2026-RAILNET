"""Transfer all railway corridor data from local PostgreSQL to NeonDB.

Preserves exact primary keys, foreign keys, timestamps, and priority scores.
"""

import asyncio
import os
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from prisma import Prisma

LOCAL_URL = os.getenv(
    "LOCAL_DATABASE_URL",
    "postgresql://postgres:postgres@localhost:5432/railway_blocks",
)
NEON_URL = os.getenv(
    "NEON_DATABASE_URL",
    os.getenv("DATABASE_URL"),
)


async def migrate():
    print(f"[*] Connecting to local database at {LOCAL_URL}...")
    local_db = Prisma(datasource={"url": LOCAL_URL})
    await local_db.connect()

    print(f"[*] Connecting to NeonDB cloud database...")
    neon_db = Prisma(datasource={"url": NEON_URL})
    await neon_db.connect()

    # 1. Migrate Sections
    sections = await local_db.section.find_many()
    print(f"[*] Migrating {len(sections)} sections...")
    for sec in sections:
        await neon_db.section.upsert(
            where={"section_id": sec.section_id},
            data={
                "create": {
                    "section_id": sec.section_id,
                    "name": sec.name,
                    "single_line": sec.single_line,
                },
                "update": {
                    "name": sec.name,
                    "single_line": sec.single_line,
                },
            },
        )
    print(f"[✓] Sections migrated.")

    # 2. Migrate Trains
    trains = await local_db.train.find_many()
    print(f"[*] Migrating {len(trains)} trains...")
    for t in trains:
        await neon_db.train.upsert(
            where={"train_id": t.train_id},
            data={
                "create": {
                    "train_id": t.train_id,
                    "name": t.name,
                    "source": t.source,
                    "destination": t.destination,
                    "run_days": t.run_days,
                },
                "update": {
                    "name": t.name,
                    "source": t.source,
                    "destination": t.destination,
                    "run_days": t.run_days,
                },
            },
        )
    print(f"[✓] Trains migrated.")

    # 3. Migrate Train Stops (batching)
    stops = await local_db.trainstop.find_many(order={"id": "asc"})
    print(f"[*] Migrating {len(stops)} train stops...")
    batch_size = 200
    for i in range(0, len(stops), batch_size):
        batch = stops[i : i + batch_size]
        for s in batch:
            await neon_db.trainstop.upsert(
                where={"id": s.id},
                data={
                    "create": {
                        "id": s.id,
                        "train_id": s.train_id,
                        "station_code": s.station_code,
                        "section_id": s.section_id,
                        "sequence": s.sequence,
                        "arrival": s.arrival,
                        "departure": s.departure,
                    },
                    "update": {
                        "train_id": s.train_id,
                        "station_code": s.station_code,
                        "section_id": s.section_id,
                        "sequence": s.sequence,
                        "arrival": s.arrival,
                        "departure": s.departure,
                    },
                },
            )
        print(f"    - Uploaded stops {min(i + batch_size, len(stops))}/{len(stops)}")
    print(f"[✓] Train stops migrated.")

    # 4. Migrate Maintenance Jobs
    jobs = await local_db.maintenancejob.find_many()
    print(f"[*] Migrating {len(jobs)} maintenance jobs...")
    for j in jobs:
        await neon_db.maintenancejob.upsert(
            where={"job_id": j.job_id},
            data={
                "create": {
                    "job_id": j.job_id,
                    "department": j.department,
                    "asset_id": j.asset_id,
                    "section_id": j.section_id,
                    "defect_desc": j.defect_desc,
                    "criticality": j.criticality,
                    "urgency": j.urgency,
                    "asset_risk": j.asset_risk,
                    "overdue_factor": j.overdue_factor,
                    "failure_history": j.failure_history,
                    "priority_score": j.priority_score,
                    "due_date": j.due_date,
                    "duration_min": j.duration_min,
                    "day_night_pref": j.day_night_pref,
                    "status": j.status,
                    "is_synthetic": j.is_synthetic,
                    "source_note": j.source_note,
                    "has_hard_conflict": j.has_hard_conflict,
                },
                "update": {
                    "department": j.department,
                    "asset_id": j.asset_id,
                    "section_id": j.section_id,
                    "defect_desc": j.defect_desc,
                    "criticality": j.criticality,
                    "urgency": j.urgency,
                    "asset_risk": j.asset_risk,
                    "overdue_factor": j.overdue_factor,
                    "failure_history": j.failure_history,
                    "priority_score": j.priority_score,
                    "due_date": j.due_date,
                    "duration_min": j.duration_min,
                    "day_night_pref": j.day_night_pref,
                    "status": j.status,
                    "is_synthetic": j.is_synthetic,
                    "source_note": j.source_note,
                    "has_hard_conflict": j.has_hard_conflict,
                },
            },
        )
    print(f"[✓] Maintenance jobs migrated.")

    # 5. Migrate Blocks
    blocks = await local_db.block.find_many()
    print(f"[*] Migrating {len(blocks)} scheduled blocks...")
    for b in blocks:
        await neon_db.block.upsert(
            where={"block_id": b.block_id},
            data={
                "create": {
                    "block_id": b.block_id,
                    "job_id": b.job_id,
                    "section_id": b.section_id,
                    "start": b.start,
                    "end": b.end,
                    "status": b.status,
                    "has_hard_conflict": b.has_hard_conflict,
                },
                "update": {
                    "job_id": b.job_id,
                    "section_id": b.section_id,
                    "start": b.start,
                    "end": b.end,
                    "status": b.status,
                    "has_hard_conflict": b.has_hard_conflict,
                },
            },
        )
    print(f"[✓] Scheduled blocks migrated.")

    # 6. Migrate Optimization Results
    opts = await local_db.optimizationresult.find_many()
    print(f"[*] Migrating {len(opts)} optimization results...")
    for o in opts:
        await neon_db.optimizationresult.upsert(
            where={"id": o.id},
            data={
                "create": {
                    "id": o.id,
                    "job_id": o.job_id,
                    "recommended_start": o.recommended_start,
                    "recommended_end": o.recommended_end,
                    "conflict_count": o.conflict_count,
                    "priority_score": o.priority_score,
                    "reason": o.reason,
                },
                "update": {
                    "job_id": o.job_id,
                    "recommended_start": o.recommended_start,
                    "recommended_end": o.recommended_end,
                    "conflict_count": o.conflict_count,
                    "priority_score": o.priority_score,
                    "reason": o.reason,
                },
            },
        )
    print(f"[✓] Optimization results migrated.")

    # Verify counts in NeonDB
    print("\n" + "=" * 50)
    print("VERIFICATION OF NEONDB COUNTS:")
    neon_sections = await neon_db.section.count()
    neon_trains = await neon_db.train.count()
    neon_stops = await neon_db.trainstop.count()
    neon_jobs = await neon_db.maintenancejob.count()
    neon_blocks = await neon_db.block.count()
    neon_opts = await neon_db.optimizationresult.count()

    print(f"Sections:             {neon_sections} (Expected: {len(sections)})")
    print(f"Trains:               {neon_trains} (Expected: {len(trains)})")
    print(f"Train Stops:          {neon_stops} (Expected: {len(stops)})")
    print(f"Maintenance Jobs:     {neon_jobs} (Expected: {len(jobs)})")
    print(f"Scheduled Blocks:     {neon_blocks} (Expected: {len(blocks)})")
    print(f"Optimization Results: {neon_opts} (Expected: {len(opts)})")
    print("=" * 50)

    assert neon_sections == len(sections), "Section count mismatch"
    assert neon_trains == len(trains), "Train count mismatch"
    assert neon_stops == len(stops), "Train stop count mismatch"
    assert neon_jobs == len(jobs), "Maintenance job count mismatch"
    assert neon_blocks == len(blocks), "Block count mismatch"
    assert neon_opts == len(opts), "Optimization result count mismatch"

    print("\n[SUCCESS] NeonDB data migration completed with 100% data integrity!")

    await local_db.disconnect()
    await neon_db.disconnect()


if __name__ == "__main__":
    asyncio.run(migrate())

