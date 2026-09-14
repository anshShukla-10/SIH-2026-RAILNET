"""Unit tests for Candidate Window generation and CP-SAT Solver."""

from datetime import date, datetime, time, timedelta
from typing import List

import pytest

from optimization.solver import (
    OBJECTIVE_WEIGHTS,
    Assignment,
    solve_schedule,
)
from services.windows import (
    DAY_END_HOUR,
    DAY_START_HOUR,
    NIGHT_END_HOUR,
    NIGHT_START_HOUR,
    CandidateWindow,
    build_widened_window_slots,
    build_window_slots,
)


def test_build_window_slots_day_night_and_any():
    """Test build_window_slots with fixed base date produces valid hour ranges and exact durations."""
    fixed_base = date(2026, 9, 7)  # Monday

    # 1. DAY preference (120 minutes)
    job_day = {"duration_min": 120, "day_night_pref": "DAY"}
    slots_day = build_window_slots(job_day, fixed_base)
    assert 3 <= len(slots_day) <= 5
    for start, end in slots_day:
        assert end - start == timedelta(minutes=120)
        assert start.date() >= fixed_base
        assert start.time() >= time(DAY_START_HOUR, 0)
        assert end.time() <= time(DAY_END_HOUR, 0)

    # 2. NIGHT preference (180 minutes)
    job_night = {"duration_min": 180, "day_night_pref": "NIGHT"}
    slots_night = build_window_slots(job_night, fixed_base)
    assert 3 <= len(slots_night) <= 5
    for start, end in slots_night:
        assert end - start == timedelta(minutes=180)
        is_late_night = start.hour >= NIGHT_START_HOUR
        is_early_morning = start.hour < NIGHT_END_HOUR
        assert is_late_night or is_early_morning
        assert end.time() <= time(NIGHT_END_HOUR, 0) or end.time() >= time(NIGHT_START_HOUR, 0)

    # 3. ANY preference (90 minutes)
    job_any = {"duration_min": 90, "day_night_pref": "ANY"}
    slots_any = build_window_slots(job_any, fixed_base)
    assert 3 <= len(slots_any) <= 5
    for start, end in slots_any:
        assert end - start == timedelta(minutes=90)
    has_day = any(start.time() >= time(DAY_START_HOUR, 0) and end.time() <= time(DAY_END_HOUR, 0) for start, end in slots_any)
    has_night = any(start.hour >= NIGHT_START_HOUR or start.hour < NIGHT_END_HOUR for start, end in slots_any)
    assert has_day and has_night


def test_build_widened_window_slots():
    """Test that widened window generation extends across 14 days and provides both day and night slots."""
    fixed_base = date(2026, 9, 7)
    job = {"duration_min": 120, "day_night_pref": "DAY"}
    widened = build_widened_window_slots(job, fixed_base)
    assert len(widened) > 10
    # Spans up to day 14
    latest_start = max(s[0] for s in widened)
    assert latest_start.date() == fixed_base + timedelta(days=14)


def test_solve_schedule_section_no_overlap_and_single_assignment():
    """Test that solver assigns exactly one window per job, enforces section NoOverlap,

    and chooses zero-conflict windows when available.
    """
    t0 = datetime(2026, 9, 8, 10, 0)
    t1 = datetime(2026, 9, 8, 12, 0)
    t2 = datetime(2026, 9, 8, 13, 0)
    t3 = datetime(2026, 9, 8, 15, 0)
    t4 = datetime(2026, 9, 9, 10, 0)
    t5 = datetime(2026, 9, 9, 12, 0)

    # SEC-A: Two jobs competing for overlapping windows
    job1 = {
        "job_id": "JOB-1",
        "section_id": "SEC-A",
        "priority_score": 75.0,
        "candidate_windows": [
            CandidateWindow(start=t0, end=t1, conflict_count=0),
            CandidateWindow(start=t2, end=t3, conflict_count=0),
        ],
    }

    job2 = {
        "job_id": "JOB-2",
        "section_id": "SEC-A",
        "priority_score": 60.0,
        "candidate_windows": [
            CandidateWindow(start=t0, end=t1, conflict_count=0),
            CandidateWindow(start=t2, end=t3, conflict_count=0),
            CandidateWindow(start=t4, end=t5, conflict_count=0),
        ],
    }

    # SEC-B: Independent section with one window having a conflict
    job3 = {
        "job_id": "JOB-3",
        "section_id": "SEC-B",
        "priority_score": 85.0,
        "candidate_windows": [
            CandidateWindow(start=t0, end=t1, conflict_count=0),
        ],
    }

    job4 = {
        "job_id": "JOB-4",
        "section_id": "SEC-B",
        "priority_score": 45.0,
        "candidate_windows": [
            CandidateWindow(start=t0, end=t1, conflict_count=3),
            CandidateWindow(start=t2, end=t3, conflict_count=0),
        ],
    }

    synthetic_jobs = [job1, job2, job3, job4]
    assignments = solve_schedule(synthetic_jobs)

    # 1. Exactly one assignment per job
    assert len(assignments) == 4
    assigned_ids = {a.job_id for a in assignments}
    assert assigned_ids == {"JOB-1", "JOB-2", "JOB-3", "JOB-4"}

    # 2. Direct check of Section NoOverlap on the output
    assignments_by_sec = {}
    for a in assignments:
        assignments_by_sec.setdefault(a.section_id, []).append(a)

    for sec_id, sec_assignments in assignments_by_sec.items():
        for i in range(len(sec_assignments)):
            for j in range(i + 1, len(sec_assignments)):
                a1 = sec_assignments[i]
                a2 = sec_assignments[j]
                no_overlap = (a1.start >= a2.end) or (a2.start >= a1.end)
                assert no_overlap, f"Section {sec_id} has overlapping assignments: {a1} and {a2}"

    # 3. Zero total conflicts since zero-conflict windows exist for all jobs
    total_conflicts = sum(a.conflict_count for a in assignments)
    assert total_conflicts == 0


def test_higher_priority_job_wins_earlier_preferred_window():
    """Test that when two jobs on the same section compete for the same slot,

    the higher priority job receives the rank-0 preferred window.
    """
    slot_preferred = (datetime(2026, 9, 8, 10, 0), datetime(2026, 9, 8, 12, 0))
    slot_secondary = (datetime(2026, 9, 9, 10, 0), datetime(2026, 9, 9, 12, 0))

    job_high = {
        "job_id": "JOB-HIGH",
        "section_id": "SEC-COMPETE",
        "priority_score": 90.0,
        "candidate_windows": [
            CandidateWindow(start=slot_preferred[0], end=slot_preferred[1], conflict_count=0),
            CandidateWindow(start=slot_secondary[0], end=slot_secondary[1], conflict_count=0),
        ],
    }

    job_low = {
        "job_id": "JOB-LOW",
        "section_id": "SEC-COMPETE",
        "priority_score": 25.0,
        "candidate_windows": [
            CandidateWindow(start=slot_preferred[0], end=slot_preferred[1], conflict_count=0),
            CandidateWindow(start=slot_secondary[0], end=slot_secondary[1], conflict_count=0),
        ],
    }

    assignments = solve_schedule([job_low, job_high])
    res_map = {a.job_id: a for a in assignments}

    assert res_map["JOB-HIGH"].window_rank == 0
    assert res_map["JOB-HIGH"].start == slot_preferred[0]

    assert res_map["JOB-LOW"].window_rank == 1
    assert res_map["JOB-LOW"].start == slot_secondary[0]


def test_saturated_section_unavoidable_hard_conflict():
    """Test that when a section has zero clean windows even after widening,

    the job is marked hard_conflict=True, while clean jobs on other sections still get conflict_count == 0.
    """
    job_normal = {
        "job_id": "JOB-CLEAN",
        "section_id": "SEC-CLEAR",
        "priority_score": 70.0,
        "candidate_windows": [
            CandidateWindow(start=datetime(2026, 9, 8, 10, 0), end=datetime(2026, 9, 8, 12, 0), conflict_count=0),
            CandidateWindow(start=datetime(2026, 9, 8, 13, 0), end=datetime(2026, 9, 8, 15, 0), conflict_count=0),
        ],
    }

    # Highly saturated section: all available options have train conflicts
    job_saturated = {
        "job_id": "JOB-SATURATED",
        "section_id": "SEC-CONGESTED",
        "priority_score": 85.0,
        "candidate_windows": [
            CandidateWindow(start=datetime(2026, 9, 8, 10, 0), end=datetime(2026, 9, 8, 12, 0), conflict_count=3),
            CandidateWindow(start=datetime(2026, 9, 9, 10, 0), end=datetime(2026, 9, 9, 12, 0), conflict_count=1),
            CandidateWindow(start=datetime(2026, 9, 10, 10, 0), end=datetime(2026, 9, 10, 12, 0), conflict_count=2),
        ],
    }

    assignments = solve_schedule([job_normal, job_saturated])
    res_map = {a.job_id: a for a in assignments}

    # Saturated job must be explicitly flagged as hard_conflict
    assert res_map["JOB-SATURATED"].hard_conflict is True
    # Picks the best available window (1 conflict instead of 2 or 3)
    assert res_map["JOB-SATURATED"].conflict_count == 1
    assert res_map["JOB-SATURATED"].start == datetime(2026, 9, 9, 10, 0)

    # Clean job must remain zero-conflict and NOT marked hard_conflict
    assert res_map["JOB-CLEAN"].hard_conflict is False
    assert res_map["JOB-CLEAN"].conflict_count == 0


def test_relaxed_widened_window_avoids_hard_conflict():
    """Test that when initial windows are conflicted, a clean relaxed candidate from a 14-day search

    is selected and is NOT marked hard_conflict.
    """
    job_relaxed = {
        "job_id": "JOB-RELAXED",
        "section_id": "SEC-BUSY-INITIALLY",
        "priority_score": 68.0,
        "candidate_windows": [
            # Initial windows were conflicted
            CandidateWindow(start=datetime(2026, 9, 8, 10, 0), end=datetime(2026, 9, 8, 12, 0), conflict_count=2, relaxed=False),
            CandidateWindow(start=datetime(2026, 9, 9, 10, 0), end=datetime(2026, 9, 9, 12, 0), conflict_count=1, relaxed=False),
            # Relaxed widened window is clean
            CandidateWindow(start=datetime(2026, 9, 16, 23, 0), end=datetime(2026, 9, 17, 1, 0), conflict_count=0, relaxed=True),
        ],
    }

    assignments = solve_schedule([job_relaxed])
    assert len(assignments) == 1
    a = assignments[0]

    # Hard zero-conflict constraint forced selection of the clean window
    assert a.conflict_count == 0
    assert a.hard_conflict is False
    assert a.relaxed is True
    assert a.start == datetime(2026, 9, 16, 23, 0)


def test_objective_weights_dict_configured():
    """Test that OBJECTIVE_WEIGHTS dict is properly defined at module top."""
    assert "conflict_penalty" in OBJECTIVE_WEIGHTS
    assert "priority_preference" in OBJECTIVE_WEIGHTS
    assert OBJECTIVE_WEIGHTS["conflict_penalty"] > OBJECTIVE_WEIGHTS["priority_preference"]
