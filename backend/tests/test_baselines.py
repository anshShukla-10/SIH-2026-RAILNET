"""Unit and integration tests for FCFS and EDD baselines and Defensible Benchmarking (PRD Section 13)."""

from datetime import date, datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from api.main import app
from optimization.baselines import solve_fcfs, solve_edd
from services.windows import CandidateWindow
from services.benchmark import compute_schedule_metrics
from prisma import Prisma


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture with lifespan startup and shutdown."""
    with TestClient(app) as c:
        yield c


def test_fcfs_and_edd_assignment_invariants():
    """Both FCFS and EDD heuristics must return exactly 1 assignment per input job."""
    jobs = [
        {
            "job_id": f"JOB-{i}",
            "section_id": f"SEC-{i % 2}",
            "created_at": datetime(2026, 9, 1, 10, 0) + timedelta(hours=i),
            "due_date": datetime(2026, 9, 10, 10, 0) - timedelta(hours=i),
            "priority_score": 50.0 + i,
            "candidate_windows": [
                CandidateWindow(
                    start=datetime(2026, 9, 7, 10, 0) + timedelta(days=w),
                    end=datetime(2026, 9, 7, 12, 0) + timedelta(days=w),
                    conflict_count=w % 2,
                )
                for w in range(3)
            ],
        }
        for i in range(5)
    ]

    fcfs_assignments = solve_fcfs(jobs)
    edd_assignments = solve_edd(jobs)

    assert len(fcfs_assignments) == 5
    assert len(edd_assignments) == 5

    fcfs_ids = {a.job_id for a in fcfs_assignments}
    edd_ids = {a.job_id for a in edd_assignments}
    expected_ids = {j["job_id"] for j in jobs}

    assert fcfs_ids == expected_ids
    assert edd_ids == expected_ids


def test_fcfs_greedy_no_overlap_and_fallback():
    """FCFS must avoid section overlap greedily, and cleanly fallback if all options overlap."""
    # Two jobs on SEC-TEST competing for the exact same time window
    job1 = {
        "job_id": "JOB-1",
        "section_id": "SEC-TEST",
        "created_at": datetime(2026, 9, 1, 8, 0),
        "due_date": datetime(2026, 9, 15, 8, 0),
        "priority_score": 50.0,
        "candidate_windows": [
            CandidateWindow(
                start=datetime(2026, 9, 7, 10, 0),
                end=datetime(2026, 9, 7, 12, 0),
                conflict_count=0,
            ),
            CandidateWindow(
                start=datetime(2026, 9, 8, 10, 0),
                end=datetime(2026, 9, 8, 12, 0),
                conflict_count=0,
            ),
        ],
    }
    job2 = {
        "job_id": "JOB-2",
        "section_id": "SEC-TEST",
        "created_at": datetime(2026, 9, 1, 9, 0),  # Arrived second
        "due_date": datetime(2026, 9, 15, 8, 0),
        "priority_score": 60.0,
        "candidate_windows": [
            CandidateWindow(
                start=datetime(2026, 9, 7, 10, 0),  # Collides with JOB-1 window 0
                end=datetime(2026, 9, 7, 12, 0),
                conflict_count=0,
            ),
            CandidateWindow(
                start=datetime(2026, 9, 8, 10, 0),  # Free window
                end=datetime(2026, 9, 8, 12, 0),
                conflict_count=0,
            ),
        ],
    }

    # Under FCFS, JOB-1 gets window 0 (Sept 7).
    # JOB-2 cannot take Sept 7 without section overlap, so it takes Sept 8.
    fcfs_assignments = solve_fcfs([job1, job2])
    mapping = {a.job_id: a for a in fcfs_assignments}
    assert mapping["JOB-1"].start == datetime(2026, 9, 7, 10, 0)
    assert mapping["JOB-2"].start == datetime(2026, 9, 8, 10, 0)

    # Job 3 only has candidates that collide with already assigned windows on SEC-TEST
    job3 = {
        "job_id": "JOB-3",
        "section_id": "SEC-TEST",
        "created_at": datetime(2026, 9, 1, 10, 0),
        "due_date": datetime(2026, 9, 15, 8, 0),
        "priority_score": 40.0,
        "candidate_windows": [
            CandidateWindow(
                start=datetime(2026, 9, 7, 10, 0),  # Collides
                end=datetime(2026, 9, 7, 12, 0),
                conflict_count=0,
            ),
        ],
    }
    fcfs_all = solve_fcfs([job1, job2, job3])
    assert len(fcfs_all) == 3
    # Check that fallback assigned window 0 to JOB-3
    map_all = {a.job_id: a for a in fcfs_all}
    assert map_all["JOB-3"].start == datetime(2026, 9, 7, 10, 0)


def test_edd_orders_differently_from_fcfs():
    """EDD must prioritize by due_date ascending, reversing FCFS order when later job has earlier deadline."""
    shared_window = CandidateWindow(
        start=datetime(2026, 9, 7, 10, 0),
        end=datetime(2026, 9, 7, 12, 0),
        conflict_count=0,
    )
    alternative_window = CandidateWindow(
        start=datetime(2026, 9, 8, 10, 0),
        end=datetime(2026, 9, 8, 12, 0),
        conflict_count=0,
    )

    job_old = {
        "job_id": "JOB-OLD",
        "section_id": "SEC-1",
        "created_at": datetime(2026, 9, 1, 6, 0),  # Created early
        "due_date": datetime(2026, 9, 20, 18, 0),  # Due late
        "priority_score": 50.0,
        "candidate_windows": [shared_window, alternative_window],
    }
    job_urgent = {
        "job_id": "JOB-URGENT",
        "section_id": "SEC-1",
        "created_at": datetime(2026, 9, 1, 12, 0),  # Created late
        "due_date": datetime(2026, 9, 8, 18, 0),  # Due urgently
        "priority_score": 50.0,
        "candidate_windows": [shared_window, alternative_window],
    }

    # FCFS should pick JOB-OLD first for shared_window
    fcfs_res = {a.job_id: a for a in solve_fcfs([job_old, job_urgent])}
    assert fcfs_res["JOB-OLD"].start == shared_window.start
    assert fcfs_res["JOB-URGENT"].start == alternative_window.start

    # EDD should pick JOB-URGENT first for shared_window
    edd_res = {a.job_id: a for a in solve_edd([job_old, job_urgent])}
    assert edd_res["JOB-URGENT"].start == shared_window.start
    assert edd_res["JOB-OLD"].start == alternative_window.start


def test_cpsat_beats_both_baselines_on_real_data(client: TestClient):
    """Integration test asserting CP-SAT outperforms or equals FCFS & EDD on real seeded data,

    and that benchmark execution strictly creates zero rows in Block or OptimizationResult.
    """
    import asyncio

    async def get_counts():
        db = Prisma()
        await db.connect()
        try:
            b_cnt = await db.block.count()
            o_cnt = await db.optimizationresult.count()
            return b_cnt, o_cnt
        finally:
            await db.disconnect()

    blocks_before, opt_before = asyncio.run(get_counts())

    resp = client.get("/api/blocks/benchmark")
    assert resp.status_code == 200
    data = resp.json()

    assert "total_jobs" in data
    assert "reference_date" in data
    assert "metrics" in data
    assert "improvements" in data
    assert "summary_statement" in data

    metrics = data["metrics"]
    fcfs = metrics["fcfs"]
    edd = metrics["edd"]
    cpsat = metrics["cpsat"]

    # CP-SAT must produce <= conflicts than FCFS and EDD
    assert cpsat["total_conflicts"] <= fcfs["total_conflicts"]
    assert cpsat["total_conflicts"] <= edd["total_conflicts"]

    # CP-SAT enforces section NoOverlap as a hard constraint
    assert cpsat["section_no_overlap_violations"] == 0

    # Verify improvement percentages are non-negative
    imp = data["improvements"]
    assert imp["conflict_reduction_vs_fcfs_pct"] >= 0.0
    assert imp["conflict_reduction_vs_edd_pct"] >= 0.0

    # Assert zero-mutation guarantee: Block and OptimizationResult row counts are untouched
    blocks_after, opt_after = asyncio.run(get_counts())

    assert blocks_after == blocks_before
    assert opt_after == opt_before
