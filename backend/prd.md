# PRD — AI-Powered Automatic Block Planning (Backend)

**Problem Statement:** SIH26027 · Ministry of Railways · Smart India Hackathon 2026
**Scope of this PRD:** Backend only. No frontend/dashboard.
**Target:** A working backend MVP in 5 days.

---

## 1. Overview

Railway maintenance for track (Engineering), signalling (S&T), and traction
power (Traction Distribution) is currently planned independently by each
department through a shared request system (BDMS), with no coordination
against each other or against the train timetable. This causes wasted block
time, scheduling conflicts, and avoidable asset downtime.

This system integrates each department's maintenance/defect data with train
timetable and corridor-availability data, prioritizes maintenance work using
a transparent scoring model, and uses a constraint optimizer to generate
conflict-free block schedules on a weekly and monthly horizon.

---

## 2. Problem Statement (source of truth)

**Background:** Track (Engineering), Traction Distribution, and Signal &
Telecommunication departments each plan maintenance blocks/disconnections
independently via BDMS. This is decentralized and manual, leading to
inefficient block utilization, poor coordination, and suboptimal scheduling.

**Detail:** Maintenance data (defects, overdue tasks) lives separately in
three systems — TMS (track), SMMS (signalling), TDMS (traction) — while the
Control Office Application (COA) holds corridor block availability against
the train timetable and goods-train forecast. None of these systems are
integrated today.

**The four required capabilities (from the official expected solution):**

| # | Requirement | What it means |
|---|---|---|
| 1 | **Integrate** | Combine TMS/SMMS/TDMS maintenance data with COA corridor/timetable/goods-forecast data |
| 2 | **Prioritize with AI/ML** | Score and order maintenance tasks by criticality, urgency, and impact on asset availability |
| 3 | **Optimize** | Generate a schedule that maximizes uptime and minimizes downtime, coordinating across departments |
| 4 | **Multi-horizon planning** | Produce both a weekly (short-term) and monthly (long-term) block plan |

---

## 3. Goals & Success Criteria

- G1: A single canonical data model that any department's maintenance job can be normalized into.
- G2: Every maintenance job has a transparent, explainable priority score.
- G3: The system detects section/time conflicts between a candidate block and scheduled trains.
- G4: An optimizer produces a schedule with zero hard section-time conflicts across all pending jobs.
- G5: Every scheduled block has a human-readable explanation for why it was placed there.
- G6: Weekly and monthly plans are both available via the API.
- G7: The whole system is demonstrable end-to-end via API calls alone (no UI required).

**Non-goals for this MVP** (see [Section 13](#13-future-enhancements-post-mvp) for the full list):
resource(crew/machine)-constrained scheduling, cross-department bundling,
section-network graph / cascading delay, stability-aware re-planning, auth/RBAC,
realtime updates, a trained ML model (priority starts rule-based), any frontend.

---

## 4. Users / Personas

| Persona | Needs |
|---|---|
| Section Controller | Wants a conflict-free block plan they can trust without re-checking manually |
| Engineering (TMS) planner | Wants their overdue/critical track defects prioritized fairly against other departments |
| S&T (SMMS) planner | Same, for signalling defects |
| Traction Distribution (TDMS) planner | Same, for OHE/power defects |
| Hackathon evaluator | Wants to see the 4 official asks demonstrably working, with explainability |

---

## 5. System Architecture

Four layers, each answering one of the four official requirements:

```
┌─────────────────────┐   ┌──────────────────┐   ┌─────────────────┐   ┌────────────────────┐
│  Integration Layer   │──▶│  Priority Engine  │──▶│    Optimizer     │──▶│   Planning API      │
│  (Ask 1)             │   │  (Ask 2)          │   │  (Ask 3)         │   │  (Ask 4)            │
│  Normalizes TMS/      │   │  Weighted scoring │   │  OR-Tools CP-SAT │   │  Weekly + monthly   │
│  SMMS/TDMS + COA data │   │  by criticality/  │   │  picks conflict- │   │  schedules over the │
│  into one schema,     │   │  urgency/impact   │   │  free windows    │   │  same optimizer     │
│  keyed by section     │   │                   │   │                  │   │                     │
└─────────────────────┘   └──────────────────┘   └─────────────────┘   └────────────────────┘
```

Since TMS/SMMS/TDMS/COA are internal railway systems and not publicly
reachable, this MVP uses:
- **Real data** for trains/sections/timetable from the RailRadar API
  (`https://api.railradar.in/v1`) using station lookup, adjacent-pair
  discovery, and per-train schedule endpoints. All raw responses are cached
  locally (`backend/data/railradar_cache/`) to strictly respect the 1,000
  requests/month free-tier quota.
- **Synthetic, clearly-labeled data** for maintenance jobs (generated with a
  fixed random seed, flagged `is_synthetic=True` with a `source_note`),
  because the three department systems aren't accessible to a student team.

---

## 6. Data Model

```python
Train:
  train_id: str (PK)
  name: str
  source: str
  destination: str
  run_days: str

TrainStop:
  id: int (PK)
  train_id: str (FK -> Train)
  station_code: str
  section_id: str (FK -> Section)
  sequence: int
  arrival: datetime
  departure: datetime

Section:
  section_id: str (PK)
  name: str
  single_line: bool

MaintenanceJob:
  job_id: str (PK)
  department: enum [TMS, SMMS, TDMS]
  asset_id: str
  section_id: str (FK -> Section)
  defect_desc: str
  criticality: float        # 0-100, normalized input to priority score
  urgency: float             # 0-100
  asset_risk: float          # 0-100
  overdue_factor: float      # 0-100
  failure_history: float     # 0-100
  priority_score: float      # 0-100, computed
  due_date: date
  duration_min: int
  day_night_pref: enum [DAY, NIGHT, ANY]
  status: enum [PENDING, SCHEDULED, GRANTED]
  is_synthetic: bool
  source_note: str
  has_hard_conflict: bool    # Phase 3B: isolates genuine unavoidable conflicts

Block:
  block_id: str (PK)
  job_id: str (FK -> MaintenanceJob)
  section_id: str (FK -> Section)
  start: datetime
  end: datetime
  status: enum [PENDING, SCHEDULED, GRANTED]
  has_hard_conflict: bool    # Phase 3B: isolates genuine unavoidable conflicts

OptimizationResult:
  id: int (PK)
  job_id: str (FK -> MaintenanceJob)
  recommended_start: datetime
  recommended_end: datetime
  conflict_count: int
  priority_score: float
  reason: str                # human-readable explanation
```

---

## 7. Functional Requirements

### FR1 — Data Integration (Ask 1)
- FR1.1: Ingest real train/timetable data into `Train` / `TrainStop` / `Section` via RailRadar's per-train schedule endpoint using a two-step discovery-then-fetch flow with local disk caching.
- FR1.2: Generate synthetic `MaintenanceJob` records across all three departments, referencing real `section_id`s.
- FR1.3: Every synthetic record is flagged `is_synthetic=True` with a `source_note`.

### FR2 — Priority Scoring (Ask 2)
- FR2.1: Compute `priority_score` as a weighted function of criticality, urgency, asset risk, overdue factor, and failure history.
- FR2.2: Weights are configurable in one place (not hardcoded inline), so they can be tuned without a code change.
- FR2.3: The scoring function is a pure function, independently testable.

### FR3 — Conflict Detection
- FR3.1: Given a `section_id` and a candidate `[start, end)` window, return the count and list of trains whose scheduled stop on that section overlaps the window.

### FR4 — Candidate Window Generation
- FR4.1: For each pending job, generate 3–5 candidate windows within the next 7 days honoring `day_night_pref`.

### FR5 — Optimization (Ask 3)
- FR5.1: Use OR-Tools CP-SAT with one interval variable per (job, candidate window).
- FR5.2: Enforce a `NoOverlap` constraint per section.
- FR5.3: Objective minimizes total conflict count and rewards higher-priority jobs getting earlier/preferred windows.
- FR5.4: Every scheduled job produces an `OptimizationResult` row with a non-empty `reason`.

### FR6 — Explainability
- FR6.1: `GET /api/blocks/{id}/explain` returns a structured reason: priority rank, conflict count, and the text explanation.

### FR7 — Multi-Horizon Planning (Ask 4)
- FR7.1: `GET /api/plans/weekly` runs the optimizer over the coming 7 days of pending jobs.
- FR7.2: `GET /api/plans/monthly` runs the optimizer over the coming 30 days (documented as a simplified stand-in for true rolling-horizon planning — see Section 13).

---

## 8. API Specification

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/trains` | List trains (paginated) |
| GET | `/api/sections` | List sections |
| GET | `/api/maintenance-jobs?department=TMS\|SMMS\|TDMS` | List/filter maintenance jobs |
| POST | `/api/blocks/optimize` | Run the optimizer over all pending jobs; returns the resulting schedule |
| GET | `/api/blocks/{id}/explain` | Structured explanation for a scheduled block |
| GET | `/api/plans/weekly` | 7-day rolling block plan |
| GET | `/api/plans/monthly` | 30-day block plan |
| GET | `/health` | Health check |

All endpoints use Pydantic response models (no raw ORM objects returned).
Missing-resource lookups return clean 404s via a centralized exception
handler. Auto-generated OpenAPI docs must be available at `/docs`.

---

## 9. Tech Stack

| Layer | Choice |
|---|---|
| Language | Python 3.11+ |
| API framework | FastAPI + Uvicorn |
| Validation | Pydantic v2 |
| Database | PostgreSQL 16 via Prisma (prisma-client-py) |
| Optimization | Google OR-Tools (CP-SAT) |
| Data wrangling | pandas |
| Testing | pytest |

---

## 10. Repository Structure

```
docker-compose.yml
backend/
  api/
    main.py
    routers/
      trains.py
      sections.py
      maintenance.py
      blocks.py
      plans.py
  prisma/
    schema.prisma
  services/
    priority.py
    conflict.py
    windows.py
  optimization/
    solver.py
  scripts/
    seed_real_timetable.py
    seed_synthetic_jobs.py
    demo.py
  tests/
    test_priority.py
    test_conflict.py
    test_solver.py
  requirements.txt
  README.md
```

---

## 11. Milestones (5-Day Build)

| Day | Deliverable |
|---|---|
| 1 | Repo scaffolding + Prisma schema + real timetable seed + synthetic maintenance-job seed |
| 2 | Priority scoring service + conflict detection service, both tested |
| 3 | Candidate window generation + CP-SAT optimizer producing a conflict-free schedule |
| 4 | Full REST API wired to Days 1–3, explainability endpoint, `/docs` working |
| 5 | Weekly/monthly plan endpoints, `demo.py`, README, full test suite green |

**Suggested 2-engineer parallelization:**
- **Engineer A (Data & Optimization):** schema + real-data ingestion (Day 1) → priority scoring (Day 2) → windows + CP-SAT solver (Day 3) → wire solver into API + explain endpoint (Day 4) → weekly/monthly horizons (Day 5).
- **Engineer B (API & Integration):** repo scaffolding + synthetic data generator (Day 1) → conflict detection (Day 2) → FastAPI skeleton + stubbed `/optimize` (Day 3) → error handling + response schemas + API tests (Day 4) → `demo.py` + README + full test run (Day 5).
- Merge point each day: both push to the same repo; Day 3's stub gets replaced by the real solver on Day 4.

---

## 12. Acceptance Criteria (Definition of Done for the MVP)

- [ ] `python scripts/seed_real_timetable.py && python scripts/seed_synthetic_jobs.py` populates PostgreSQL with real trains/sections and ≥100 synthetic maintenance jobs across all 3 departments.
- [ ] `pytest` passes for priority, conflict, and solver test suites.
- [ ] Running the optimizer against all seeded jobs produces zero hard section-time conflicts.
- [ ] Every `OptimizationResult` has a non-empty `reason`.
- [ ] `uvicorn api.main:app --reload` serves a fully working, documented API at `/docs`.
- [ ] `GET /api/plans/weekly` and `GET /api/plans/monthly` both return valid schedules.
- [ ] `python scripts/demo.py` runs end-to-end against a fresh seed and prints a readable summary (jobs scheduled, conflicts avoided, top jobs by priority).
- [ ] README clearly states which data is real vs. synthetic.

---

## 13. Future Enhancements (Post-MVP)

Not required for the 5-day MVP; the roadmap for turning this into an
operational system:

- **Resource-constrained scheduling** — check crew/machine availability (tampers, OHE vans, signal gangs), not just section-time.
- **Section-network graph** — model sections as a graph so a block's impact can propagate to adjacent sections; weight single-line (no-bypass) sections higher.
- **Cross-department bundling** — merge compatible same-section, overlapping-time jobs from different departments into one combined block.
- **Stability-aware re-planning** — penalize moving already-granted blocks during re-optimization; support true rolling-horizon updates for the monthly plan.
- **Trained ML risk model** — replace the rule-based priority formula with a model (e.g. gradient-boosted trees) trained on historical failure/defect data, with an explainability layer (e.g. SHAP).
- **Auth, RBAC, audit trail** — roles for Section Controller, TMS, SMMS, TDMS, and an approving authority; every grant/reject decision logged.
- **Realtime layer** — WebSocket/SSE updates backed by Redis, ingesting live train positions (e.g. RailRadar).
- **Geospatial section network** — PostGIS + OpenStreetMap/OpenRailwayMap data for real section geometry, enabling a map view.
- **Engineering hygiene** — CI (GitHub Actions), broader integration tests, Docker containerization, real deployment target.
- **Defensible benchmarking** — compare optimizer output against a named baseline (FCFS/EDD) and report KPIs (conflicts avoided, downtime reduced, utilization).
- **Frontend/dashboard** — map-based block-planning view, "why this window?" panel, per-department request queues.
