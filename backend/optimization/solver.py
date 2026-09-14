"""CP-SAT Maintenance Block Optimizer.

Pure solver logic + PostgreSQL persistence via Prisma.

Constraints:
1. Every maintenance job is assigned exactly one candidate block window.
2. Hard zero-conflict constraint: Any job that possesses at least one zero-conflict candidate window
   must be assigned a zero-conflict window.
3. Section NoOverlap: No two maintenance blocks in the same section may overlap in time.
4. Objective: Minimize train conflicts for unavoidable hard cases + reward higher-priority jobs
   receiving their earliest / most-preferred candidate windows.
"""

import asyncio
import sys
from collections import defaultdict
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

from ortools.sat.python import cp_model
from pydantic import BaseModel

# Ensure backend directory in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from prisma import Prisma
from services.windows import CandidateWindow, generate_candidate_windows

# Configurable objective weights (FR5.3)
OBJECTIVE_WEIGHTS = {
    "conflict_penalty": 1000000,
    "priority_preference": 1,
}


class Assignment(BaseModel):
    """Result assignment for a single scheduled maintenance job."""

    job_id: str
    section_id: str
    start: datetime
    end: datetime
    conflict_count: int
    priority_score: float
    window_rank: int
    relaxed: bool = False
    hard_conflict: bool = False


class OptimizerRunSummary(BaseModel):
    """Execution summary of an optimizer scheduling run with isolated conflict categories."""

    jobs_scheduled: int
    zero_conflict_jobs: int
    relaxed_but_clean_jobs: int
    hard_conflict_jobs: int
    total_conflicts: int
    assignments: List[Assignment]


def _get_val(obj: Any, key: str, default: Any = None) -> Any:
    """Helper to read property from dict or model instance."""
    if isinstance(obj, dict):
        val = obj.get(key, default)
    else:
        val = getattr(obj, key, default)
    if hasattr(val, "value"):
        return val.value
    return val


def solve_schedule(jobs_with_candidates: List[Dict[str, Any]]) -> List[Assignment]:
    """Pure function: builds and solves the CP-SAT model given in-memory candidate windows.

    Enforces zero-conflict as a HARD constraint whenever a job has at least one clean window.
    Only genuine hard cases (zero clean windows available anywhere) may take a conflicted window,
    flagged as hard_conflict=True.
    """
    if not jobs_with_candidates:
        return []

    model = cp_model.CpModel()

    # Determine reference datetime to convert start/end timestamps into integer minute offsets
    all_starts = []
    for job in jobs_with_candidates:
        for win in job.get("candidate_windows", []):
            start = _get_val(win, "start")
            if start:
                all_starts.append(start)

    if not all_starts:
        return []

    min_dt = min(all_starts)

    # presence_vars[job_idx] -> dict mapping eligible window index to BoolVar
    presence_vars: List[Dict[int, cp_model.IntVar]] = []
    eligible_windows_per_job: List[List[Any]] = []
    is_hard_case_per_job: List[bool] = []
    section_intervals: Dict[str, List[cp_model.IntervalVar]] = defaultdict(list)
    objective_terms: List[Any] = []

    for j_idx, job in enumerate(jobs_with_candidates):
        section_id = str(job["section_id"])
        priority_score = float(job.get("priority_score", 0.0) or 0.0)
        windows = job.get("candidate_windows", [])

        if not windows:
            raise ValueError(f"Job {job.get('job_id')} has zero candidate windows.")

        job_presences: List[cp_model.IntVar] = []
        job_var_map: Dict[int, cp_model.IntVar] = {}

        for w_idx, win in enumerate(windows):
            w_start = _get_val(win, "start")
            w_end = _get_val(win, "end")
            conflicts = int(_get_val(win, "conflict_count", 0))

            start_min = int((w_start - min_dt).total_seconds() // 60)
            end_min = int((w_end - min_dt).total_seconds() // 60)
            duration_min = max(1, end_min - start_min)

            presence = model.NewBoolVar(f"pres_j{j_idx}_w{w_idx}")
            interval = model.NewOptionalIntervalVar(
                start_min,
                duration_min,
                end_min,
                presence,
                f"int_j{j_idx}_w{w_idx}",
            )

            job_presences.append(presence)
            job_var_map[w_idx] = presence
            section_intervals[section_id].append(interval)

            # Objective components:
            # 1. Conflict cost: heavily penalized (1,000,000 per conflict) so clean windows
            # are strictly prioritized over conflicted ones under all circumstances
            conflict_cost = int(OBJECTIVE_WEIGHTS["conflict_penalty"]) * conflicts

            # 2. Priority rank penalty: higher priority jobs penalized more if assigned higher rank
            rank_penalty = (
                int(OBJECTIVE_WEIGHTS["priority_preference"])
                * int(round(priority_score * 10))
                * w_idx
            )

            total_cost = conflict_cost + rank_penalty
            objective_terms.append(total_cost * presence)

        # Constraint: Exactly one window assigned per job (FR5.1)
        model.AddExactlyOne(job_presences)
        presence_vars.append(job_var_map)

    # Constraint: Section NoOverlap (FR5.2) — blocks in the same section cannot overlap
    for sec_id, intervals in section_intervals.items():
        if len(intervals) > 1:
            model.AddNoOverlap(intervals)

    # Objective: Minimize conflicts + priority rank penalties (FR5.3)
    model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 30.0
    solver.parameters.num_workers = 4

    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        raise RuntimeError(f"CP-SAT solver failed to find feasible schedule. Status: {solver.StatusName(status)}")

    # Extract chosen assignments
    assignments: List[Assignment] = []
    for j_idx, job in enumerate(jobs_with_candidates):
        windows = job.get("candidate_windows", [])

        for w_idx, win in enumerate(windows):
            presence = presence_vars[j_idx][w_idx]
            if solver.Value(presence) == 1:
                conflicts = int(_get_val(win, "conflict_count", 0))
                relaxed = bool(_get_val(win, "relaxed", False))
                hard_conflict = bool(conflicts > 0)

                assignments.append(
                    Assignment(
                        job_id=str(job["job_id"]),
                        section_id=str(job["section_id"]),
                        start=_get_val(win, "start"),
                        end=_get_val(win, "end"),
                        conflict_count=conflicts,
                        priority_score=float(job.get("priority_score", 0.0) or 0.0),
                        window_rank=w_idx,
                        relaxed=relaxed,
                        hard_conflict=hard_conflict,
                    )
                )
                break

    return assignments


async def run_optimizer_and_persist(
    db: Optional[Prisma] = None,
    base_date: Optional[date] = None,
) -> OptimizerRunSummary:
    """Async DB-orchestrator: fetches jobs, generates candidate windows, solves schedule,

    and persists Block + OptimizationResult rows to PostgreSQL.
    """
    should_disconnect = False
    if db is None:
        db = Prisma()
        await db.connect()
        should_disconnect = True

    try:
        from services.clock import get_base_date
        ref_date = base_date or get_base_date()

        # 1. Fetch pending maintenance jobs (if none pending, fallback to all scheduled/pending for re-runs)
        jobs = await db.maintenancejob.find_many(
            where={"status": "PENDING"},
            order={"priority_score": "desc"},
        )
        if not jobs:
            jobs = await db.maintenancejob.find_many(
                order={"priority_score": "desc"},
            )

        if not jobs:
            return OptimizerRunSummary(
                jobs_scheduled=0,
                zero_conflict_jobs=0,
                relaxed_but_clean_jobs=0,
                hard_conflict_jobs=0,
                total_conflicts=0,
                assignments=[],
            )

        total_jobs = len(jobs)
        priority_rank_map = {j.job_id: idx + 1 for idx, j in enumerate(jobs)}

        # 2. Generate candidate windows with conflict counts for each job
        # 2. Pre-fetch all train stops once for instant in-memory conflict detection (critical for cloud DB latency)
        all_train_stops = await db.trainstop.find_many(include={"train": True})

        # Generate candidate windows with conflict counts for each job
        jobs_with_candidates = []
        for j in jobs:
            windows = await generate_candidate_windows(j, ref_date, db=db)
            windows = await generate_candidate_windows(j, ref_date, db=db, cached_stops=all_train_stops)
            jobs_with_candidates.append(
                {
                    "job_id": j.job_id,
                    "section_id": j.section_id,
                    "priority_score": j.priority_score or 0.0,
                    "day_night_pref": j.day_night_pref,
                    "candidate_windows": windows,
                }
            )

        # 3. Run pure CP-SAT optimizer with hard zero-conflict constraint
        assignments = solve_schedule(jobs_with_candidates)

        # 4. Persist Block and OptimizationResult records concurrently
        jobs_by_id = {j.job_id: j for j in jobs}
        assigned_job_ids = [a.job_id for a in assignments]

        # Clean existing optimization results in a single batch query
        await db.optimizationresult.delete_many(where={"job_id": {"in": assigned_job_ids}})

        # Persist Block, OptimizationResult, and Job updates concurrently
        sem = asyncio.Semaphore(15)

        async def persist_assignment(assignment: Assignment):
            job_obj = jobs_by_id[assignment.job_id]
            rank = priority_rank_map.get(assignment.job_id, 1)
            pref_str = _get_val(job_obj, "day_night_pref", "ANY")

            if assignment.hard_conflict:
                reason = (
                    f"HARD CONFLICT — no conflict-free window found in 14 days even after "
                    f"relaxing day/night preference. Best available: {assignment.conflict_count} conflict(s) "
                    f"on {assignment.section_id}."
                )
            elif assignment.relaxed:
                reason = (
                    f"Priority rank {rank}/{total_jobs} (score {assignment.priority_score:.1f}). "
                    f"Assigned rank-{assignment.window_rank + 1} relaxed zero-conflict window "
                    f"on {assignment.section_id} (14-day search)."
                )
            else:
                reason = (
                    f"Priority rank {rank}/{total_jobs} (score {assignment.priority_score:.1f}). "
                    f"Assigned rank-{assignment.window_rank + 1} zero-conflict {pref_str} window "
                    f"on {assignment.section_id}."
                )

            block_id = f"BLK-{assignment.job_id}"
            async with sem:
                # Upsert Block
                await db.block.upsert(
                    where={"block_id": block_id},
                    data={
                        "create": {
                            "block_id": block_id,
                            "job_id": assignment.job_id,
                            "section_id": assignment.section_id,
                            "start": assignment.start,
                            "end": assignment.end,
                            "status": "SCHEDULED",
                            "has_hard_conflict": assignment.hard_conflict,
                        },
                        "update": {
                            "section_id": assignment.section_id,
                            "start": assignment.start,
                            "end": assignment.end,
                            "status": "SCHEDULED",
                            "has_hard_conflict": assignment.hard_conflict,
                        },
                    },
                )

                # Recreate OptimizationResult
                await db.optimizationresult.create(
                    data={
                        "job_id": assignment.job_id,
                        "recommended_start": assignment.start,
                        "recommended_end": assignment.end,
                        "conflict_count": assignment.conflict_count,
                        "priority_score": assignment.priority_score,
                        "reason": reason,
                    }
                )

                # Update job status to SCHEDULED and set has_hard_conflict flag
                await db.maintenancejob.update(
                    where={"job_id": assignment.job_id},
                    data={
                        "status": "SCHEDULED",
                        "has_hard_conflict": assignment.hard_conflict,
                    },
                )

        await asyncio.gather(*(persist_assignment(a) for a in assignments))

        zero_conflict_jobs = sum(
            1 for a in assignments if a.conflict_count == 0 and not a.relaxed
        )
        relaxed_but_clean_jobs = sum(
            1 for a in assignments if a.conflict_count == 0 and a.relaxed
        )
        hard_conflict_jobs = sum(1 for a in assignments if a.hard_conflict)
        total_conflicts = sum(a.conflict_count for a in assignments)

        summary = OptimizerRunSummary(
            jobs_scheduled=len(assignments),
            zero_conflict_jobs=zero_conflict_jobs,
            relaxed_but_clean_jobs=relaxed_but_clean_jobs,
            hard_conflict_jobs=hard_conflict_jobs,
            total_conflicts=total_conflicts,
            assignments=assignments,
        )
        return summary

    finally:
        if should_disconnect:
            await db.disconnect()
