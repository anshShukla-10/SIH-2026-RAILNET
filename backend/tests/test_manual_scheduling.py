"""Tests for Phase 7: Manual Job Creation and Schedule Pinning/Override."""

from datetime import date, datetime, timedelta
import pytest
from fastapi.testclient import TestClient

from api.main import app
from optimization.solver import run_optimizer_and_persist, solve_schedule
from prisma import Prisma
from services.priority import calculate_priority_score


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture."""
    with TestClient(app) as c:
        yield c


async def _cleanup_job(job_id: str):
    """Helper to cleanly purge test jobs and blocks."""
    db = Prisma()
    await db.connect()
    try:
        await db.block.delete_many(where={"job_id": job_id})
        await db.optimizationresult.delete_many(where={"job_id": job_id})
        await db.maintenancejob.delete_many(where={"job_id": job_id})
    finally:
        await db.disconnect()


@pytest.mark.anyio
async def test_create_manual_maintenance_job(client: TestClient):
    """Test POST /api/maintenance-jobs validates inputs, computes priority, and sets non-synthetic flags."""
    payload = {
        "department": "TMS",
        "asset_id": "TRK-MANUAL-001",
        "section_id": "SEC-DLI-DSA",
        "defect_desc": "Manual test defect for emergency track inspection",
        "criticality": 80.0,
        "urgency": 70.0,
        "asset_risk": 60.0,
        "overdue_factor": 50.0,
        "failure_history": 40.0,
        "due_date": "2026-09-15",
        "duration_min": 120,
        "day_night_pref": "NIGHT",
    }

    expected_score = calculate_priority_score(payload)

    resp = client.post("/api/maintenance-jobs", json=payload)
    assert resp.status_code == 201, resp.text
    data = resp.json()
    job_id = data["job_id"]

    try:
        assert data["job_id"].startswith("JOB-TMS-")
        assert data["is_synthetic"] is False
        assert data["source_note"] == "Manually entered via API"
        assert data["priority_score"] == pytest.approx(expected_score, 0.01)
        assert data["status"] == "PENDING"
        assert data["section_id"] == "SEC-DLI-DSA"
        assert data["has_hard_conflict"] is False

        # Test non-existent section raises 404
        bad_payload = {**payload, "section_id": "SEC-NON-EXISTENT-XYZ"}
        bad_resp = client.post("/api/maintenance-jobs", json=bad_payload)
        assert bad_resp.status_code == 404
    finally:
        await _cleanup_job(job_id)


@pytest.mark.anyio
async def test_no_overlap_constraint_respects_locked_interval():
    """Prove that CP-SAT NoOverlap constraint treats a locked block as occupied space,

    forcing another job on the same section into a different, non-overlapping window.
    """
    base = datetime(2026, 9, 8, 10, 0, 0)
    # Pinned/locked block on SEC-TEST from 10:00 to 12:00
    locked_intervals = [
        {
            "job_id": "JOB-LOCKED-01",
            "section_id": "SEC-TEST",
            "start": base,
            "end": base + timedelta(hours=2),
        }
    ]

    # Second job on SEC-TEST with two candidate windows:
    # Window 0: 10:30 to 11:30 (overlaps with locked block 10:00-12:00)
    # Window 1: 13:00 to 14:00 (clean, no overlap)
    job2 = {
        "job_id": "JOB-SECONDARY-02",
        "section_id": "SEC-TEST",
        "priority_score": 95.0,
        "candidate_windows": [
            {
                "start": base + timedelta(minutes=30),
                "end": base + timedelta(minutes=90),
                "conflict_count": 0,
            },
            {
                "start": base + timedelta(hours=3),
                "end": base + timedelta(hours=4),
                "conflict_count": 0,
            },
        ],
    }

    assignments = solve_schedule([job2], locked_intervals=locked_intervals)
    assert len(assignments) == 1
    # Candidate window 0 was prohibited by NoOverlap with locked block, so window 1 was chosen!
    assert assignments[0].window_rank == 1
    assert assignments[0].start == base + timedelta(hours=3)
    assert assignments[0].end == base + timedelta(hours=4)


@pytest.mark.anyio
async def test_pin_block_and_verify_optimizer_preserves_locked(client: TestClient):
    """Test POST /api/blocks/{job_id}/pin locks the block, and run_optimizer_and_persist() leaves it untouched."""
    # 1. Create a fresh manual job
    job_payload = {
        "department": "SMMS",
        "asset_id": "SIG-TEST-PIN",
        "section_id": "SEC-DLI-DSA",
        "defect_desc": "Signal interlocking test for pinning",
        "criticality": 85.0,
        "urgency": 80.0,
        "asset_risk": 75.0,
        "overdue_factor": 60.0,
        "failure_history": 50.0,
        "due_date": "2026-09-16",
        "duration_min": 60,
        "day_night_pref": "NIGHT",
    }
    create_resp = client.post("/api/maintenance-jobs", json=job_payload)
    assert create_resp.status_code == 201
    job_id = create_resp.json()["job_id"]

    try:
        # 2. Pin to an exact window
        pin_start = "2026-09-08T23:00:00"
        pin_end = "2026-09-09T00:00:00"
        pin_resp = client.post(
            f"/api/blocks/{job_id}/pin",
            json={"start": pin_start, "end": pin_end},
        )
        assert pin_resp.status_code == 200, pin_resp.text
        pinned_data = pin_resp.json()

        assert pinned_data["job_id"] == job_id
        assert pinned_data["is_locked"] is True
        assert pinned_data["status"] == "GRANTED"
        assert "Manually pinned by operator" in pinned_data["reason"]
        assert "not assigned by CP-SAT" in pinned_data["reason"]

        # 3. Run optimizer and verify locked block was skipped and untouched
        summary = await run_optimizer_and_persist()
        assert summary.locked_skipped_jobs >= 1

        # Fetch block explainability/details to confirm unmoved
        explain_resp = client.get(f"/api/blocks/{job_id}/explain")
        assert explain_resp.status_code == 200
        explain_data = explain_resp.json()
        assert explain_data["start"].startswith("2026-09-08T23:00:00")
        assert explain_data["end"].startswith("2026-09-09T00:00:00")
        assert explain_data["status"] == "GRANTED"
        assert "Manually pinned by operator" in explain_data["reason"]
    finally:
        await _cleanup_job(job_id)


@pytest.mark.anyio
async def test_pin_with_conflicts_has_hard_conflict_flag(client: TestClient):
    """Test that pinning a window with active train traffic succeeds, flags has_hard_conflict=True,

    and reports the honest conflict count without falsely claiming solver assignment.
    """
    db = Prisma()
    await db.connect()
    job_id = None
    try:
        # Find an actual train stop in the corridor to guarantee a real train conflict
        stop = await db.trainstop.find_first(
            where={"section_id": "SEC-DLI-DSA"},
        )
        assert stop is not None, "Need at least one train stop on SEC-DLI-DSA"

        # Create a job on that section
        create_resp = client.post(
            "/api/maintenance-jobs",
            json={
                "department": "TDMS",
                "asset_id": "OHE-WIRE-099",
                "section_id": stop.section_id,
                "defect_desc": "OHE inspection during train movement",
                "criticality": 90.0,
                "urgency": 85.0,
                "asset_risk": 70.0,
                "overdue_factor": 60.0,
                "failure_history": 50.0,
                "due_date": "2026-09-18",
                "duration_min": 60,
                "day_night_pref": "ANY",
            },
        )
        assert create_resp.status_code == 201
        job_id = create_resp.json()["job_id"]

        # Pin exactly overlapping the train stop
        pin_start = (stop.arrival - timedelta(minutes=10)).isoformat()
        pin_end = (stop.departure + timedelta(minutes=10)).isoformat()

        pin_resp = client.post(
            f"/api/blocks/{job_id}/pin",
            json={"start": pin_start, "end": pin_end},
        )
        assert pin_resp.status_code == 200
        pinned_data = pin_resp.json()

        # Must succeed with honest conflict count and has_hard_conflict=True
        assert pinned_data["conflict_count"] > 0
        assert pinned_data["has_hard_conflict"] is True
        assert pinned_data["is_locked"] is True
        assert pinned_data["status"] == "GRANTED"
        assert f"{pinned_data['conflict_count']} train conflict(s)" in pinned_data["reason"]
        assert "Manually pinned by operator" in pinned_data["reason"]
    finally:
        await db.disconnect()
        if job_id:
            await _cleanup_job(job_id)


@pytest.mark.anyio
async def test_unpin_and_reoptimize(client: TestClient):
    """Test unpin endpoint reverts job to PENDING, clears the lock, and makes it eligible for re-assignment."""
    create_resp = client.post(
        "/api/maintenance-jobs",
        json={
            "department": "TMS",
            "asset_id": "TRK-UNPIN-01",
            "section_id": "SEC-DLI-DSA",
            "defect_desc": "Track weld renewal to be unpinned",
            "criticality": 60.0,
            "urgency": 50.0,
            "asset_risk": 40.0,
            "overdue_factor": 30.0,
            "failure_history": 20.0,
            "due_date": "2026-09-20",
            "duration_min": 60,
            "day_night_pref": "NIGHT",
        },
    )
    assert create_resp.status_code == 201
    job_id = create_resp.json()["job_id"]

    try:
        client.post(
            f"/api/blocks/{job_id}/pin",
            json={"start": "2026-09-08T23:00:00", "end": "2026-09-09T00:00:00"},
        )

        # 2. Call POST /api/blocks/{job_id}/unpin
        unpin_resp = client.post(f"/api/blocks/{job_id}/unpin")
        assert unpin_resp.status_code == 200, unpin_resp.text
        unpin_data = unpin_resp.json()
        assert unpin_data["job_id"] == job_id
        assert unpin_data["status"] == "PENDING"
        assert unpin_data["is_locked"] is False

        # Also test DELETE /api/blocks/{job_id}/pin works as an alternative verb
        client.post(
            f"/api/blocks/{job_id}/pin",
            json={"start": "2026-09-08T23:00:00", "end": "2026-09-09T00:00:00"},
        )
        del_resp = client.delete(f"/api/blocks/{job_id}/pin")
        assert del_resp.status_code == 200
        assert del_resp.json()["status"] == "PENDING"
    finally:
        await _cleanup_job(job_id)
