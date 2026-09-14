"""RAILNET-AI: Automatic Maintenance Block Planning System for Indian Railways (SIH26027).

End-to-End Demonstration Script:
1. Pins DEMO_BASE_DATE for 100% reproducible timetable materialization and optimization.
2. Seeds real timetable data from RailRadar (cached locally) into PostgreSQL.
3. Seeds realistic synthetic maintenance jobs across TMS, SMMS, and TDMS.
4. Computes multi-criteria priority scores and verifies table counts.
5. Executes the CP-SAT Maintenance Block Optimizer with hard zero-conflict constraints.
6. Displays the execution breakdown, top 10 scheduled maintenance blocks, and explainability narrative.

Usage:
    python scripts/demo.py
"""

import asyncio
import os
import sys
from datetime import datetime
from pathlib import Path

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Explicitly pin DEMO_BASE_DATE if not already set by caller
DEFAULT_DEMO_BASE_DATE = "2026-09-07"
if not os.getenv("DEMO_BASE_DATE"):
    os.environ["DEMO_BASE_DATE"] = DEFAULT_DEMO_BASE_DATE

from optimization.solver import run_optimizer_and_persist
from prisma import Prisma
from services.clock import get_base_date
from services.priority import update_all_priority_scores
from scripts.seed_real_timetable import seed_real_timetable
from scripts.seed_synthetic_jobs import seed_synthetic_jobs


async def run_demo():
    pinned_date = get_base_date()

    print("=" * 86)
    print(" RAILNET-AI: Automatic Maintenance Block Planning System for Indian Railways")
    print(" Smart India Hackathon 2026 (SIH26027) · Ministry of Railways Demo")
    print(f" Pinned Reference Base Date: {pinned_date.strftime('%Y-%m-%d (%A)')} [DEMO_BASE_DATE]")
    print("=" * 86)

    # -------------------------------------------------------------------------
    # Step 1 & 2: Database Seeding (Real Timetable + Synthetic Maintenance Jobs)
    # -------------------------------------------------------------------------
    print("\n[Phase 1] Seeding Real Railway Timetable from RailRadar API...")
    await seed_real_timetable()

    print("\n[Phase 2] Seeding Realistic Maintenance Jobs (TMS, SMMS, TDMS)...")
    await seed_synthetic_jobs()

    # Ensure all jobs have computed priority scores
    await update_all_priority_scores()

    # -------------------------------------------------------------------------
    # Step 3: Database Verification & Row Counts
    # -------------------------------------------------------------------------
    db = Prisma()
    await db.connect()

    sections_count = await db.section.count()
    trains_count = await db.train.count()
    stops_count = await db.trainstop.count()
    jobs_total = await db.maintenancejob.count()
    tms_count = await db.maintenancejob.count(where={"department": "TMS"})
    smms_count = await db.maintenancejob.count(where={"department": "SMMS"})
    tdms_count = await db.maintenancejob.count(where={"department": "TDMS"})

    print("\n" + "-" * 86)
    print(" DATABASE INTEGRITY & INGESTION AUDIT")
    print("-" * 86)
    print(f"  • Real Railway Sections (RailRadar)  : {sections_count} sections")
    print(f"  • Real Scheduled Trains (RailRadar)  : {trains_count} trains")
    print(f"  • Real Train Traversal Stops (7-Day) : {stops_count:,} stops")
    print(f"  • Maintenance Jobs (TMS/SMMS/TDMS)   : {jobs_total} jobs")
    print(f"      - TMS  (Track Maintenance)      : {tms_count} jobs")
    print(f"      - SMMS (Signal Maintenance)     : {smms_count} jobs")
    print(f"      - TDMS (Traction / OHE)         : {tdms_count} jobs")
    print("-" * 86)

    # -------------------------------------------------------------------------
    # Step 4: Run CP-SAT Maintenance Block Optimizer
    # -------------------------------------------------------------------------
    print("\n[Phase 3] Running CP-SAT Optimizer with Section NoOverlap & Zero-Conflict Constraints...")
    summary = await run_optimizer_and_persist(db=db, base_date=pinned_date)

    print("\n" + "=" * 86)
    print(" OPTIMIZER EXECUTION SUMMARY")
    print("=" * 86)
    print(f"  Total Maintenance Jobs Scheduled : {summary.jobs_scheduled}")
    print(f"    • Initial Clean Windows (7-Day) : {summary.zero_conflict_jobs} / {summary.jobs_scheduled} ({summary.zero_conflict_jobs / summary.jobs_scheduled * 100:.1f}%)")
    print(f"    • Relaxed Clean Windows (14-Day): {summary.relaxed_but_clean_jobs} / {summary.jobs_scheduled} ({summary.relaxed_but_clean_jobs / summary.jobs_scheduled * 100:.1f}%)")
    print(f"    • Genuine Hard Conflicts        : {summary.hard_conflict_jobs} / {summary.jobs_scheduled} ({summary.hard_conflict_jobs / summary.jobs_scheduled * 100:.1f}%)")
    print(f"  Total Train Conflicts Across Run  : {summary.total_conflicts}")
    print("=" * 86)

    # -------------------------------------------------------------------------
    # Step 5: Top 10 Scheduled Maintenance Blocks Table
    # -------------------------------------------------------------------------
    all_jobs = await db.maintenancejob.find_many(include={"blocks": True})
    jobs_by_id = {j.job_id: j for j in all_jobs}

    top_10 = sorted(summary.assignments, key=lambda a: a.priority_score, reverse=True)[:10]

    print("\n" + "=" * 86)
    print(" TOP 10 SCHEDULED MAINTENANCE BLOCKS ACROSS ALL DEPARTMENTS")
    print("=" * 86)
    header = f"{'Rank':<5} | {'Job ID':<14} | {'Dept':<5} | {'Priority':<8} | {'Section ID':<14} | {'Scheduled Window':<33} | {'Status'}"
    print(header)
    print("-" * 86)

    for rank, a in enumerate(top_10, 1):
        job = jobs_by_id.get(a.job_id)
        dept = job.department if job else "N/A"
        start_str = a.start.strftime("%Y-%m-%d %H:%M")
        end_str = a.end.strftime("%H:%M")
        window_str = f"{start_str} - {end_str}"
        status_str = "RELAXED (0 conf)" if a.relaxed else ("HARD CONFLICT" if a.hard_conflict else "CLEAN (0 conf)")
        print(f"#{rank:<4} | {a.job_id:<14} | {dept:<5} | {a.priority_score:<8.2f} | {a.section_id:<14} | {window_str:<33} | {status_str}")

    print("-" * 86)

    # -------------------------------------------------------------------------
    # Step 6: Explainability Deep-Dive (Interesting Case)
    # -------------------------------------------------------------------------
    sample_assignment = next((a for a in summary.assignments if a.relaxed), summary.assignments[0])
    sample_job = jobs_by_id[sample_assignment.job_id]
    opt_result = await db.optimizationresult.find_first(where={"job_id": sample_assignment.job_id})

    print("\n" + "=" * 86)
    print(f" EXPLAINABILITY SPOTLIGHT: Job {sample_assignment.job_id} ({sample_job.department})")
    print("=" * 86)
    print(f"  • Asset ID           : {sample_job.asset_id}")
    print(f"  • Section            : {sample_job.section_id}")
    print(f"  • Defect Description : {sample_job.defect_desc}")
    print(f"  • Priority Metrics   : Criticality={sample_job.criticality:.1f}, Urgency={sample_job.urgency:.1f}, AssetRisk={sample_job.asset_risk:.1f}")
    print(f"  • Computed Priority  : {sample_job.priority_score:.2f} / 100.0")
    print(f"  • Day/Night Request  : {sample_job.day_night_pref}")
    print(f"  • Scheduled Block    : {sample_assignment.start.strftime('%Y-%m-%d %H:%M')} to {sample_assignment.end.strftime('%Y-%m-%d %H:%M')}")
    print(f"  • Train Conflicts    : {sample_assignment.conflict_count} conflicts")
    print(f"  • Explainability Text:\n    \"{opt_result.reason if opt_result else 'N/A'}\"")
    print("=" * 86)

    # -------------------------------------------------------------------------
    # Step 7: Final Judge-Ready One-Line Summary
    # -------------------------------------------------------------------------
    print("\n" + "*" * 86)
    print(
        f"Scheduled {summary.jobs_scheduled} maintenance jobs across TMS/SMMS/TDMS with "
        f"{summary.total_conflicts} hard conflicts "
        f"({summary.zero_conflict_jobs} clean, {summary.relaxed_but_clean_jobs} resolved via 14-day search) — "
        f"see http://localhost:8000/docs for the live API."
    )
    print("*" * 86 + "\n")

    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(run_demo())

