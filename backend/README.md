# RAILNET-AI: Automatic Maintenance Block Planning System

**Smart India Hackathon 2026 (SIH26027)** · **Ministry of Railways**

An intelligent, AI-powered railway maintenance scheduling system that harmonizes cross-departmental maintenance demands (Track, Signal, and Traction) with real train timetables, preventing train delays through automated constraint optimization.

---

## Mapping to the Four SIH26027 Asks

| SIH26027 Official Ask | System Solution & Implementation Layer |
|---|---|
| **Ask 1: Cross-Department Integration** | Unified relational schema across **TMS** (Track), **SMMS** (Signal), and **TDMS** (Traction/OHE), mapped to real railway sections (`backend/prisma/schema.prisma`, `backend/scripts/seed_synthetic_jobs.py`). |
| **Ask 2: Transparent Priority Scoring** | Multi-factor weighted formula (30% criticality, 25% urgency, 20% asset risk, 15% overdue, 10% failure history) generating reproducible priority scores (`backend/services/priority.py`). |
| **Ask 3: Automated Conflict-Free Optimization** | Google OR-Tools CP-SAT constraint solver enforcing hard zero-conflict rules, section `NoOverlap`, and day/night candidate windows (`backend/optimization/solver.py`, `backend/services/windows.py`). |
| **Ask 4: Multi-Horizon Planning & Explainability** | 7-day weekly and 30-day monthly rolling block schedules (`/api/plans/weekly`, `/api/plans/monthly`) with audit-ready reason text for every decision (`GET /api/blocks/{id}/explain`). |

---

## Data Provenance: Real vs. Synthetic Data

Per PRD Section 12 requirements, the repository strictly demarcates real vs. synthetic operational data:

- **REAL DATA (Train Timetables & Track Sections):**
  - Ingested directly from the official **RailRadar API** (`https://api.railradar.in/v1`).
  - Corresponds to the high-density Delhi–Kanpur trunk line (`NDLS` -> `GZB` -> `ALJN` -> `TDL` -> `CNB`).
  - Database models: `Train`, `TrainStop`, `Section`.
  - Stored with authentic arrival/departure timings, sequence numbers, and section boundaries.
  - The `is_synthetic` flag is **never** set on these records.

- **SYNTHETIC DATA (Maintenance Jobs):**
  - Track Management System (`TMS`), Signalling Maintenance Management System (`SMMS`), and Traction Distribution Management System (`TDMS`) are internal Indian Railways enterprise systems not accessible via public APIs.
  - Database models: `MaintenanceJob`.
  - Generated using reproducible random distributions (`seed=42`) referencing valid real sections in PostgreSQL.
  - Every synthetic job is explicitly flagged with `is_synthetic = true` and tagged with `source_note = "Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible"`.

---

## RailRadar Integration, Caching, and Quota Protection

The timetable ingestion pipeline (`backend/scripts/seed_real_timetable.py`) is engineered to strictly protect RailRadar's free-tier quota (1,000 requests/month):

1. **Station Resolution:** Resolves station names to official codes via `GET /v1/lookup/search/stations`.
2. **Train Discovery:** Calls `GET /v1/trains/between/{from}/{to}` for each adjacent corridor pair to collect operating train numbers.
3. **Capped Discovery (`MAX_TRAINS = 20`):** Caps train schedules fetched to preserve API quota while providing 2,000+ train stop traversals across the corridor.
4. **Local Response Disk Cache (`backend/data/railradar_cache/`):**
   - Every raw API response is cached to disk as a JSON file.
   - Subsequent runs serve 100% of data from cache with **0 live API requests**.
5. **Rate-Limit Pacing & Quota Log:**
   - Free-tier rate limits (10 req/min) are paced with automated delays.
   - Quota usage and remaining limits are tracked in `backend/data/railradar_cache/_quota_log.json`.

---

## Prerequisites & Setup (Exact Run Order)

### 1. Prerequisites
- **Operating System:** Linux / macOS / Windows (WSL2 recommended)
- **Python:** Python 3.11, 3.12, 3.13, or 3.14
- **Docker & Docker Compose:** Required to run PostgreSQL 16
- **RailRadar API Key:** Get a free key at [api.railradar.in](https://api.railradar.in)

---

### 2. Step-by-Step Installation

#### Step 1: Start PostgreSQL via Docker Compose
From the repository root:
```bash
docker compose up -d
```
*(Spins up PostgreSQL 16 on port 5432 with persistent volume storage).*

#### Step 2: Configure Environment Variables
From the `backend/` directory:
```bash
cd backend
cp .env.example .env
```
Edit `.env` to include your RailRadar API key:
```ini
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/railway_blocks"
RAILRADAR_API_KEY="your_railradar_api_key_here"

# Set this to freeze the demo/seed pipeline to a fixed reference date for 100% reproducible runs
# Leave unset for normal live seeding anchored to the current calendar date
DEMO_BASE_DATE="2026-09-07"
```

#### Step 3: Create Python Virtual Environment & Install Dependencies
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

#### Step 4: Synchronize Prisma Schema with PostgreSQL
```bash
prisma generate --schema=prisma/schema.prisma
prisma db push --schema=prisma/schema.prisma
```

#### Step 5: Seed Timetable and Maintenance Jobs
```bash
python scripts/seed_real_timetable.py
python scripts/seed_synthetic_jobs.py
```
*(Both scripts are standalone and idempotent: re-running them safely refreshes data without duplicates).*

#### Step 6: Run Full Automated Test Suite
```bash
pytest -v
```
*(Runs all 31 tests across priority, conflict, solver, api, railradar, and determinism suites).*

#### Step 7: Run the Standalone End-to-End Demo
```bash
python scripts/demo.py
```
*(Executes a complete demonstration of seeding, table counts, CP-SAT optimization, top-10 scheduled blocks, and explainability).*
> **Note on Reproducibility:** When `DEMO_BASE_DATE="2026-09-07"` is set, every consecutive execution produces byte-identical results: **116 clean (96.7%)**, **3 relaxed clean (2.5%)**, and **1 genuine hard conflict (0.8%)** on the congested Delhi choke point (`SEC-DSB-DLI`), verified by `tests/test_determinism.py`.

#### Step 8: Start the FastAPI Server
```bash
uvicorn api.main:app --reload
```
- Interactive OpenAPI / Swagger UI: [http://localhost:8000/docs](http://localhost:8000/docs)
- Alternative ReDoc documentation: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- API Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## FastAPI REST API Specification

| Method | Endpoint | Description | Response Model |
|---|---|---|---|
| `GET` | `/health` | API liveness probe | `{"status": "ok"}` |
| `GET` | `/api/trains?skip=0&limit=50` | Paginated train timetables | `List[TrainOut]` |
| `GET` | `/api/sections` | Track sections list | `List[SectionOut]` |
| `GET` | `/api/maintenance-jobs?department=TMS` | Maintenance demands (TMS / SMMS / TDMS) | `List[MaintenanceJobOut]` |
| `POST` | `/api/blocks/optimize` | Run CP-SAT optimizer and persist blocks | `OptimizerRunSummary` |
| `GET` | `/api/blocks/benchmark` | Compare CP-SAT against FCFS/EDD baselines (read-only) | `BenchmarkReportOut` |
| `GET` | `/api/blocks/{id}/explain` | Explainability audit for a scheduled block | `BlockExplainOut` |
| `GET` | `/api/plans/weekly` | 7-day rolling maintenance block plan | `List[PlanItemOut]` |
| `GET` | `/api/plans/monthly` | 30-day rolling maintenance block plan | `List[PlanItemOut]` |

### Curl Examples

#### Health Check
```bash
curl -s http://localhost:8000/health
```

#### Trigger CP-SAT Block Optimization
```bash
curl -s -X POST http://localhost:8000/api/blocks/optimize
```

#### Explain Decision for a Scheduled Block
```bash
curl -s http://localhost:8000/api/blocks/BLK-JOB-SMMS-0041/explain
```

#### Filter Maintenance Demands by Department
```bash
curl -s "http://localhost:8000/api/maintenance-jobs?department=TMS"
```

#### View 7-Day Weekly Maintenance Block Plan
```bash
curl -s http://localhost:8000/api/plans/weekly
```

#### Run Defensible Benchmarking Report (Read-Only)
```bash
curl -s http://localhost:8000/api/blocks/benchmark | jq .
```

---

## Defensible Benchmarking: Heuristic Baselines vs CP-SAT (PRD Section 13)

To demonstrate that RAILNET-AI's CP-SAT mathematical optimization provides measurable, defensible value over conventional railway scheduling heuristics, the system implements two named baseline heuristics:

1. **FCFS (First-Come, First-Served):** Orders maintenance jobs by creation/arrival order (`job_id` ascending), greedily assigning each job to the earliest chronologically available window on its section.
2. **EDD (Earliest Due Date):** Orders maintenance jobs by statutory maintenance deadline (`due_date` ascending), assigning each job to the earliest chronologically available window on its section.

Both heuristics enforce physical section `NoOverlap` (double-booking avoidance), falling back to earliest available window when all candidate windows collide with prior assignments.

### Reproducible Benchmark Results (`DEMO_BASE_DATE="2026-09-07"`)

Run the standalone CLI benchmark comparison tool:
```bash
python scripts/run_benchmark_once.py
```

Or query the REST endpoint `GET /api/blocks/benchmark`. Both execute strictly read-only against PostgreSQL (guaranteeing zero mutations to `Block` or `OptimizationResult` tables).

#### Pinned Run KPI Comparison Table

```
-----------------------------------------------------------------------------------------------------------------------------
Metric                           |      FCFS      |      EDD       |     CP-SAT     |      Vs FCFS       |       Vs EDD      
-----------------------------------------------------------------------------------------------------------------------------
Total Train Conflicts            |       18       |       18       |       1        |       -94.4%       |       -94.4%      
Jobs with Conflicts > 0          |       18       |       18       |       1        |       -94.4%       |       -94.4%      
Zero-Conflict Jobs               |      102       |      102       |      119       |       +16.7%       |       +16.7%      
Critical Delays (>48h delay)     |       0        |       0        |       1        |       -0.0%        |       -0.0%       
Critical Delays (>48h delay)     |       0        |       0        |       1        |  +1 job (from 0)   |  +1 job (from 0)  
Section Collisions (Overlaps)    |       0        |       0        |       0        |    0 prevented     |    0 prevented    
Schedule Spread (Days)           |      1.77      |      2.67      |      6.71      |        N/A         |        N/A        
-----------------------------------------------------------------------------------------------------------------------------
Dataset: 120 maintenance jobs | Reference Base Date: 2026-09-07
Summary: CP-SAT achieves 119/120 clean blocks (94.4% conflict reduction vs FCFS, 94.4% vs EDD) while enforcing 0 section collisions (preventing 0 double-bookings vs FCFS).
Summary: CP-SAT achieves 119/120 clean blocks (94.4% conflict reduction vs FCFS, 94.4% vs EDD) while enforcing 0 section collisions (preventing 0 double-bookings vs FCFS). Tradeoff: CP-SAT delays 1 critical job (JOB-TMS-0022, priority 71.5) by 144h to avoid a train conflict (1 on earliest candidate vs 0 on assigned window) that FCFS/EDD would have accepted.
```

### Key Takeaways
### Key Takeaways & Operational Tradeoffs
- **94.4% Conflict Reduction:** Naive heuristics pack jobs into the earliest available time slots, leading to 18 direct train timetable clashes on high-traffic lines. CP-SAT coordinates multi-job assignments across time and space, eliminating 17 clashes (leaving only 1 unavoidable bottleneck clash on the congested Delhi choke point `SEC-DSB-DLI`).
- **Defensible Critical Delay Tradeoff:** For `JOB-TMS-0022` (priority 71.47 on `SEC-DLI-DSA`), all initial 7-day candidate windows had a train conflict ($1$ train). While FCFS and EDD blindly scheduled it on Day 1 causing a direct train clash (delay: 0h, conflicts: 1), CP-SAT made the conscious, defensible operational tradeoff to delay the job to Day 7 (`2026-09-14`) where a zero-conflict slot was available (delay: 144h, conflicts: 0).
- **Balanced Workload Spread:** FCFS and EDD prematurely crowd maintenance into 1.77 to 2.67 days; CP-SAT strategically distributes blocks over 6.71 days within the weekly planning window to preserve timetable stability.

---

## Project Structure (as per PRD Section 10 & 13)

```
docker-compose.yml
backend/
├── .env.example
├── .gitignore
├── api/
│   ├── main.py              # FastAPI application entrypoint & error handlers
│   ├── db.py                # Database connection lifecycle
│   ├── exceptions.py        # Centralized domain exceptions (NotFoundError)
│   ├── schemas.py           # Pydantic v2 response models & BenchmarkReportOut
│   └── routers/
│       ├── trains.py        # GET /api/trains
│       ├── sections.py      # GET /api/sections
│       ├── maintenance.py   # GET /api/maintenance-jobs
│       ├── blocks.py        # POST /api/blocks/optimize, GET /api/blocks/benchmark, GET /api/blocks/{id}/explain
│       └── plans.py         # GET /api/plans/weekly, GET /api/plans/monthly
├── data/
│   └── railradar_cache/     # Local response cache (gitignored)
├── prisma/
│   └── schema.prisma        # PostgreSQL Prisma schema (source of truth)
├── services/
│   ├── priority.py          # Multi-criteria priority scoring model
│   ├── conflict.py          # Section-time train conflict detection
│   ├── windows.py           # Candidate window generation & 14-day search widening
│   └── benchmark.py         # Read-only side-by-side FCFS/EDD/CP-SAT comparison service
├── optimization/
│   ├── solver.py            # Google OR-Tools CP-SAT optimizer & persistence
│   └── baselines.py         # Pure heuristic baselines (FCFS & EDD)
├── scripts/
│   ├── seed_real_timetable.py # RailRadar real timetable ingestion & caching
│   ├── seed_synthetic_jobs.py # TMS/SMMS/TDMS synthetic maintenance generator
│   ├── run_optimizer_once.py  # Standalone optimizer runner
│   ├── run_benchmark_once.py  # Standalone FCFS/EDD/CP-SAT comparison tool
│   └── demo.py              # End-to-end presentation demo script
├── tests/
│   ├── test_priority.py     # Priority scoring unit tests
│   ├── test_conflict.py     # Conflict detection unit tests
│   ├── test_railradar_client.py # RailRadar client, caching & quota tests
│   ├── test_solver.py       # CP-SAT solver, NoOverlap & hard-conflict tests
│   ├── test_baselines.py    # FCFS/EDD baseline invariants & benchmark verification
│   ├── test_determinism.py  # Reproducibility & pinned base date tests
│   └── test_api.py          # FastAPI endpoints integration tests
├── requirements.txt
└── README.md
```
