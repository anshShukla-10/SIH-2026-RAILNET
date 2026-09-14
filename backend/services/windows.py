"""Candidate maintenance window generation service.

Split into:
1. build_window_slots: Pure function generating candidate time slots based on day/night preference
   and job duration within a 7-day horizon.
2. generate_candidate_windows: DB-orchestrator evaluating candidate windows against scheduled trains
   via conflict.find_conflicts to score conflict counts. If all initial candidate windows are conflicted,
   it widens search to 14 days and relaxes preference (marked as relaxed=True).
"""

from datetime import date, datetime, time, timedelta
from typing import Any, List, Optional, Tuple

from pydantic import BaseModel

from prisma import Prisma
from services.clock import get_base_date
from services.conflict import find_conflicts

# Window hour range definitions (FR4.1, FR4.2)
DAY_START_HOUR = 10
DAY_END_HOUR = 16

NIGHT_START_HOUR = 23
NIGHT_END_HOUR = 5  # Traffic-light overnight window (23:00 to 05:00 next morning)

HORIZON_DAYS = 7
WIDENED_HORIZON_DAYS = 14


class CandidateWindow(BaseModel):
    """Pydantic model representing a candidate maintenance block window with conflict count."""

    start: datetime
    end: datetime
    conflict_count: int
    relaxed: bool = False


def _get_val(job: Any, key: str, default: Any = None) -> Any:
    """Helper to retrieve attribute from either a dict or Prisma model instance."""
    if isinstance(job, dict):
        val = job.get(key, default)
    else:
        val = getattr(job, key, default)
    if hasattr(val, "value"):
        return val.value
    return val


def build_window_slots(job: Any, base_date: Optional[date] = None) -> List[Tuple[datetime, datetime]]:
    """Pure function: generate 3-5 candidate [start, end) time slots within the next 7 days.

    DAY windows fall in [10:00, 16:00].
    NIGHT windows fall in overnight block [23:00, 05:00].
    ANY windows draw from both DAY and NIGHT options.
    """
    anchor_date = base_date if base_date is not None else get_base_date()
    duration_min = int(_get_val(job, "duration_min", 120))
    duration_td = timedelta(minutes=duration_min)
    pref_raw = _get_val(job, "day_night_pref", "ANY")
    pref = str(pref_raw).upper()

    slots: List[Tuple[datetime, datetime]] = []

    def make_day_slot(day_offset: int, start_hour: int, start_min: int = 0) -> Tuple[datetime, datetime]:
        d = anchor_date + timedelta(days=day_offset)
        start_dt = datetime.combine(d, time(start_hour, start_min))
        max_end = datetime.combine(d, time(DAY_END_HOUR, 0))
        if start_dt + duration_td > max_end:
            start_dt = max_end - duration_td
        return start_dt, start_dt + duration_td

    def make_night_slot(day_offset: int, start_hour: int, start_min: int = 0) -> Tuple[datetime, datetime]:
        d = anchor_date + timedelta(days=day_offset)
        start_dt = datetime.combine(d, time(start_hour, start_min))
        if start_hour >= NIGHT_START_HOUR:
            max_end = datetime.combine(d + timedelta(days=1), time(NIGHT_END_HOUR, 0))
        else:
            max_end = datetime.combine(d, time(NIGHT_END_HOUR, 0))
        if start_dt + duration_td > max_end:
            start_dt = max_end - duration_td
        return start_dt, start_dt + duration_td

    if pref == "DAY":
        slots.append(make_day_slot(1, 10, 0))
        slots.append(make_day_slot(2, 12, 0))
        slots.append(make_day_slot(3, 11, 0))
        slots.append(make_day_slot(4, 13, 0))

    elif pref == "NIGHT":
        slots.append(make_night_slot(1, 23, 0))
        slots.append(make_night_slot(2, 23, 30))
        slots.append(make_night_slot(3, 0, 30))
        slots.append(make_night_slot(4, 1, 0))

    else:  # ANY preference
        slots.append(make_day_slot(1, 10, 0))
        slots.append(make_night_slot(1, 23, 0))
        slots.append(make_day_slot(2, 11, 30))
        slots.append(make_night_slot(2, 23, 30))

    return slots


def build_widened_window_slots(job: Any, base_date: Optional[date] = None) -> List[Tuple[datetime, datetime]]:
    """Pure helper: generate fallback candidate slots across a 14-day horizon,

    relaxing DAY/NIGHT constraints to ANY-style options.
    """
    anchor_date = base_date if base_date is not None else get_base_date()
    duration_min = int(_get_val(job, "duration_min", 120))
    duration_td = timedelta(minutes=duration_min)

    slots: List[Tuple[datetime, datetime]] = []

    for d_offset in range(1, WIDENED_HORIZON_DAYS + 1):
        d = anchor_date + timedelta(days=d_offset)

        # Daytime option
        day_start = datetime.combine(d, time(10, 0))
        max_day_end = datetime.combine(d, time(DAY_END_HOUR, 0))
        if day_start + duration_td <= max_day_end:
            slots.append((day_start, day_start + duration_td))

        # Nighttime option
        night_start = datetime.combine(d, time(23, 0))
        max_night_end = datetime.combine(d + timedelta(days=1), time(NIGHT_END_HOUR, 0))
        if night_start + duration_td <= max_night_end:
            slots.append((night_start, night_start + duration_td))

    return slots


async def generate_candidate_windows(
    job: Any,
    base_date: Optional[date] = None,
    db: Optional[Prisma] = None,
    cached_stops: Optional[List[Any]] = None,
) -> List[CandidateWindow]:
    """DB-orchestrator: builds slots, queries conflicts on section, and sorts zero-conflict first.

    If all initial candidate windows have conflict_count > 0, widens search to 14 days
    and tests relaxed daytime/nighttime options before declaring an unavoidable hard conflict.
    """
    anchor_date = base_date if base_date is not None else get_base_date()
    section_id = str(_get_val(job, "section_id"))
    slots = build_window_slots(job, anchor_date)

    initial_candidates: List[CandidateWindow] = []
    for start, end in slots:
        conflict_res = await find_conflicts(section_id, start, end, db=db)
        conflict_res = await find_conflicts(section_id, start, end, db=db, cached_stops=cached_stops)
        initial_candidates.append(
            CandidateWindow(
                start=start,
                end=end,
                conflict_count=conflict_res.conflict_count,
                relaxed=False,
            )
        )

    # If at least one zero-conflict candidate exists in initial set, return immediately
    if any(c.conflict_count == 0 for c in initial_candidates):
        initial_candidates.sort(key=lambda cw: (cw.conflict_count, cw.start))
        return initial_candidates

    # Widened search: 14-day horizon + relaxed preference
    widened_slots = build_widened_window_slots(job, base_date)
    relaxed_clean: List[CandidateWindow] = []
    relaxed_conflicted: List[CandidateWindow] = []

    for start, end in widened_slots:
        # Avoid duplicate checks if already evaluated in initial set
        if any(c.start == start and c.end == end for c in initial_candidates):
            continue

        conflict_res = await find_conflicts(section_id, start, end, db=db)
        conflict_res = await find_conflicts(section_id, start, end, db=db, cached_stops=cached_stops)
        cand = CandidateWindow(
            start=start,
            end=end,
            conflict_count=conflict_res.conflict_count,
            relaxed=True,
        )
        if cand.conflict_count == 0:
            relaxed_clean.append(cand)
            # 4 clean relaxed windows are plenty for the optimizer
            if len(relaxed_clean) >= 4:
                break
        else:
            relaxed_conflicted.append(cand)

    if relaxed_clean:
        relaxed_clean.sort(key=lambda cw: cw.start)
        # Put clean relaxed windows first, followed by original candidates
        return relaxed_clean + initial_candidates

    # Unavoidable hard case: return all candidates sorted by lowest conflict count
    all_candidates = initial_candidates + relaxed_conflicted
    all_candidates.sort(key=lambda cw: (cw.conflict_count, cw.start))
    return all_candidates[:5]
