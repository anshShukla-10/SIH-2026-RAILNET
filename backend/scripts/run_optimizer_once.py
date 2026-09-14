"""Standalone demonstration script executing the CP-SAT maintenance block optimizer.

Queries PostgreSQL for pending maintenance jobs, evaluates candidate windows against real timetable,
runs CP-SAT constraint optimization with hard zero-conflict constraints and Section NoOverlap,
persists Blocks and OptimizationResults, and outputs the execution summary and top 5 priority assignments.
"""

import asyncio
import sys
from pathlib import Path

# Ensure backend directory in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from optimization.solver import run_optimizer_and_persist
from prisma import Prisma


async def main():
    print("================================================================")
    print("RAILNET-AI: CP-SAT Automated Maintenance Block Optimizer")
    print("================================================================\n")

    db = Prisma()
    await db.connect()

    print("Fetching jobs, evaluating candidate windows, and solving...")
    summary = await run_optimizer_and_persist(db=db)

    print("\n==================== OPTIMIZER RUN SUMMARY ====================")
    print(f"Total Maintenance Jobs Scheduled : {summary.jobs_scheduled}")
    print(f"  - Initial Zero-Conflict Jobs   : {summary.zero_conflict_jobs} / {summary.jobs_scheduled} ({summary.zero_conflict_jobs / max(1, summary.jobs_scheduled) * 100:.1f}%)")
    print(f"  - Relaxed Clean Jobs (14-day)  : {summary.relaxed_but_clean_jobs} / {summary.jobs_scheduled} ({summary.relaxed_but_clean_jobs / max(1, summary.jobs_scheduled) * 100:.1f}%)")
    print(f"  - Genuine Hard Conflicts       : {summary.hard_conflict_jobs} / {summary.jobs_scheduled} ({summary.hard_conflict_jobs / max(1, summary.jobs_scheduled) * 100:.1f}%)")
    print(f"Total Train Conflicts Across Run : {summary.total_conflicts}")
    print("================================================================\n")

    # If any hard conflicts exist, list them
    if summary.hard_conflict_jobs > 0:
        print("================ GENUINE HARD CONFLICT JOBS ================")
        hard_jobs = [a for a in summary.assignments if a.hard_conflict]
        for a in hard_jobs:
            opt_res = await db.optimizationresult.find_first(where={"job_id": a.job_id})
            reason_text = opt_res.reason if opt_res else "N/A"
            print(f"Job ID: {a.job_id} | Section: {a.section_id} | Conflicts: {a.conflict_count}")
            print(f"  Reason: {reason_text}")
        print("============================================================\n")

    # Sort assignments by priority_score descending
    top_5 = sorted(summary.assignments, key=lambda a: a.priority_score, reverse=True)[:5]

    print("================ TOP 5 SCHEDULED ASSIGNMENTS ================")
    for idx, a in enumerate(top_5, 1):
        opt_res = await db.optimizationresult.find_first(where={"job_id": a.job_id})
        reason_text = opt_res.reason if opt_res else "N/A"
        start_str = a.start.strftime("%Y-%m-%d %H:%M")
        end_str = a.end.strftime("%Y-%m-%d %H:%M")

        status_tag = "RELAXED" if a.relaxed else ("HARD_CONFLICT" if a.hard_conflict else "STANDARD")

        print(f"\n#{idx} Job ID: {a.job_id} | Section: {a.section_id} | Priority Score: {a.priority_score:.2f} [{status_tag}]")
        print(f"   Window       : {start_str} -> {end_str} (Rank {a.window_rank + 1})")
        print(f"   Conflicts    : {a.conflict_count} train conflicts")
        print(f"   Reason       : {reason_text}")

    print("\n================================================================")
    await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())
