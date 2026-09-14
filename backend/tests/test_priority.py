"""Unit tests for priority scoring service (pure function tests without DB)."""

import pytest
from services.priority import calculate_priority_score, WEIGHTS


def test_typical_job_score_range():
    """Test a typical job produces a score in a sane 0-100 range matching the formula."""
    job = {
        "criticality": 65.0,
        "urgency": 70.0,
        "asset_risk": 55.0,
        "overdue_factor": 40.0,
        "failure_history": 30.0,
    }
    score = calculate_priority_score(job)
    # 0.30*65 + 0.25*70 + 0.20*55 + 0.15*40 + 0.10*30 = 19.5 + 17.5 + 11.0 + 6.0 + 3.0 = 57.0
    assert 0.0 <= score <= 100.0
    assert score == pytest.approx(57.0, rel=1e-2)


def test_zero_overdue_and_missing_failure_history():
    """Test zero overdue and missing/zero failure_history don't break the formula."""
    job = {
        "criticality": 50.0,
        "urgency": 60.0,
        "asset_risk": 40.0,
        "overdue_factor": 0.0,
        # failure_history omitted intentionally
    }
    score = calculate_priority_score(job)
    # 0.30*50 + 0.25*60 + 0.20*40 + 0.15*0 + 0.10*0 = 15.0 + 15.0 + 8.0 = 38.0
    assert score == pytest.approx(38.0, rel=1e-2)


def test_max_criticality_returns_exactly_hundred():
    """Test max inputs (all = 100) returns exactly 100.0."""
    job = {
        "criticality": 100.0,
        "urgency": 100.0,
        "asset_risk": 100.0,
        "overdue_factor": 100.0,
        "failure_history": 100.0,
    }
    score = calculate_priority_score(job)
    assert score == 100.0


def test_weights_dict_modification_changes_output():
    """Test that modifying WEIGHTS changes the output, proving weights are not hardcoded inline."""
    job = {
        "criticality": 100.0,
        "urgency": 0.0,
        "asset_risk": 0.0,
        "overdue_factor": 0.0,
        "failure_history": 0.0,
    }
    original_criticality_weight = WEIGHTS["criticality"]
    try:
        score_orig = calculate_priority_score(job)
        assert score_orig == pytest.approx(30.0, rel=1e-2)

        # Modify weight dynamically
        WEIGHTS["criticality"] = 0.50
        score_modified = calculate_priority_score(job)
        assert score_modified == pytest.approx(50.0, rel=1e-2)
        assert score_modified != score_orig
    finally:
        # Restore original weight
        WEIGHTS["criticality"] = original_criticality_weight

