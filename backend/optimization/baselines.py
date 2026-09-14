"""Naive heuristic schedulers for defensible benchmarking (PRD Section 13).

Provides pure baseline implementations to compare against the CP-SAT optimizer:
1. FCFS (First-Come, First-Served):
   Processes maintenance jobs in their original registration/seeded order (job_id ascending).
   Greedily assigns each job to its first candidate window that does not overlap any
   previously assigned window on the same section.
2. EDD (Earliest Due Date):
   Processes maintenance jobs sorted by their statutory completion due date ascending.
   Greedily assigns each job to its earliest non-overlapping candidate window.

Both schedulers are pure functions (no database access) that return lists of standard
Assignment objects from optimization.solver.

Greedy Fallback Invariant:
If all candidate windows for a job overlap with already scheduled blocks on that section,
the scheduler assigns window index 0 (earliest window). This preserves the 100% assignment
invariant (len(assignments) == len(jobs)) while legitimately creating section NoOverlap
violations that benchmark metrics will detect and report.
"""

from collections import defaultdict
from datetime import date, datetime
from typing import Any, Dict, List

from optimization.solver import Assignment, _get_val


def _has_section_overlap(
    start: datetime,
    end: datetime,
    existing_intervals: List[tuple[datetime, datetime]],
) -> bool:
    """Check if time range [start, end) overlaps with any existing interval [s, e)."""
    for prev_start, prev_end in existing_intervals:
        if start < prev_end and end > prev_start:
            return True
    return False


def _due_date_sort_key(job: Dict[str, Any]) -> Any:
    """Extract comparable date for EDD sorting."""
    d = job.get("due_date")
    if isinstance(d, datetime):
        return d.date()
    if isinstance(d, date):
        return d
    if isinstance(d, str):
        try:
            return date.fromisoformat(d.split("T")[0])
        except Exception:
            pass
    return date.max


def solve_fcfs(jobs_with_candidates: List[Dict[str, Any]]) -> List[Assignment]:
    """Pure function: schedules jobs in First-Come, First-Served order.

    Order: sorted by job_id ascending (creation/seeded order).
    Assignment: first candidate window with zero section overlap.
    Fallback: if all windows overlap, assigns window 0 (double-booking reported by metrics).
    """
    if not jobs_with_candidates:
        return []

    # Process in creation order (job_id ascending or created_order if present)
    sorted_jobs = sorted(
        jobs_with_candidates,
        key=lambda j: j.get("created_order", str(j.get("job_id", ""))),
    )

    assigned_by_section: Dict[str, List[tuple[datetime, datetime]]] = defaultdict(list)
    assignments: List[Assignment] = []

    for job in sorted_jobs:
        section_id = str(job["section_id"])
        raw_windows = job.get("candidate_windows", [])
        if not raw_windows:
            raise ValueError(f"Job {job.get('job_id')} has zero candidate windows.")

        # Heuristic baseline assigns earliest available candidate window chronologically
        windows = sorted(raw_windows, key=lambda w: _get_val(w, "start"))

        chosen_win = None
        chosen_w_idx = 0

        # Greedily pick first window chronologically with no section collision
        for w_idx, win in enumerate(windows):
            w_start = _get_val(win, "start")
            w_end = _get_val(win, "end")
            if not _has_section_overlap(w_start, w_end, assigned_by_section[section_id]):
                chosen_win = win
                chosen_w_idx = w_idx
                break

        # Fallback: if all candidate windows overlap on this section, assign earliest window
        if chosen_win is None:
            chosen_win = windows[0]
            chosen_w_idx = 0

        w_start = _get_val(chosen_win, "start")
        w_end = _get_val(chosen_win, "end")
        assigned_by_section[section_id].append((w_start, w_end))

        conflicts = int(_get_val(chosen_win, "conflict_count", 0))
        relaxed = bool(_get_val(chosen_win, "relaxed", False))
        hard_conflict = bool(conflicts > 0)

        assignments.append(
            Assignment(
                job_id=str(job["job_id"]),
                section_id=section_id,
                start=w_start,
                end=w_end,
                conflict_count=conflicts,
                priority_score=float(job.get("priority_score", 0.0) or 0.0),
                window_rank=chosen_w_idx,
                relaxed=relaxed,
                hard_conflict=hard_conflict,
            )
        )

    return assignments


def solve_edd(jobs_with_candidates: List[Dict[str, Any]]) -> List[Assignment]:
    """Pure function: schedules jobs in Earliest Due Date order.

    Order: sorted by due_date ascending (tie-breaker: job_id ascending).
    Assignment: first candidate window with zero section overlap.
    Fallback: if all windows overlap, assigns window 0 (double-booking reported by metrics).
    """
    if not jobs_with_candidates:
        return []

    # Process sorted by statutory due_date ascending
    sorted_jobs = sorted(
        jobs_with_candidates,
        key=lambda j: (
            _due_date_sort_key(j),
            j.get("created_order", str(j.get("job_id", ""))),
        ),
    )

    assigned_by_section: Dict[str, List[tuple[datetime, datetime]]] = defaultdict(list)
    assignments: List[Assignment] = []

    for job in sorted_jobs:
        section_id = str(job["section_id"])
        raw_windows = job.get("candidate_windows", [])
        if not raw_windows:
            raise ValueError(f"Job {job.get('job_id')} has zero candidate windows.")

        # Heuristic baseline assigns earliest available candidate window chronologically
        windows = sorted(raw_windows, key=lambda w: _get_val(w, "start"))

        chosen_win = None
        chosen_w_idx = 0

        # Greedily pick first window chronologically with no section collision
        for w_idx, win in enumerate(windows):
            w_start = _get_val(win, "start")
            w_end = _get_val(win, "end")
            if not _has_section_overlap(w_start, w_end, assigned_by_section[section_id]):
                chosen_win = win
                chosen_w_idx = w_idx
                break

        # Fallback: if all candidate windows overlap on this section, assign earliest window
        if chosen_win is None:
            chosen_win = windows[0]
            chosen_w_idx = 0

        w_start = _get_val(chosen_win, "start")
        w_end = _get_val(chosen_win, "end")
        assigned_by_section[section_id].append((w_start, w_end))

        conflicts = int(_get_val(chosen_win, "conflict_count", 0))
        relaxed = bool(_get_val(chosen_win, "relaxed", False))
        hard_conflict = bool(conflicts > 0)

        assignments.append(
            Assignment(
                job_id=str(job["job_id"]),
                section_id=section_id,
                start=w_start,
                end=w_end,
                conflict_count=conflicts,
                priority_score=float(job.get("priority_score", 0.0) or 0.0),
                window_rank=chosen_w_idx,
                relaxed=relaxed,
                hard_conflict=hard_conflict,
            )
        )

    return assignments
