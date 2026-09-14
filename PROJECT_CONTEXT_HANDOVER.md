# RAILNET-AI: Project Context & Architecture Handover

> **Target Audience:** AI Coding Agents / Claude / Engineers continuing development on this repository.  
> **Problem Statement:** Smart India Hackathon 2026 (**SIH26027**) · **Ministry of Railways**  
> **System Objective:** Automatic Maintenance Block Planning System that harmonizes civil, signalling, and electrical railway maintenance with real train timetables using AI constraint optimization.

---

## 1. Executive Summary & Problem Scope

In Indian Railways, maintenance windows ("blocks") require shutting down track sections, halting or rerouting train traffic. Scheduling is currently fragmented across three independent railway departments:
1. **TMS (Track Management System):** Civil engineering — rails, sleepers, ballast, track geometry.
2. **SMMS (Signalling Maintenance Management System):** S&T — signals, points, track circuits, electronic interlocking.
3. **TDMS (Traction Distribution Management System):** Electrical/OHE — overhead catenary wires, substations, power supply.

### The Four Official SIH26027 Asks & Solutions:
| SIH26027 Official Ask | System Implementation |
|---|---|
| **Ask 1: Cross-Department Integration** | Unified relational schema across TMS, SMMS, TDMS mapped to real railway sections (`backend/prisma/schema.prisma`). |
| **Ask 2: Transparent Priority Scoring** | Reproducible multi-factor weighted formula (30% criticality, 25% urgency, 20% asset risk, 15% overdue, 10% failure history) in `backend/services/priority.py`. |
| **Ask 3: Automated Conflict-Free Optimization** | Google OR-Tools CP-SAT constraint solver enforcing zero train conflicts, section `NoOverlap`, and day/night window rules (`backend/optimization/solver.py`). |
| **Ask 4: Multi-Horizon Planning & Explainability** | 7-day rolling weekly and 30-day monthly schedules (`/api/plans/weekly`, `/api/plans/monthly`) with audit-ready plain English explainability (`GET /api/blocks/{id}/explain`). |

---

## 2. Corridor Scope & Data Provenance (Real vs. Synthetic)

Per PRD Section 12, the repository strictly demarcates real vs. synthetic operational data:

### Real Operational Data (RailRadar API)
- **Corridor:** Northern / North Central Railway high-density trunk corridor from New Delhi (`NDLS`) to Kanpur Central (`CNB`).
- **4 Corridor Anchor Station Pairs:** `NDLS ↔ GZB ↔ ALJN ↔ TDL ↔ CNB`.
- **183 Seeded Route Sections:** Derived from consecutive stops across all 20 real timetabled train paths (`SEC-<STN1>-<STN2>`).
- **20 Real Timetabled Trains:** Ingested from the official RailRadar API (`https://api.railradar.in/v1`) and cached locally under `backend/data/railradar_cache/*.json` with rate-limit and quota logging (`_quota_log.json`).
- `is_synthetic = false` on all trains and sections.

### Synthetic Maintenance Inventory
- Since TMS, SMMS, and TDMS are internal Indian Railways enterprise systems without public APIs, maintenance workloads are generated using a reproducible random distribution (`seed=42`).
- **Total Seeded Jobs:** **120 jobs** (**40 TMS**, **40 SMMS**, **40 TDMS**).
- Every synthetic job references a real section ID from the 183 seeded sections, has `is_synthetic = true`, and carries the required provenance tag:
  `source_note = "Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible"`.

---

## 3. Technology Stack

### Backend
- **Framework:** FastAPI (Python 3.12 / 3.14) with async endpoints and OpenAPI 3.1.0 schema generation.
- **ORM / Database:** Prisma Client Python (`prisma-client-py`) connected to **PostgreSQL 16** running on port `5432` in a Podman container (`railway_postgres`).
- **Optimization Engine:** Google OR-Tools CP-SAT solver (`ortools.sat.python.cp_model`).
- **Data Pipelines:** Pandas, NumPy, HTTPX, Pydantic v2.

### Frontend
- **Framework:** Next.js 16.3.4 (Turbopack, App Router, React 19).
- **Styling:** Tailwind CSS v4, CSS Variables, `shadcn/ui` primitives.
- **State & Data Fetching:** TanStack React Query v5 (`@tanstack/react-query`).
- **Data Tables:** TanStack Table v8 (`@tanstack/react-table`).
- **Charts & Visualizations:** Recharts (`recharts` v3).
- **API Typing:** `openapi-typescript` auto-generated types in `frontend/lib/api/types.ts` directly from FastAPI OpenAPI specs.

---

## 4. Work Completed to Date (Phases 1 — 3)

### Phase 1: Frontend Foundations & App Shell
- Scaffolded Next.js App Router under `frontend/` with Tailwind CSS v4 and `@/*` path aliases.
- Built persistent app shell with:
  - Responsive collapsible sidebar (`components/layout/sidebar.tsx`).
  - Real-time backend connectivity indicator (`components/layout/health-indicator.tsx`) polling `GET /health`.
  - TanStack Query provider (`components/providers/query-provider.tsx`).
- Created single source of truth for all design tokens in `frontend/lib/theme/tokens.ts`:
  - Department tokens: TMS (`#2563eb` blue), SMMS (`#059669` emerald), TDMS (`#7c3aed` violet).
  - Lifecycle tokens: `PENDING` (slate), `SCHEDULED` (sky), `GRANTED` (emerald).
  - Conflict tokens: `clean`, `relaxed`, `hard-conflict`.
  - Data provenance tokens: `real` (RailRadar emerald), `synthetic` (violet).
  - **Rule:** No component hardcodes hex codes or arbitrary Tailwind color classes.
- Built typed API client `lib/api/client.ts` with error normalization (`ApiError`).
- Generated 639 lines of TypeScript definitions in `lib/api/types.ts` from backend OpenAPI schema.

### Phase 2: Executive Dashboard (`/`)
- Wired live hooks in `lib/api/hooks.ts`: `useTrains()`, `useSections()`, `useMaintenanceJobs()`.
- Implemented KPI card row with skeleton loaders (`components/dashboard/kpi-card.tsx`):
  - **Maintenance Jobs:** `120` (TMS: 40, SMMS: 40, TDMS: 40).
  - **Operational Trains:** `20` from RailRadar feed.
  - **Corridor Sections:** `183` seeded route sections.
  - **Critical Workloads:** `34` high-urgency defects.
- Department Breakdown Bar Chart (`components/dashboard/department-chart.tsx`) styled with `DEPARTMENT_TOKENS`.
- Real vs. Synthetic Provenance Callout banner (`components/dashboard/provenance-badge.tsx`) highlighting `source_note`.
- Reusable `ErrorCard` with retry button and connection diagnostics.

### Inter-Phase Fix: Sections KPI & Backend Verification
- **Sections KPI Count Resolution:** The test runner had previously served only 4 anchor station pairs; updated to extract and return all **183** consecutive station pair sections parsed across all 20 trains' route files, perfectly aligning `curl http://localhost:8000/api/sections | jq 'length'` with the Dashboard KPI.
- **Clarification Note Added:** Added explicit note clarifying "4 corridor anchor stations (NDLS ↔ CNB) connecting 183 seeded route sections" across dashboard cards and badges.
- **Real Backend Verification:** Started the actual PostgreSQL container and live Uvicorn FastAPI backend (`backend/api/main.py`), completely purging temporary mock files.

### Phase 3: Trains, Sections, and Maintenance Jobs Pages
- **Shared Data Table Component (`components/data-table/data-table.tsx`):**
  - Built single generic TanStack Table wrapper used by all directory pages.
  - Supports client-side sorting/filtering and server-side pagination (`manualPagination`).
  - Sortable column headers with direction icons (`components/data-table/data-table-column-header.tsx`).
  - Skeleton loading rows matching column counts to eliminate layout shift.
  - Page size selectors (`10`, `20`, `50`, `100`), entry range text, and page buttons.
- **Trains Page (`app/trains/page.tsx`):**
  - Live server-side pagination with `useTrains(skip, limit)`.
  - Columns: Train Number, Train Service Name, Route (`SRC → DST`), Operating Days.
  - Top badge: `Source: RailRadar API (real data)`.
  - Documented stop-detail gap (see Section 6).
- **Sections Page (`app/sections/page.tsx`):**
  - Lists all 183 seeded sections with live search filtering.
  - Columns: Section ID, Name, Track Configuration badge (`Single Line` vs `Double / Multi-Line`).
  - Documented mini-timeline deferral to Phase 5.
- **Maintenance Jobs Page (`app/maintenance-jobs/page.tsx`):**
  - Department filter tabs: `All` (120), `TMS` (40), `SMMS` (40), `TDMS` (40).
  - Search filter across defect descriptions, asset codes, and sections.
  - Default sorted descending by `priority_score` (highest priority at top: `81.45`).
  - Interactive column sorting on priority, criticality, urgency, due date.
  - **Status-conditional row behavior:**
    - `PENDING`: Renders slate badge + `"Not yet scheduled"` (non-navigating).
    - `SCHEDULED`: Renders sky badge + link to `/plans/weekly` (`"Scheduled — view in weekly plan →"`).
    - `GRANTED`: Renders emerald badge + link to `/plans/weekly` (`"Granted — view in plan →"`).

---

## 5. Live Verification Metrics & Database Counts

Queries executed directly against the live running FastAPI backend (`http://localhost:8000`):

| Resource / Endpoint | Live Count / Value | Notes |
|---|---|---|
| `GET /health` | `{"status":"ok"}` | Database connected via Prisma |
| `GET /api/sections` | **183** rows | Consecutive station pairs from train paths |
| `GET /api/trains?limit=200` | **20** rows | Real RailRadar timetabled trains |
| `GET /api/maintenance-jobs` | **120** rows | Total synthetic maintenance workload |
| `GET /api/maintenance-jobs?department=TMS` | **40** rows | Civil / Permanent Way |
| `GET /api/maintenance-jobs?department=SMMS` | **40** rows | Signalling & Telecom |
| `GET /api/maintenance-jobs?department=TDMS` | **40** rows | Traction Distribution / Electrical |
| `GET /api/maintenance-jobs[0].source_note` | *"Generated — TMS/SMMS/TDMS are internal railway systems not publicly accessible"* | Preserves required provenance text |

---

## 6. Documented Backend Capability Gaps & Workarounds

When building or reviewing frontend features, do **not** assume features that the backend does not yet support:

1. **Per-Train Stop Detail Gap:**
   - *Backend state:* `GET /api/trains` returns `TrainOut` where `stops: null` (the list route does not join stop records), and there is no `GET /api/trains/{id}` endpoint.
   - *Frontend behavior:* Displays origin $\rightarrow$ destination header route and includes an explicit informational note explaining stop sequences are evaluated inside conflict detection.
2. **Job-to-Block Foreign Key Gap:**
   - *Backend state:* In `backend/api/schemas.py`, `MaintenanceJobOut` does not contain a `block_id` property. Blocks link to jobs (`BlockOut.job_id`), but jobs do not directly link to blocks.
   - *Frontend behavior:* If a job is `PENDING`, it displays "Not yet scheduled". If `SCHEDULED`, it navigates to `/plans/weekly` where blocks are displayed, rather than guessing a dead `/blocks/[id]` route.
3. **Per-Section Mini-Timeline:**
   - *PRD state:* Marked optional / time-permitting in PRD Section 5.3.
   - *Frontend behavior:* Deferred to Phase 5 to share the CSS grid Gantt engine with weekly and monthly plans.

---

## 7. How to Run & Verify the Entire Stack

### 1. PostgreSQL Database
The container runs under Podman (or Docker):
```bash
# Check status / start container
XDG_RUNTIME_DIR=/run/user/1000 podman start railway_postgres

# Verify port 5432
python3 -c "import socket; s = socket.socket(); s.connect(('127.0.0.1', 5432)); print('Postgres up!'); s.close()"
```

### 2. FastAPI Backend
```bash
cd backend
source .venv/bin/activate
uvicorn api.main:app --port 8000 --reload
```
- Health Check: `curl http://localhost:8000/health`
- OpenAPI Docs: `http://localhost:8000/docs`
- Interactive OpenAPI JSON: `http://localhost:8000/openapi.json`

### 3. Next.js Frontend
```bash
cd frontend
npm run dev     # Runs on http://localhost:3000
npm run build   # Typecheck & Turbopack production compile
npm run lint    # ESLint clean
```

### 4. Database Re-Seed Script
To reset the 120 synthetic jobs back to clean `PENDING` state:
```bash
cd backend
.venv/bin/python scripts/seed_synthetic_jobs.py
```

---

## 8. Frontend Directory Layout

```
frontend/
├── app/
│   ├── page.tsx                  # Dashboard (KPIs, Recharts, Provenance)
│   ├── layout.tsx                # App shell (Sidebar, HealthIndicator, QueryProvider)
│   ├── globals.css               # Tailwind CSS v4 variables & theme tokens
│   ├── trains/page.tsx           # Paginated Train Timetables (Phase 3)
│   ├── sections/page.tsx         # Track Sections Directory (Phase 3)
│   ├── maintenance-jobs/page.tsx # Maintenance Jobs Directory & Filters (Phase 3)
│   ├── optimizer/page.tsx        # Optimizer Console (Phase 4 - Pending)
│   ├── plans/
│   │   ├── weekly/page.tsx       # 7-day Rolling Gantt Plan (Phase 5 - Pending)
│   │   └── monthly/page.tsx      # 30-day Rolling Plan (Phase 5 - Pending)
│   └── blocks/[id]/page.tsx      # Block Explainability Detail (Phase 6 - Pending)
├── components/
│   ├── data-table/
│   │   ├── data-table.tsx               # Shared TanStack Table wrapper
│   │   └── data-table-column-header.tsx # Sortable header with arrows
│   ├── dashboard/
│   │   ├── kpi-card.tsx                 # Metric card with skeleton
│   │   ├── department-chart.tsx         # Recharts bar chart
│   │   └── provenance-badge.tsx         # Real vs. synthetic callout
│   ├── layout/
│   │   ├── sidebar.tsx                  # AppSidebar navigation
│   │   └── health-indicator.tsx         # Live backend status dot
│   ├── providers/
│   │   └── query-provider.tsx           # TanStack Query client
│   └── ui/                              # shadcn/ui primitives
├── lib/
│   ├── api/
│   │   ├── client.ts             # Typed fetch client with ApiError
│   │   ├── hooks.ts              # TanStack Query hooks (useTrains, etc.)
│   │   └── types.ts              # Generated OpenAPI TypeScript interfaces
│   ├── theme/
│   │   └── tokens.ts             # CENTRAL SOURCE OF TRUTH FOR ALL COLORS
│   └── utils.ts                  # cn() Tailwind helper
└── prd.md                        # Frontend Specification (Source of Truth)
```

---

## 9. Next Steps in the Roadmap

- **Phase 4 — Optimizer Page (`/optimizer`):**
  - Parameter controls (planning horizon, weights, max solver duration).
  - Interactive "Run Optimizer" button calling `POST /api/blocks/optimize`.
  - Progress polling state with solver telemetry.
  - KPI impact diff (conflicts prevented, department balance).
  - Candidate block list with status and explainability links.
- **Phase 5 — Weekly & Monthly Rolling Schedule Plans (`/plans/weekly`, `/plans/monthly`):**
  - Unified CSS grid Gantt timeline engine.
  - Day/night maintenance bands (Day: 10:00-14:00, Night: 23:00-04:00).
  - Train overlay bars showing scheduled block windows.
- **Phase 6 — Block Explainability Page (`/blocks/[id]`):**
  - Detailed view consuming `GET /api/blocks/{id}/explain`.
  - Transparent mathematical breakdown of priority scores and solver constraint decisions.

