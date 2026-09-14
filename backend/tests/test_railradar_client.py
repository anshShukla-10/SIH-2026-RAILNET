"""Unit tests for RailRadar client integration, caching, rate limiting, and quota tracking."""

import json
from datetime import date
from pathlib import Path
from unittest.mock import MagicMock

import pytest

from scripts.seed_real_timetable import (
    discover_trains_between,
    fetch_train_schedule,
    get_api_client_and_headers,
    resolve_station_code,
    run_days_match,
)


def test_missing_api_key_raises_value_error(monkeypatch):
    """Test that missing or empty RAILRADAR_API_KEY fails fast with ValueError."""
    monkeypatch.delenv("RAILRADAR_API_KEY", raising=False)
    with pytest.raises(ValueError, match="RAILRADAR_API_KEY is not set"):
        get_api_client_and_headers(api_key="")


def test_valid_api_key_constructs_headers():
    """Test that valid API key produces proper Bearer auth header."""
    client, headers = get_api_client_and_headers(api_key="test_dummy_key_12345")
    assert headers["Authorization"] == "Bearer test_dummy_key_12345"
    assert headers["Accept"] == "application/json"
    assert client.timeout.read == 25.0
    client.close()


def test_station_lookup_live_and_cache(tmp_path, monkeypatch):
    """Test station resolution flow: live API fetch, disk caching, and cache hit."""
    monkeypatch.setattr("scripts.seed_real_timetable.CACHE_DIR", tmp_path)

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": True,
        "data": [{"code": "NDLS", "name": "New Delhi", "city": "New Delhi"}],
    }
    mock_resp.headers = {"x-ratelimit-remaining-month": "962"}
    mock_client.get.return_value = mock_resp

    headers = {"Authorization": "Bearer test"}
    stats = {"live_requests": 0, "cache_hits": 0}

    # 1. First call -> Live fetch
    code = resolve_station_code("New Delhi", mock_client, headers, stats=stats, pacing=False)
    assert code == "NDLS"
    assert stats["live_requests"] == 1
    assert stats["cache_hits"] == 0
    assert mock_client.get.call_count == 1

    # Verify cache file exists
    cache_file = tmp_path / "lookup_new_delhi.json"
    assert cache_file.exists()

    # 2. Second call -> Cache hit (no network call)
    mock_client.get.reset_mock()
    code_cached = resolve_station_code("New Delhi", mock_client, headers, stats=stats, pacing=False)
    assert code_cached == "NDLS"
    assert stats["cache_hits"] == 1
    assert mock_client.get.call_count == 0


def test_discover_trains_between_parsing(tmp_path, monkeypatch):
    """Test discovery of trains between adjacent station pair with deduplication."""
    monkeypatch.setattr("scripts.seed_real_timetable.CACHE_DIR", tmp_path)

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "success": True,
        "data": {
            "trains": [
                {"train": {"number": "12004", "name": "Shatabdi"}},
                {"train": {"number": "64422", "name": "EMU"}},
                {"train": {"number": "12004", "name": "Shatabdi Duplicate"}},
            ]
        },
    }
    mock_resp.headers = {}
    mock_client.get.return_value = mock_resp

    trains = discover_trains_between("NDLS", "GZB", mock_client, {"Authorization": "Bearer test"}, pacing=False)
    assert "12004" in trains
    assert "64422" in trains
    assert len(trains) == 3


def test_fetch_train_schedule_cache_hit_and_miss(tmp_path, monkeypatch):
    """Test fetching train schedule saves to disk and reads from cache on second call."""
    monkeypatch.setattr("scripts.seed_real_timetable.CACHE_DIR", tmp_path)

    mock_client = MagicMock()
    mock_resp = MagicMock()
    mock_resp.status_code = 200
    mock_resp.headers = {"x-ratelimit-remaining-min": "9", "x-ratelimit-remaining-month": "962"}
    mock_resp.json.return_value = {
        "success": True,
        "data": {
            "train": {"number": "12004", "name": "Shatabdi"},
            "route": [{"sequence": 1, "station": {"code": "NDLS"}, "departure": "06:10"}],
        },
    }
    mock_client.get.return_value = mock_resp

    stats = {"live_requests": 0, "cache_hits": 0}
    data, is_rl = fetch_train_schedule("12004", mock_client, {"Authorization": "Bearer test"}, stats=stats, pacing=False)
    assert not is_rl
    assert data["data"]["train"]["number"] == "12004"
    assert stats["live_requests"] == 1
    assert (tmp_path / "12004.json").exists()

    # Second call -> Served from cache
    mock_client.get.reset_mock()
    data2, is_rl2 = fetch_train_schedule("12004", mock_client, {"Authorization": "Bearer test"}, stats=stats, pacing=False)
    assert not is_rl2
    assert stats["cache_hits"] == 1
    assert mock_client.get.call_count == 0


def test_error_handling_404_and_503(tmp_path, monkeypatch):
    """Test that 404 (not found) and 503 (service unavailable) skip gracefully without crashing."""
    monkeypatch.setattr("scripts.seed_real_timetable.CACHE_DIR", tmp_path)

    mock_client = MagicMock()

    # 404 response
    resp_404 = MagicMock()
    resp_404.status_code = 404
    resp_404.text = "Not found"
    mock_client.get.return_value = resp_404

    data_404, is_rl = fetch_train_schedule("99999", mock_client, {}, pacing=False)
    assert data_404 is None
    assert is_rl is False

    # 503 response
    resp_503 = MagicMock()
    resp_503.status_code = 503
    resp_503.text = "Service unavailable"
    mock_client.get.return_value = resp_503

    data_503, is_rl = fetch_train_schedule("88888", mock_client, {}, pacing=False)
    assert data_503 is None
    assert is_rl is False


def test_rate_limit_handling_429(tmp_path, monkeypatch):
    """Test that HTTP 429 returns rate limit flag to halt live fetches cleanly."""
    monkeypatch.setattr("scripts.seed_real_timetable.CACHE_DIR", tmp_path)

    mock_client = MagicMock()
    resp_429 = MagicMock()
    resp_429.status_code = 429
    resp_429.text = "Rate limit exceeded"
    mock_client.get.return_value = resp_429

    data, is_rl = fetch_train_schedule("77777", mock_client, {}, pacing=False)
    assert data is None
    assert is_rl is True


def test_run_days_match_logic():
    """Test run_days string matching logic across weekdays."""
    mon_date = date(2026, 9, 7)  # Monday
    tue_date = date(2026, 9, 8)  # Tuesday
    sun_date = date(2026, 9, 13) # Sunday

    assert run_days_match("DAILY", mon_date) is True
    assert run_days_match("DAILY", sun_date) is True
    assert run_days_match("MON,WED,FRI", mon_date) is True
    assert run_days_match("MON,WED,FRI", tue_date) is False
    assert run_days_match("mon,tue,wed", tue_date) is True


def test_quota_log_file_contents():
    """Test that _quota_log.json exists and contains correct quota and run metadata."""
    quota_path = Path(__file__).resolve().parent.parent / "data" / "railradar_cache" / "_quota_log.json"
    assert quota_path.exists(), "_quota_log.json should exist in railradar_cache"

    with open(quota_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    assert "monthly_limit" in data
    assert "monthly_remaining" in data
    assert "monthly_used" in data
    assert "last_run" in data
    assert "corridor" in data

    assert data["monthly_limit"] == 1000
    assert data["monthly_remaining"] <= 1000
    assert data["last_run"]["trains_seeded"] == 20
    assert data["last_run"]["status"] in ("SUCCESS_CACHED", "SUCCESS_LIVE")

