"""Seed synthetic maintenance jobs across TMS, SMMS, and TDMS departments into PostgreSQL via Prisma.

Uses pandas with a fixed random seed to generate 100-150 realistic maintenance jobs.
Every job references a real section_id queried from PostgreSQL.
All rows are flagged is_synthetic=True with the required source_note.

This script is standalone and idempotent: re-running will not create duplicate rows.
"""

import asyncio
import os
import sys
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import List

import numpy as np
import pandas as pd

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from prisma import Prisma
from prisma.enums import DayNightPref, Department, JobStatus

SOURCE_NOTE = "Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible"

# Department-specific realistic assets and defect descriptions
DEPARTMENT_METADATA = {
    Department.TMS: {
        "assets": [
            "TRK-RAIL-042",
            "TRK-SLP-108",
            "TRK-SW-211",
            "TRK-BLT-055",
            "TRK-JNT-014",
            "TRK-CRV-089",
            "TRK-TRN-301",
            "TRK-XNG-019",
        ],
        "defects": [
            "Ultrasonic Flaw Detection (USFD) detected rail fracture flaw",
            "Track geometry degradation - urgent tamping required",
            "Ballast deficiency and shoulder consolidation needed",
            "Corroded elastic rail clips and loose fittings renewal",
            "Turnout switch tongue rail wear beyond permissible limit",
            "Deep screening of track ballast on down line",
            "Rail weld joint replacement and track grinding",
            "Fishplate joint bolt shearing and gap irregularity",
        ],
        "day_night_weights": [0.2, 0.6, 0.2],  # [DAY, NIGHT, ANY] - TMS heavily prefers NIGHT
    },
    Department.SMMS: {
        "assets": [
            "SIG-PNT-102A",
            "SIG-TC-024B",
            "SIG-AXC-011",
            "SIG-LOC-005",
            "SIG-REL-301",
            "SIG-SGN-041",
            "SIG-EI-002",
            "SIG-IPS-015",
        ],
        "defects": [
            "Point machine motor contact intermittent failure",
            "Track circuit DC feed voltage dropping below threshold",
            "Digital Axle Counter (DAC) reset channel fail-safe alarm",
            "Signal LED unit aspect degradation on home signal",
            "Electronic Interlocking (EI) card diagnostic warning",
            "Glued insulated rail joint insulation resistance failure",
            "Integrated power supply (IPS) inverter maintenance",
            "Data logger communication bus timing glitch",
        ],
        "day_night_weights": [0.6, 0.1, 0.3],  # [DAY, NIGHT, ANY] - SMMS prefers DAY for testing
    },
    Department.TDMS: {
        "assets": [
            "OHE-MST-412/10",
            "OHE-ISO-022",
            "OHE-ATD-005",
            "OHE-CNT-108",
            "OHE-VCB-033",
            "OHE-TSS-002",
            "OHE-PRT-088",
            "OHE-DRP-014",
        ],
        "defects": [
            "OHE contact wire wear exceeding 20% limit",
            "Auto Tensioning Device (ATD) counterweight pulley jamming",
            "Cantilever bracket insulator flashover and micro-crack",
            "Section insulator replacement and height adjustment",
            "25kV Vacuum Circuit Breaker (VCB) maintenance and gas test",
            "Bird nest clearance and anti-bird disc installation on masts",
            "Neutral section overlap transition runner adjustment",
            "Dropper displacement and catenary tension readjustment",
        ],
        "day_night_weights": [0.1, 0.7, 0.2],  # [DAY, NIGHT, ANY] - TDMS strongly prefers NIGHT
    },
}

DURATIONS_MIN = [60, 90, 120, 180, 240]
DAY_NIGHT_CHOICES = [DayNightPref.DAY, DayNightPref.NIGHT, DayNightPref.ANY]


def generate_synthetic_jobs_df(valid_section_ids: List[str], base_date: date, jobs_per_dept: int = 40) -> pd.DataFrame:
    """Generate a pandas DataFrame of synthetic maintenance jobs using a fixed random seed."""
    np.random.seed(42)

    records = []
    job_counter = 1

    for dept in [Department.TMS, Department.SMMS, Department.TDMS]:
        meta = DEPARTMENT_METADATA[dept]
        for i in range(jobs_per_dept):
            job_id = f"JOB-{dept.value}-{job_counter:04d}"
            asset_id = str(np.random.choice(meta["assets"]))
            section_id = str(np.random.choice(valid_section_ids))
            defect_desc = str(np.random.choice(meta["defects"]))

            # Plausible 0-100 float scores rounded to 1 decimal place
            criticality = round(float(np.random.uniform(20.0, 98.0)), 1)
            urgency = round(float(np.random.uniform(15.0, 95.0)), 1)
            asset_risk = round(float(np.random.uniform(25.0, 95.0)), 1)
            overdue_factor = round(float(np.random.uniform(10.0, 90.0)), 1)
            failure_history = round(float(np.random.uniform(5.0, 85.0)), 1)

            # Due date within the next 1 to 14 days
            due_offset_days = int(np.random.randint(1, 15))
            due_date = base_date + timedelta(days=due_offset_days)
            due_datetime = datetime.combine(due_date, datetime.min.time())

            duration_min = int(np.random.choice(DURATIONS_MIN))
            pref_idx = np.random.choice(len(DAY_NIGHT_CHOICES), p=meta["day_night_weights"])
            day_night_pref = DAY_NIGHT_CHOICES[pref_idx]

            rec = {
                "job_id": job_id,
                "department": dept,
                "asset_id": asset_id,
                "section_id": section_id,
                "defect_desc": defect_desc,
                "criticality": criticality,
                "urgency": urgency,
                "asset_risk": asset_risk,
                "overdue_factor": overdue_factor,
                "failure_history": failure_history,
                "due_date": due_datetime,
                "duration_min": duration_min,
                "day_night_pref": day_night_pref,
                "status": JobStatus.PENDING,
                "is_synthetic": True,
                "source_note": SOURCE_NOTE,
            }
            # Calculate priority score using weighted formula
            from services.priority import calculate_priority_score
            rec["priority_score"] = calculate_priority_score(rec)
            records.append(rec)
            job_counter += 1

    df = pd.DataFrame(records)
    return df


async def seed_synthetic_jobs():
    db = Prisma()
    await db.connect()

    from services.clock import get_base_date
    base_date = get_base_date()

    try:
        # Step 1: Query real sections from PostgreSQL (sorted deterministically)
        sections = await db.section.find_many(order={"section_id": "asc"})
        valid_section_ids = sorted([s.section_id for s in sections])

        if not valid_section_ids:
            raise RuntimeError(
                "No sections found in database! Please run `python scripts/seed_real_timetable.py` first."
            )

        print(f"Found {len(valid_section_ids)} valid real sections in PostgreSQL.")

        # Step 2: Generate 120 jobs (40 per department: TMS, SMMS, TDMS) with fixed seed
        df_jobs = generate_synthetic_jobs_df(valid_section_ids, base_date=base_date, jobs_per_dept=40)
        print(f"Generated {len(df_jobs)} synthetic maintenance jobs via pandas (seed=42).")

        # Step 3: Idempotent write — remove existing blocks, optimization results, and synthetic jobs
        await db.optimizationresult.delete_many()
        await db.block.delete_many()
        deleted = await db.maintenancejob.delete_many(where={"is_synthetic": True})
        if deleted > 0:
            print(f"Cleaned up previous optimization results, blocks, and {deleted} synthetic jobs for idempotency.")

        jobs_data = df_jobs.to_dict(orient="records")
        await db.maintenancejob.create_many(data=jobs_data)

        # Step 4: Validate department distribution
        print("Department breakdown:")
        for dept in [Department.TMS, Department.SMMS, Department.TDMS]:
            count = await db.maintenancejob.count(where={"department": dept})
            print(f"  - {dept.value}: {count} jobs")

        total_count = await db.maintenancejob.count()
        print(f"Successfully seeded {total_count} total MaintenanceJob rows in PostgreSQL.")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(seed_synthetic_jobs())
