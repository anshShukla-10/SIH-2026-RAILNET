"""Seed real Indian Railways timetable data from RailRadar API into PostgreSQL via Prisma.

Flow:
1. Resolves corridor station codes via /v1/lookup/search/stations.
2. Discovers trains running between consecutive station pairs via /v1/trains/between/{from}/{to}.
3. Fetches full route & schedule for discovered trains via /v1/trains/{number}?haltsOnly=true.
4. Caches all raw API responses locally in backend/data/railradar_cache/ to conserve quota (1,000 req/month cap).
5. Tracks and logs quota usage in _quota_log.json.
6. Parses and materializes Train, Section, and dated TrainStop rows into PostgreSQL.

This script is standalone and idempotent: re-running from cache creates zero duplicate rows.
"""

import asyncio
import json
import os
import sys
import time as time_module
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import httpx
from dotenv import load_dotenv

# Ensure backend directory is in sys.path
BACKEND_DIR = Path(__file__).resolve().parent.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load environment variables from backend/.env
load_dotenv(BACKEND_DIR / ".env")

from prisma import Prisma

# RailRadar API configuration
BASE_URL = "https://api.railradar.in/v1"
MAX_TRAINS = 20
DEFAULT_HORIZON_DAYS = 7
CACHE_DIR = BACKEND_DIR / "data" / "railradar_cache"
QUOTA_LOG_PATH = CACHE_DIR / "_quota_log.json"

# Selected real railway corridor: Northern / North Central Railway trunk line
# High-density route connecting the capital to central UP
CORRIDOR_STATION_QUERIES = [
    "New Delhi",
    "Ghaziabad",
    "Aligarh",
    "Tundla",
    "Kanpur Central",
]


def parse_time(time_str: str) -> time:
    """Parse HH:MM or HH:MM:SS string to time object."""
    if not time_str or time_str.strip() in ("--", "-"):
        return time(0, 0)
    parts = time_str.strip().split(":")
    h = int(parts[0])
    m = int(parts[1]) if len(parts) > 1 else 0
    s = int(parts[2]) if len(parts) > 2 else 0
    return time(h, m, s)


def run_days_match(run_days_str: str, target_date: date) -> bool:
    """Check if train runs on the given target date."""
    normalized = run_days_str.strip().upper()
    if normalized == "DAILY":
        return True

    weekday_map = {
        0: "MON",
        1: "TUE",
        2: "WED",
        3: "THU",
        4: "FRI",
        5: "SAT",
        6: "SUN",
    }
    today_code = weekday_map[target_date.weekday()]
    allowed_days = [d.strip().upper()[:3] for d in normalized.split(",")]
    return today_code in allowed_days or "DAILY" in allowed_days


def get_api_client_and_headers(api_key: Optional[str] = None) -> Tuple[httpx.Client, Dict[str, str]]:
    """Verify RAILRADAR_API_KEY and construct HTTP client with auth headers."""
    key = api_key if api_key is not None else os.getenv("RAILRADAR_API_KEY", "").strip()
    if not key:
        raise ValueError(
            "RAILRADAR_API_KEY is not set in environment or backend/.env.\n"
            "A valid RailRadar API key is required to fetch real railway timetable data.\n"
            "Please add RAILRADAR_API_KEY=\"<your_key>\" to backend/.env and re-run."
        )

    headers = {
        "Authorization": f"Bearer {key}",
        "Accept": "application/json",
        "User-Agent": "RailNet-AI/1.0",
    }
    client = httpx.Client(timeout=25.0)
    return client, headers


def load_existing_quota_log() -> Dict[str, Any]:
    """Load existing quota log if present."""
    if QUOTA_LOG_PATH.exists():
        try:
            with open(QUOTA_LOG_PATH, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {
        "monthly_limit": 1000,
        "monthly_remaining": 962,
        "minute_limit": 10,
        "minute_remaining": 10,
    }


def write_quota_log(
    live_requests: int,
    cache_hits: int,
    trains_count: int,
    sections_count: int,
    stops_count: int,
    ratelimit_headers: Dict[str, str],
    status: str = "SUCCESS",
) -> Dict[str, Any]:
    """Write quota log file summarizing usage, remaining limits, and seed statistics."""
    existing = load_existing_quota_log()

    def _get_val(header_key: str, fallback_key: str, default: int) -> int:
        val = ratelimit_headers.get(header_key)
        if val is not None:
            try:
                return int(val)
            except ValueError:
                pass
        return int(existing.get(fallback_key, default))

    monthly_limit = _get_val("x-ratelimit-limit-month", "monthly_limit", 1000)
    monthly_remaining = _get_val("x-ratelimit-remaining-month", "monthly_remaining", 962)
    minute_limit = _get_val("x-ratelimit-limit-min", "minute_limit", 10)
    minute_remaining = _get_val("x-ratelimit-remaining-min", "minute_remaining", 10)

    if live_requests > 0 and not ratelimit_headers.get("x-ratelimit-remaining-month"):
        monthly_remaining = max(0, monthly_remaining - live_requests)

    quota_data = {
        "timestamp": datetime.now().isoformat(),
        "monthly_limit": monthly_limit,
        "monthly_remaining": monthly_remaining,
        "monthly_used": monthly_limit - monthly_remaining,
        "minute_limit": minute_limit,
        "minute_remaining": minute_remaining,
        "last_run": {
            "live_requests": live_requests,
            "cache_hits": cache_hits,
            "trains_seeded": trains_count,
            "sections_seeded": sections_count,
            "stops_seeded": stops_count,
            "status": status,
        },
        "corridor": {
            "stations": CORRIDOR_STATION_QUERIES,
            "max_trains_cap": MAX_TRAINS,
        },
    }

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    for path in [QUOTA_LOG_PATH, BACKEND_DIR / "_quota_log.json"]:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(quota_data, f, indent=2)

    return quota_data


def resolve_station_code(
    query: str,
    client: httpx.Client,
    headers: Dict[str, str],
    pacing: bool = True,
    stats: Optional[Dict[str, int]] = None,
    last_headers: Optional[Dict[str, str]] = None,
) -> str:
    """Resolve a station query to its official Indian Railways station code using RailRadar lookup."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    slug = query.lower().replace(" ", "_")
    cache_file = CACHE_DIR / f"lookup_{slug}.json"

    if cache_file.exists():
        print(f"  [CACHE] Station lookup '{query}' -> {cache_file.name}")
        if stats is not None:
            stats["cache_hits"] = stats.get("cache_hits", 0) + 1
        with open(cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        print(f"  [LIVE]  Station lookup '{query}' via RailRadar API...")
        if stats is not None:
            stats["live_requests"] = stats.get("live_requests", 0) + 1
        url = f"{BASE_URL}/lookup/search/stations"
        resp = client.get(url, params={"q": query}, headers=headers)
        if last_headers is not None:
            last_headers.update({k.lower(): v for k, v in resp.headers.items() if "ratelimit" in k.lower()})
        if resp.status_code != 200:
            raise RuntimeError(f"Failed to lookup station '{query}': HTTP {resp.status_code} - {resp.text}")
        data = resp.json()
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        if pacing:
            time_module.sleep(1.0)

    results = data.get("data", [])
    if not results:
        raise ValueError(f"RailRadar could not resolve station query '{query}'. Response: {data}")

    match = results[0]
    code = match.get("code") or match.get("stationCode") or match.get("station_code")
    if not code:
        raise ValueError(f"Station object does not contain a station code: {match}")
    resolved_code = str(code).strip().upper()
    print(f"         Resolved '{query}' -> {resolved_code} ({match.get('name', '')})")
    return resolved_code


def discover_trains_between(
    from_code: str,
    to_code: str,
    client: httpx.Client,
    headers: Dict[str, str],
    pacing: bool = True,
    stats: Optional[Dict[str, int]] = None,
    last_headers: Optional[Dict[str, str]] = None,
) -> List[str]:
    """Discover train numbers operating between adjacent stations."""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"between_{from_code}_{to_code}.json"

    if cache_file.exists():
        print(f"  [CACHE] Trains between {from_code} and {to_code} -> {cache_file.name}")
        if stats is not None:
            stats["cache_hits"] = stats.get("cache_hits", 0) + 1
        with open(cache_file, "r", encoding="utf-8") as f:
            data = json.load(f)
    else:
        print(f"  [LIVE]  Fetching trains between {from_code} and {to_code} from RailRadar API...")
        if stats is not None:
            stats["live_requests"] = stats.get("live_requests", 0) + 1
        url = f"{BASE_URL}/trains/between/{from_code}/{to_code}"
        resp = client.get(url, headers=headers)
        if last_headers is not None:
            last_headers.update({k.lower(): v for k, v in resp.headers.items() if "ratelimit" in k.lower()})
        if resp.status_code == 429:
            print("  [WARN]  RailRadar rate limit reached (HTTP 429) during discovery.")
            return []
        if resp.status_code != 200:
            print(f"  [WARN]  Discovery between {from_code}-{to_code} returned HTTP {resp.status_code}: {resp.text}")
            return []
        data = resp.json()
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
        if pacing:
            time_module.sleep(1.0)

    payload_data = data.get("data", {})
    trains_list = (
        payload_data.get("trains", [])
        if isinstance(payload_data, dict)
        else (payload_data if isinstance(payload_data, list) else [])
    )

    numbers = []
    for item in trains_list:
        if isinstance(item, dict):
            train_obj = item.get("train", item)
            num = (
                train_obj.get("number")
                or train_obj.get("trainNumber")
                or train_obj.get("train_number")
                or train_obj.get("trainNo")
            )
        elif isinstance(item, str):
            num = item
        else:
            num = None
        if num:
            numbers.append(str(num).strip())
    return numbers


def fetch_train_schedule(
    train_number: str,
    client: httpx.Client,
    headers: Dict[str, str],
    pacing: bool = True,
    stats: Optional[Dict[str, int]] = None,
    last_headers: Optional[Dict[str, str]] = None,
) -> Tuple[Optional[Dict[str, Any]], bool]:
    """Fetch schedule for a single train number with local disk caching.

    Returns: (schedule_data_or_None, rate_limited_flag)
    """
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    cache_file = CACHE_DIR / f"{train_number}.json"

    if cache_file.exists():
        print(f"  [CACHE] Train {train_number} -> {cache_file.name}")
        if stats is not None:
            stats["cache_hits"] = stats.get("cache_hits", 0) + 1
        with open(cache_file, "r", encoding="utf-8") as f:
            return json.load(f), False

    print(f"  [LIVE]  Fetching schedule for train {train_number} from RailRadar API...")
    if stats is not None:
        stats["live_requests"] = stats.get("live_requests", 0) + 1
    url = f"{BASE_URL}/trains/{train_number}"
    resp = client.get(url, params={"haltsOnly": "true"}, headers=headers)
    if last_headers is not None:
        last_headers.update({k.lower(): v for k, v in resp.headers.items() if "ratelimit" in k.lower()})

    if resp.status_code == 404:
        print(f"  [WARN]  Train {train_number} not found (HTTP 404). Skipping.")
        return None, False
    if resp.status_code == 503:
        print(f"  [WARN]  RailRadar upstream degraded (HTTP 503) for train {train_number}. Skipping.")
        return None, False
    if resp.status_code == 429:
        print(f"  [ALERT] RailRadar rate limit reached (HTTP 429). Halting live requests.")
        return None, True
    if resp.status_code != 200:
        print(f"  [WARN]  HTTP {resp.status_code} for train {train_number}: {resp.text}. Skipping.")
        return None, False

    raw_json = resp.json()
    with open(cache_file, "w", encoding="utf-8") as f:
        json.dump(raw_json, f, indent=2)

    # Respect the 10 req/min free-tier rate limit by pacing live calls
    if pacing:
        remaining_min = resp.headers.get("x-ratelimit-remaining-min")
        if remaining_min is not None:
            try:
                if int(remaining_min) <= 1:
                    print(f"         [Pacing] Rate limit quota low ({remaining_min} remaining this min). Waiting 7s...")
                    time_module.sleep(7.0)
                else:
                    time_module.sleep(1.0)
            except ValueError:
                time_module.sleep(1.0)
        else:
            time_module.sleep(6.2)

    return raw_json, False


async def seed_real_timetable():
    client, headers = get_api_client_and_headers()
    db = Prisma()
    await db.connect()

    stats = {"live_requests": 0, "cache_hits": 0}
    last_headers: Dict[str, str] = {}

    from services.clock import get_base_date
    base_date = get_base_date()

    print(f"\n=======================================================")
    print(f"Step 1: Resolving Corridor Station Codes via RailRadar")
    print(f"=======================================================")
    resolved_codes = []
    for query in CORRIDOR_STATION_QUERIES:
        code = resolve_station_code(query, client, headers, pacing=True, stats=stats, last_headers=last_headers)
        resolved_codes.append(code)

    print(f"\nActive Corridor Stations: {' -> '.join(resolved_codes)}")

    print(f"\n=======================================================")
    print(f"Step 2: Discovering Trains on Adjacent Corridor Pairs")
    print(f"=======================================================")
    discovered_trains = []
    for i in range(len(resolved_codes) - 1):
        stn_from = resolved_codes[i]
        stn_to = resolved_codes[i + 1]
        pair_trains = discover_trains_between(stn_from, stn_to, client, headers, pacing=True, stats=stats, last_headers=last_headers)
        print(f"  Found {len(pair_trains)} trains between {stn_from} and {stn_to}")
        for t in pair_trains:
            if t not in discovered_trains:
                discovered_trains.append(t)

    # Enforce MAX_TRAINS cap to strictly protect free tier quota
    capped_trains = discovered_trains[:MAX_TRAINS]
    print(f"\nDiscovered {len(discovered_trains)} unique trains. Capped at {len(capped_trains)} (MAX_TRAINS={MAX_TRAINS}).")

    print(f"\n=======================================================")
    print(f"Step 3: Fetching Schedules & Caching Locally")
    print(f"=======================================================")
    train_schedules = []
    rate_limited = False
    for t_num in capped_trains:
        sched, is_rl = fetch_train_schedule(t_num, client, headers, pacing=True, stats=stats, last_headers=last_headers)
        if is_rl:
            rate_limited = True
            break
        if sched:
            train_schedules.append((t_num, sched))

    print(f"\nSuccessfully loaded schedules for {len(train_schedules)} trains.")
    if rate_limited:
        print("Live fetching stopped early due to rate limit; proceeding with cached/fetched trains.")

    print(f"\n=======================================================")
    print(f"Step 4: Parsing Models & Ingesting into PostgreSQL")
    print(f"=======================================================")

    # 4a. Derive and Upsert Sections from train routes
    sections_map: Dict[str, Dict[str, Any]] = {}
    parsed_trains: List[Dict[str, Any]] = []

    for t_num, payload in train_schedules:
        data = payload.get("data", payload)
        train_obj = data.get("train", data) if isinstance(data, dict) else {}

        t_id = str(train_obj.get("number") or train_obj.get("trainNumber") or t_num).strip()
        t_name = str(train_obj.get("name") or train_obj.get("trainName") or f"TRAIN {t_id}").strip()

        # Parse source and destination stations
        raw_src = train_obj.get("source") or ""
        raw_dst = train_obj.get("destination") or ""
        src_code = raw_src.get("code") if isinstance(raw_src, dict) else str(raw_src)
        dst_code = raw_dst.get("code") if isinstance(raw_dst, dict) else str(raw_dst)

        # Parse run days
        raw_run_days = train_obj.get("runDays") or train_obj.get("runningDays") or train_obj.get("run_days")
        if isinstance(raw_run_days, list):
            run_days = ",".join(str(d).strip().upper()[:3] for d in raw_run_days)
        elif isinstance(raw_run_days, str) and raw_run_days.strip():
            run_days = raw_run_days.strip().upper()
        else:
            run_days = "DAILY"

        # Parse route stops
        route = data.get("route", [])
        if not route:
            continue

        if not src_code:
            first_stn_obj = route[0].get("station", {}) if isinstance(route[0].get("station"), dict) else {}
            first_stn = first_stn_obj.get("code") or route[0].get("stationCode") or route[0].get("code") or "ORIGIN"
            src_code = str(first_stn)
        if not dst_code:
            last_stn_obj = route[-1].get("station", {}) if isinstance(route[-1].get("station"), dict) else {}
            last_stn = last_stn_obj.get("code") or route[-1].get("stationCode") or route[-1].get("code") or "TERM"
            dst_code = str(last_stn)

        # Derive sections for consecutive stops along route
        for i in range(len(route) - 1):
            stn_a_obj = route[i].get("station", {}) if isinstance(route[i].get("station"), dict) else {}
            stn_b_obj = route[i + 1].get("station", {}) if isinstance(route[i + 1].get("station"), dict) else {}

            stn_a = str(stn_a_obj.get("code") or route[i].get("stationCode") or route[i].get("code") or "").strip().upper()
            stn_b = str(stn_b_obj.get("code") or route[i + 1].get("stationCode") or route[i + 1].get("code") or "").strip().upper()

            if stn_a and stn_b:
                sec_id = f"SEC-{stn_a}-{stn_b}"
                sec_name = f"{stn_a} to {stn_b} Section"
                # Known limitation: RailRadar API does not provide track infrastructure details (single vs multi line);
                # defaulting single_line to False.
                sections_map[sec_id] = {
                    "name": sec_name,
                    "single_line": False,
                }

        parsed_trains.append(
            {
                "train_id": t_id,
                "name": t_name,
                "source": src_code,
                "destination": dst_code,
                "run_days": run_days,
                "route": route,
            }
        )

    # Upsert Sections
    for sec_id, info in sections_map.items():
        await db.section.upsert(
            where={"section_id": sec_id},
            data={
                "create": {
                    "section_id": sec_id,
                    "name": info["name"],
                    "single_line": info["single_line"],
                },
                "update": {
                    "name": info["name"],
                    "single_line": info["single_line"],
                },
            },
        )
    print(f"Seeded/Verified {len(sections_map)} Section records in PostgreSQL.")

    # Upsert Trains and Materialize TrainStops across 7-day horizon
    total_stops_seeded = 0
    for t in parsed_trains:
        t_id = t["train_id"]
        await db.train.upsert(
            where={"train_id": t_id},
            data={
                "create": {
                    "train_id": t_id,
                    "name": t["name"],
                    "source": t["source"],
                    "destination": t["destination"],
                    "run_days": t["run_days"],
                },
                "update": {
                    "name": t["name"],
                    "source": t["source"],
                    "destination": t["destination"],
                    "run_days": t["run_days"],
                },
            },
        )

        # Idempotently replace train stops for this train
        await db.trainstop.delete_many(where={"train_id": t_id})

        route = t["route"]
        new_stops = []

        for day_offset in range(DEFAULT_HORIZON_DAYS):
            origin_date = base_date + timedelta(days=day_offset)
            if not run_days_match(t["run_days"], origin_date):
                continue

            for idx, halt in enumerate(route):
                stn_obj = halt.get("station", {}) if isinstance(halt.get("station"), dict) else {}
                stn_code = str(stn_obj.get("code") or halt.get("stationCode") or halt.get("code") or "").strip().upper()
                if not stn_code:
                    continue

                seq = int(halt.get("sequence") or halt.get("seq") or idx + 1)
                arr_str = halt.get("arrival") or halt.get("arrivalTime") or halt.get("arr")
                dep_str = halt.get("departure") or halt.get("departureTime") or halt.get("dep")

                # RailRadar day offsets are typically 1-indexed (day 1 = day of origin departure)
                arr_day_raw = int(halt.get("arrivalDay") or halt.get("day") or 1)
                dep_day_raw = int(halt.get("departureDay") or halt.get("arrivalDay") or halt.get("day") or 1)
                arr_day_offset = max(0, arr_day_raw - 1)
                dep_day_offset = max(0, dep_day_raw - 1)

                # Fallbacks for origin/terminal stops
                if not arr_str or arr_str.strip() in ("--", "-"):
                    arr_str = dep_str
                if not dep_str or dep_str.strip() in ("--", "-"):
                    dep_str = arr_str

                arr_t = parse_time(arr_str)
                dep_t = parse_time(dep_str)

                arr_dt = datetime.combine(origin_date + timedelta(days=arr_day_offset), arr_t)
                dep_dt = datetime.combine(origin_date + timedelta(days=dep_day_offset), dep_t)

                # Ensure minimum 5-minute traversal window if arrival equals departure
                if dep_dt <= arr_dt:
                    dep_dt = arr_dt + timedelta(minutes=5)

                # Link stop to valid Section
                if idx < len(route) - 1:
                    next_stn_obj = route[idx + 1].get("station", {}) if isinstance(route[idx + 1].get("station"), dict) else {}
                    next_code = str(next_stn_obj.get("code") or route[idx + 1].get("stationCode") or route[idx + 1].get("code") or "").strip().upper()
                    sec_id = f"SEC-{stn_code}-{next_code}"
                else:
                    prev_stn_obj = route[idx - 1].get("station", {}) if isinstance(route[idx - 1].get("station"), dict) else {}
                    prev_code = str(prev_stn_obj.get("code") or route[idx - 1].get("stationCode") or route[idx - 1].get("code") or "").strip().upper()
                    sec_id = f"SEC-{prev_code}-{stn_code}"

                if sec_id in sections_map:
                    new_stops.append(
                        {
                            "train_id": t_id,
                            "station_code": stn_code,
                            "section_id": sec_id,
                            "sequence": seq,
                            "arrival": arr_dt,
                            "departure": dep_dt,
                        }
                    )

        if new_stops:
            await db.trainstop.create_many(data=new_stops)
            total_stops_seeded += len(new_stops)

    print(f"Seeded/Verified {len(parsed_trains)} Train records in PostgreSQL.")
    print(f"Seeded {total_stops_seeded} TrainStop records across {DEFAULT_HORIZON_DAYS}-day horizon.")

    # Write quota log
    write_quota_log(
        live_requests=stats["live_requests"],
        cache_hits=stats["cache_hits"],
        trains_count=len(parsed_trains),
        sections_count=len(sections_map),
        stops_count=total_stops_seeded,
        ratelimit_headers=last_headers,
        status="SUCCESS_CACHED" if stats["live_requests"] == 0 else "SUCCESS_LIVE",
    )

    await db.disconnect()
    client.close()


if __name__ == "__main__":
    asyncio.run(seed_real_timetable())
