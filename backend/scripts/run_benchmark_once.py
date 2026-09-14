"""Standalone benchmarking script evaluating CP-SAT against FCFS and EDD baselines.

PRD Section 13: Defensible Benchmarking.
Evaluates identical maintenance jobs and candidate windows across FCFS, EDD, and CP-SAT,
printing an aligned comparison table. Strictly read-only on the database.
"""

import asyncio
import sys
from pathlib import Path

# Ensure backend directory in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from prisma import Prisma
from services.benchmark import run_baseline_comparison


async def main():
    print("================================================================================")
    print("RAILNET-AI: Defensible Benchmarking — Heuristic Baselines vs CP-SAT")
    print("================================================================================\n")

    db = Prisma()
    await db.connect()

    try:
        print("Evaluating FCFS, EDD, and CP-SAT on identical candidate windows...\n")
        report = await run_baseline_comparison(db=db)

        fcfs = report.metrics.fcfs
        edd = report.metrics.edd
        cpsat = report.metrics.cpsat
        imp = report.improvements

        col_w = [32, 14, 14, 14, 18, 18]
        header = (
            f"{'Metric':<{col_w[0]}} | "
            f"{'FCFS':^{col_w[1]}} | "
            f"{'EDD':^{col_w[2]}} | "
            f"{'CP-SAT':^{col_w[3]}} | "
            f"{'Vs FCFS':^{col_w[4]}} | "
            f"{'Vs EDD':^{col_w[5]}}"
        )
        sep = "-" * len(header)

        def format_metric_comp(pct, base_val, target_val, invert=False):
            if pct is not None:
                sign = "+" if invert else "-"
                return f"{sign}{pct:.1f}%" if pct > 0 else "0.0%"
            if target_val > base_val:
                diff = target_val - base_val
                return f"+{diff} job (from 0)"
            return "0.0%"

        crit_vs_fcfs = format_metric_comp(
            imp.critical_delay_reduction_vs_fcfs_pct,
            fcfs.critical_delayed_jobs_count,
            cpsat.critical_delayed_jobs_count,
        )
        crit_vs_edd = format_metric_comp(
            imp.critical_delay_reduction_vs_edd_pct,
            edd.critical_delayed_jobs_count,
            cpsat.critical_delayed_jobs_count,
        )

        rows = [
            (
                "Total Train Conflicts",
                f"{fcfs.total_conflicts}",
                f"{edd.total_conflicts}",
                f"{cpsat.total_conflicts}",
                f"-{imp.conflict_reduction_vs_fcfs_pct:.1f}%",
                f"-{imp.conflict_reduction_vs_edd_pct:.1f}%",
            ),
            (
                "Jobs with Conflicts > 0",
                f"{fcfs.conflicted_jobs_count}",
                f"{edd.conflicted_jobs_count}",
                f"{cpsat.conflicted_jobs_count}",
                f"-{(fcfs.conflicted_jobs_count - cpsat.conflicted_jobs_count) / max(1, fcfs.conflicted_jobs_count) * 100:.1f}%",
                f"-{(edd.conflicted_jobs_count - cpsat.conflicted_jobs_count) / max(1, edd.conflicted_jobs_count) * 100:.1f}%",
            ),
            (
                "Zero-Conflict Jobs",
                f"{fcfs.zero_conflict_jobs_count}",
                f"{edd.zero_conflict_jobs_count}",
                f"{cpsat.zero_conflict_jobs_count}",
                f"+{(cpsat.zero_conflict_jobs_count - fcfs.zero_conflict_jobs_count) / max(1, fcfs.zero_conflict_jobs_count) * 100:.1f}%",
                f"+{(cpsat.zero_conflict_jobs_count - edd.zero_conflict_jobs_count) / max(1, edd.zero_conflict_jobs_count) * 100:.1f}%",
            ),
            (
                "Critical Delays (>48h delay)",
                f"{fcfs.critical_delayed_jobs_count}",
                f"{edd.critical_delayed_jobs_count}",
                f"{cpsat.critical_delayed_jobs_count}",
                f"-{imp.critical_delay_reduction_vs_fcfs_pct:.1f}%",
                f"-{imp.critical_delay_reduction_vs_edd_pct:.1f}%",
                crit_vs_fcfs,
                crit_vs_edd,
            ),
            (
                "Section Collisions (Overlaps)",
                f"{fcfs.section_no_overlap_violations}",
                f"{edd.section_no_overlap_violations}",
                f"{cpsat.section_no_overlap_violations}",
                f"{imp.no_overlap_violations_prevented_vs_fcfs} prevented",
                f"{imp.no_overlap_violations_prevented_vs_edd} prevented",
            ),
            (
                "Schedule Spread (Days)",
                f"{fcfs.completion_spread_days:.2f}",
                f"{edd.completion_spread_days:.2f}",
                f"{cpsat.completion_spread_days:.2f}",
                "N/A",
                "N/A",
            ),
        ]

        print(sep)
        print(header)
        print(sep)
        for r in rows:
            print(
                f"{r[0]:<{col_w[0]}} | "
                f"{r[1]:^{col_w[1]}} | "
                f"{r[2]:^{col_w[2]}} | "
                f"{r[3]:^{col_w[3]}} | "
                f"{r[4]:^{col_w[4]}} | "
                f"{r[5]:^{col_w[5]}}"
            )
        print(sep)

        if report.critical_delayed_jobs:
            print("\n================== CRITICAL DELAY AUDIT & CONFLICT TRADEOFF ==================")
            for dj in report.critical_delayed_jobs:
                print(f"Job ID: {dj.job_id} | Section: {dj.section_id} | Priority Score: {dj.priority_score:.2f}")
                print(f"  Earliest Candidate Window : {dj.earliest_candidate_start.strftime('%Y-%m-%d %H:%M')} -> {dj.earliest_candidate_end.strftime('%Y-%m-%d %H:%M')} | Conflicts: {dj.earliest_candidate_conflicts}")
                print(f"  CP-SAT Assigned Window    : {dj.assigned_start.strftime('%Y-%m-%d %H:%M')} -> {dj.assigned_end.strftime('%Y-%m-%d %H:%M')} | Conflicts: {dj.assigned_conflicts} (Delay: +{dj.delay_hours:.1f}h)")
                print(f"  Tradeoff Analysis         : {dj.reason}")
            print("================================================================================\n")
        print(f"\nDataset: {report.total_jobs} maintenance jobs | Reference Base Date: {report.reference_date}")
        print(f"Summary: {report.summary_statement}\n")

    finally:
        await db.disconnect()


if __name__ == "__main__":
    asyncio.run(main())

