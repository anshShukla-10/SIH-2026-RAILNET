"""Regression tests verifying pipeline determinism under DEMO_BASE_DATE pinning."""

import os
from datetime import date

import pytest
from prisma import Prisma

from optimization.solver import run_optimizer_and_persist
from scripts.seed_real_timetable import seed_real_timetable
from scripts.seed_synthetic_jobs import seed_synthetic_jobs
from services.clock import get_base_date


def test_get_base_date_env_override_and_fallback(monkeypatch):
    """Test get_base_date helper prioritizes DEMO_BASE_DATE and falls back to calendar today."""
    # 1. When DEMO_BASE_DATE is explicitly set, it returns the parsed date
    monkeypatch.setenv("DEMO_BASE_DATE", "2026-09-07")
    pinned = get_base_date()
    assert pinned == date(2026, 9, 7)

    # 2. When DEMO_BASE_DATE is unset, it falls back to date.today()
    monkeypatch.delenv("DEMO_BASE_DATE", raising=False)
    live_today = get_base_date()
    assert live_today == date.today()

    # 3. Invalid format falls back to date.today() safely without crashing
    monkeypatch.setenv("DEMO_BASE_DATE", "invalid-date-string")
    assert get_base_date() == date.today()


def test_end_to_end_determinism_with_pinned_base_date(monkeypatch):
    """End-to-end regression test: seed -> generate-candidates -> solve_schedule.

    Asserts that two consecutive runs with identical DEMO_BASE_DATE produce
    byte-identical assignment outcomes, metrics, and window choices.
    """
    import asyncio

    async def _run():
        pinned_str = "2026-09-07"
        monkeypatch.setenv("DEMO_BASE_DATE", pinned_str)
        pinned_date = date(2026, 9, 7)

        db = Prisma()
        await db.connect()

        try:
            # Run 1: Full Seed & Solve
            await seed_real_timetable()
            await seed_synthetic_jobs()
            summary_1 = await run_optimizer_and_persist(db=db, base_date=pinned_date)

            # Run 2: Full Seed & Solve again (idempotent fresh seed cycle)
            await seed_real_timetable()
            await seed_synthetic_jobs()
            summary_2 = await run_optimizer_and_persist(db=db, base_date=pinned_date)

            # 1. Summary counts must match exactly
            assert summary_1.jobs_scheduled == summary_2.jobs_scheduled
            assert summary_1.zero_conflict_jobs == summary_2.zero_conflict_jobs
            assert summary_1.relaxed_but_clean_jobs == summary_2.relaxed_but_clean_jobs
            assert summary_1.hard_conflict_jobs == summary_2.hard_conflict_jobs
            assert summary_1.total_conflicts == summary_2.total_conflicts

            # 2. Extract assignment tuples: (section_id, start, end, conflict_count, window_rank, relaxed, hard_conflict)
            assignments_1 = {
                a.job_id: (
                    a.section_id,
                    a.start,
                    a.end,
                    a.conflict_count,
                    a.window_rank,
                    a.relaxed,
                    a.hard_conflict,
                )
                for a in summary_1.assignments
            }

            assignments_2 = {
                a.job_id: (
                    a.section_id,
                    a.start,
                    a.end,
                    a.conflict_count,
                    a.window_rank,
                    a.relaxed,
                    a.hard_conflict,
                )
                for a in summary_2.assignments
            }

            assert assignments_1 == assignments_2, "Consecutive pinned runs must yield identical job assignments"

        finally:
            await db.disconnect()

    asyncio.run(_run())
