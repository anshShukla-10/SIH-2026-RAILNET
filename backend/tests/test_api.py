"""Integration tests for FastAPI REST layer and explainability endpoints."""

import pytest
from fastapi.testclient import TestClient

from api.main import app


@pytest.fixture(scope="module")
def client():
    """FastAPI TestClient fixture with lifespan startup and shutdown."""
    with TestClient(app) as c:
        yield c


def test_health_check(client: TestClient):
    """Test GET /health returns status ok."""
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json() == {"status": "ok"}


def test_get_trains_paginated(client: TestClient):
    """Test GET /api/trains returns a paginated list of trains."""
    resp = client.get("/api/trains?skip=0&limit=5")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) <= 5
    if data:
        first = data[0]
        assert "train_id" in first
        assert "name" in first
        assert "source" in first
        assert "destination" in first
        assert "run_days" in first


def test_get_sections(client: TestClient):
    """Test GET /api/sections returns list of sections."""
    resp = client.get("/api/sections")
    assert resp.status_code == 200
    data = resp.json()
    assert isinstance(data, list)
    assert len(data) > 0
    first = data[0]
    assert "section_id" in first
    assert "name" in first
    assert "single_line" in first


def test_get_maintenance_jobs_department_filter_and_validation(client: TestClient):
    """Test GET /api/maintenance-jobs validates department and filters correctly."""
    # 1. Valid department filter: TMS
    resp_tms = client.get("/api/maintenance-jobs?department=TMS")
    assert resp_tms.status_code == 200
    tms_jobs = resp_tms.json()
    assert isinstance(tms_jobs, list)
    assert len(tms_jobs) > 0
    assert all(j["department"] == "TMS" for j in tms_jobs)

    # 2. Invalid department -> 400 Bad Request
    resp_invalid = client.get("/api/maintenance-jobs?department=INVALID_DEPT")
    assert resp_invalid.status_code == 400
    assert "Invalid department" in resp_invalid.json()["detail"]


def test_post_blocks_optimize(client: TestClient):
    """Test POST /api/blocks/optimize triggers the CP-SAT optimizer and returns summary."""
    resp = client.post("/api/blocks/optimize")
    assert resp.status_code == 200
    summary = resp.json()
    assert "jobs_scheduled" in summary
    assert "zero_conflict_jobs" in summary
    assert "relaxed_but_clean_jobs" in summary
    assert "hard_conflict_jobs" in summary
    assert "total_conflicts" in summary
    assert summary["jobs_scheduled"] > 0
    assert summary["total_conflicts"] <= 1


def test_get_blocks_explain_real_and_not_found(client: TestClient):
    """Test GET /api/blocks/{id}/explain on valid scheduled block and nonexistent block."""
    # 1. Query plans to get a known scheduled block_id
    plan_resp = client.get("/api/plans/weekly")
    assert plan_resp.status_code == 200
    items = plan_resp.json()
    assert len(items) > 0
    real_block_id = items[0]["block_id"]

    # 2. Real block ID -> 200 OK with explainability fields
    resp = client.get(f"/api/blocks/{real_block_id}/explain")
    assert resp.status_code == 200
    explain = resp.json()
    assert explain["block_id"] == real_block_id
    assert "priority_rank" in explain
    assert "total_jobs" in explain
    assert "priority_score" in explain
    assert "conflict_count" in explain
    assert "hard_conflict" in explain
    assert "relaxed" in explain
    assert "reason" in explain
    assert len(explain["reason"]) > 0

    # 3. Nonexistent block ID -> 404 via centralized NotFoundError handler
    resp_404 = client.get("/api/blocks/BLK-NONEXISTENT-9999/explain")
    assert resp_404.status_code == 404
    assert resp_404.json() == {"detail": "Block with id 'BLK-NONEXISTENT-9999' was not found."}


def test_get_plans_weekly_and_monthly(client: TestClient):
    """Test GET /api/plans/weekly and /api/plans/monthly return valid list bodies."""
    # Weekly plan (7 days)
    resp_weekly = client.get("/api/plans/weekly")
    assert resp_weekly.status_code == 200
    weekly_items = resp_weekly.json()
    assert isinstance(weekly_items, list)
    assert len(weekly_items) > 0

    first = weekly_items[0]
    assert "block_id" in first
    assert "job_id" in first
    assert "section_id" in first
    assert "priority_score" in first
    assert "start" in first
    assert "end" in first
    assert "conflict_count" in first
    assert "reason" in first

    # Monthly plan (30 days)
    resp_monthly = client.get("/api/plans/monthly")
    assert resp_monthly.status_code == 200
    monthly_items = resp_monthly.json()
    assert isinstance(monthly_items, list)
    assert len(monthly_items) >= len(weekly_items)

