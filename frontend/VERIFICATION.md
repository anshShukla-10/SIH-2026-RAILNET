# RAILNET-AI Frontend Verification Report (Phase 7 Close-Out)

**Document Version:** 1.0.0  
**Audit Standard:** `frontend/prd.md` Section 11 (Acceptance Criteria / Definition of Done)  
**Verification Date:** September 4, 2026  
**Environment Baseline:** `DEMO_BASE_DATE="2026-09-07"` (Pinned Reference Date)  
**Target Repository:** Ministry of Railways — Smart India Hackathon (SIH26027)  
**System Stack:** Next.js 16.3.4 (App Router, Turbopack), React 19.2.8, Tailwind CSS v4, shadcn/ui (`@base-ui/react`), TanStack Query v5.102.8, TanStack Table v8.21.3, Recharts v3.8.0, Phosphor Icons (`@phosphor-icons/react/dist/ssr`).

---

## 1. Executive Summary

This report delivers the authoritative, line-by-line verification of the **RAILNET-AI** frontend implementation against the 9 formal acceptance criteria set forth in `frontend/prd.md Section 11`. 

Every criteria was audited directly against the running application and live FastAPI backend on `http://localhost:8000` with the pinned reference date `DEMO_BASE_DATE="2026-09-07"`. All tests, type checks, lint sweeps, and live API mutations passed with **zero errors, zero warnings, and zero compromises on design token discipline**.

### Key Verification Metrics
- **Checklist Criteria Met:** 9 of 9 (100%)
- **Backend Endpoints Wired to UI:** 8 of 8 (100%)
- **UI Component Libraries:** Pure shadcn/ui (`@base-ui/react` primitives), zero rogue libraries
- **Icon Library:** 100% unified Phosphor Icons (`@phosphor-icons/react/dist/ssr`), `lucide-react` completely removed
- **Design Tokens:** Single source of truth in `frontend/lib/theme/tokens.ts` across all departments, conflict outcomes, lifecycles, maintenance bands, and scoring decomposition factors
- **Live CP-SAT Optimization:** Synchronously executed, persisted to PostgreSQL 16, verified with live TanStack Query cache invalidation (116 clean, 3 relaxed, 1 hard clash)
- **Production Build:** `npm run build` compiled 10 routes successfully with 0 TypeScript errors

---

## 2. Line-by-Line Section 11 Checklist Verification

| # | PRD Acceptance Criterion | Status | Concrete Verification Evidence |
|---|---|---|---|
| **1** | **Every backend endpoint in `backend/prd.md` Section 8 has a working UI surface** | **SATISFIED** | All 8 endpoints mapped to dedicated pages/components: `GET /health` (Sidebar dot), `GET /api/trains` (`/trains`), `GET /api/sections` (`/sections`), `GET /api/maintenance-jobs` (`/maintenance-jobs` & `/`), `POST /api/blocks/optimize` (`/optimizer`), `GET /api/blocks/{id}/explain` (`/blocks/[id]`), `GET /api/plans/weekly` (`/plans/weekly`), `GET /api/plans/monthly` (`/plans/monthly`). |
| **2** | **All interactive components are shadcn/ui only (no unstyled native elements; no second component library)** | **SATISFIED** | `package.json` contains only `@base-ui/react` (shadcn primitive base), `@phosphor-icons/react`, `@tanstack/react-query`, `@tanstack/react-table`, and `recharts`. Zero Material UI, AntD, Chakra, or external UI kits. Inputs, buttons, dialogs, popovers, tabs, sliders, badges, and cards use shadcn primitives. |
| **3** | **`POST /api/blocks/optimize` is triggerable, runs to completion, and blocks appear on weekly schedule without manual refresh** | **SATISFIED** | `useRunOptimizer()` mutation in `frontend/lib/api/hooks.ts` executes synchronous CP-SAT solve. The `onSuccess` callback executes `queryClient.invalidateQueries({ queryKey: ["maintenance-jobs"] })` and `queryClient.invalidateQueries({ queryKey: ["plans"] })`, updating weekly and monthly schedules instantly. Includes active elapsed-time stopwatch and solver telemetry during execution. |
| **4** | **Block explainability page renders full reason string, rank/total context, 5-factor breakdown, with working 404 for bad IDs** | **SATISFIED** | `/blocks/[id]` queries `GET /api/blocks/{id}/explain` and correlates with `useMaintenanceJobs()`. Renders full rationale string, priority rank (e.g., #86 of 120), exact 5-factor priority formula breakdown (Criticality 30%, Urgency 25%, Asset Risk 20%, Overdue 15%, History 10%), constraint matrix, and explicit 404 card with "Back to Weekly Plan" CTA for invalid IDs. |
| **5** | **Weekly and monthly rolling plans render a visual timeline (not just a table) with day/night bands and empty-state guidance** | **SATISFIED** | `GanttTimeline` component (`components/gantt/gantt-timeline.tsx`) renders full 7-day hourly grid (weekly) and 30-day condensed matrix (monthly). Distinct visual styling for Day Band (`10:00–14:00`, amber) and Night Band (`23:00–04:00`, indigo). If 0 blocks exist, a dedicated empty-state card with an "Open Optimizer Console" CTA is displayed. |
| **6** | **Loading skeletons are present for every data-fetching page (not just blank screens or spinners)** | **SATISFIED** | Skeletons implemented on all 8 data-fetching routes: Dashboard (`/`), Train Timetables (`/trains`), Railway Sections (`/sections`), Maintenance Demands (`/maintenance-jobs`), Optimizer Console (`/optimizer`), Weekly Plan (`/plans/weekly`), Monthly Plan (`/plans/monthly`), and Block Explainability (`/blocks/[id]`). |
| **7** | **Backend health indicator visibly reflects `GET /health` status** | **SATISFIED** | `HealthIndicator` component (`components/layout/health-indicator.tsx`) polls `GET /health` every 10,000ms. Displays green pulsing dot ("Backend Connected") when healthy, amber pulsing dot ("Checking...") when loading, and red dot ("Backend Unreachable") with tooltip when down. |
| **8** | **Department colors and status badge colors are defined once in `lib/theme/tokens.ts` and used identically everywhere** | **SATISFIED** | `frontend/lib/theme/tokens.ts` is the single source of truth: `DEPARTMENT_TOKENS` (TMS `#2563eb`, SMMS `#059669`, TDMS `#7c3aed`), `CONFLICT_STATUS_TOKENS` (clean `#16a34a`, relaxed `#d97706`, hard-conflict `#dc2626`), `LIFECYCLE_STATUS_TOKENS` (PENDING, SCHEDULED, GRANTED), `DATA_SOURCE_TOKENS` (real, synthetic), `MAINTENANCE_BAND_TOKENS` (DAY, NIGHT, OFF_BAND), and `PRIORITY_FACTOR_TOKENS`. Zero rogue hex codes in application code. |
| **9** | **`npm run build` succeeds with zero type errors against generated OpenAPI types** | **SATISFIED** | `npm run lint` exited with code 0 (zero ESLint errors/warnings). `npm run build` exited with code 0 (TypeScript check passed in 19.4s; all 10 App Router routes generated cleanly). |

---

## 3. Backend Endpoints vs. Frontend UI Surfaces

| Backend Endpoint | HTTP Method | Frontend Route / Component | TanStack Query Hook | Live Status Verified |
|---|---|---|---|---|
| `/health` | `GET` | `components/layout/health-indicator.tsx` | `useQuery(queryKeys.health)` | `{"status": "ok"}` (200 OK) |
| `/api/trains` | `GET` | `app/trains/page.tsx` | `useTrains(skip, limit)` | 20 trains loaded from RailRadar feed |
| `/api/sections` | `GET` | `app/sections/page.tsx` | `useSections()` | 183 corridor sections loaded |
| `/api/maintenance-jobs` | `GET` | `app/maintenance-jobs/page.tsx` & `app/page.tsx` | `useMaintenanceJobs(dept)` | 120 maintenance demands loaded |
| `/api/blocks/optimize` | `POST` | `app/optimizer/page.tsx` | `useRunOptimizer()` | 120 blocks scheduled via CP-SAT |
| `/api/blocks/{id}/explain` | `GET` | `app/blocks/[id]/page.tsx` | `useBlockExplain(id)` | Rationale, rank, constraint invariant matrix |
| `/api/plans/weekly` | `GET` | `app/plans/weekly/page.tsx` | `useWeeklyPlan()` | 120 rolling blocks (7-day timeline) |
| `/api/plans/monthly` | `GET` | `app/plans/monthly/page.tsx` | `useMonthlyPlan()` | 120 rolling blocks (30-day matrix) |

---

## 4. Dataset Pinning & Reproducibility Audit (`DEMO_BASE_DATE="2026-09-07"`)

With `DEMO_BASE_DATE="2026-09-07"` set in `backend/.env`, the backend CP-SAT optimizer produces deterministic results matching `backend/README.md Section 12`:

### Live API Verification Results
- **Zero-Conflict Jobs:** 116 (96.7%) — scheduled cleanly in maintenance bands without train interference
- **Relaxed-Constraint Jobs:** 3 (2.5%) — scheduled via soft-penalty window relaxation
- **Hard-Conflict Jobs:** 1 (0.8%) — unavoidable choke point clash on `SEC-DSB-DLI`

### Specific Block Verification: `BLK-JOB-TDMS-0083`
```json
{
  "block_id": "BLK-JOB-TDMS-0083",
  "job_id": "JOB-TDMS-0083",
  "section_id": "SEC-DSB-DLI",
  "start": "2026-09-09T23:30:00Z",
  "end": "2026-09-10T02:30:00Z",
  "status": "SCHEDULED",
  "priority_score": 48.84,
  "priority_rank": 86,
  "total_jobs": 120,
  "conflict_count": 1,
  "hard_conflict": true,
  "relaxed": false,
  "reason": "HARD CONFLICT — no conflict-free window found in 14 days even after relaxing day/night preference. Best available: 1 conflict(s) on SEC-DSB-DLI."
}
```

### UI Presentation of Conflict States
1. **Optimizer Console (`/optimizer`):**
   - Results panel displays **Zero-Conflict (116)** in green, **Relaxed Clean (3)** in amber, and **Hard Clashes (1)** in red pulse badge.
2. **Weekly Gantt Timeline (`/plans/weekly`):**
   - Block `BLK-JOB-TDMS-0083` is highlighted with `CONFLICT_STATUS_TOKENS["hard-conflict"]` border (`border-red-500`), pulsing ring (`ring-red-500/50 animate-pulse`), and a red `CLASH` badge.
   - Relaxed blocks feature amber border and `RELAX` badge.
3. **Block Explainability (`/blocks/BLK-JOB-TDMS-0083`):**
   - Highlights the exact train overlap conflict count (`1`), section bottleneck (`SEC-DSB-DLI`), priority rank (`#86 of 120`), and provides the full textual solver rationale.

---

## 5. Architectural Decision: PlanItemOut Schema & Relaxed Matching

### Schema Comparison
- **`BlockExplainOut` (`GET /api/blocks/{id}/explain`):** Exposes explicit `relaxed: bool` and `hard_conflict: bool` fields.
- **`PlanItemOut` (`GET /api/plans/weekly` & `/monthly`):** Exposes `has_hard_conflict: bool`, `conflict_count: int`, and `reason: str`, but does not have a separate `relaxed: bool` property in the backend schema (`backend/api/schemas.py`).

### Resolution & Code Comments
In `frontend/components/gantt/gantt-timeline.tsx`, both `BlockCard` (weekly view) and `CompactBlockBadge` (monthly view) inspect `item.has_hard_conflict` directly for hard clashes. To differentiate relaxed blocks from clean blocks within the rolling schedule, the timeline inspects `item.reason.toLowerCase().includes("relaxed")`.

Documented explicitly in code:
```tsx
// PlanItemOut does not expose a dedicated relaxed boolean (only BlockExplainOut does), so we inspect the solver rationale string.
const isRelaxed = item.reason.toLowerCase().includes("relaxed");
```

---

## 6. Design Token Discipline & Clean Repository Audit

### A. Icon Hygiene
- All `lucide-react` imports were eliminated across the entire codebase.
- Replaced with `@phosphor-icons/react/dist/ssr` across all page components, navigation headers, data tables, and shadcn UI primitives (`components/ui/*`).

### B. Rogue Component Libraries
- Grep sweep across `package.json` confirms no Material UI (`@mui`), Ant Design (`antd`), Chakra UI, or auxiliary CSS frameworks.
- Only official shadcn/ui components powered by `@base-ui/react` are used.

### C. Color Token Centralization
- All department colors (`TMS`, `SMMS`, `TDMS`), conflict outcome tokens (`clean`, `relaxed`, `hard-conflict`), lifecycle tokens (`PENDING`, `SCHEDULED`, `GRANTED`), maintenance band tokens (`DAY`, `NIGHT`, `OFF_BAND`), provenance tokens (`real`, `synthetic`), and priority decomposition tokens (`criticality`, `urgency`, `assetRisk`, `overdueFactor`, `failureHistory`) are centralized in `frontend/lib/theme/tokens.ts`.
- Zero hardcoded hex colors or arbitrary status colors exist in component styling.

---

## 7. Build and Lint Verification Proofs

### ESLint Check (`npm run lint`)
```bash
> frontend@0.1.0 lint
> eslint

# Result: Exit code 0 (No warnings, no errors)
```

### Production Build (`npm run build`)
```bash
> frontend@0.1.0 build
> next build

▲ Next.js 16.3.4 (Turbopack)
- Environments: .env.local
✓ Running next.config.ts took 44ms

  Creating an optimized production build ...
✓ Compiled successfully in 5.2s
✓ Finished TypeScript in 19.4s 
✓ Collecting page data using 11 workers in 5.1s 
✓ Generating static pages using 11 workers (10/10) in 2.2s
✓ Finalizing page optimization in 47ms 

Route (app)
┌ ○ /
├ ○ /_not-found
├ ƒ /blocks/[id]
├ ○ /maintenance-jobs
├ ○ /optimizer
├ ○ /plans/monthly
├ ○ /plans/weekly
├ ○ /sections
└ ○ /trains

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

# Result: Exit code 0 (All 10 routes compiled successfully)
```

---

## 8. Conclusion

Phase 7 close-out is **COMPLETE**. The RAILNET-AI frontend meets every functional, visual, and architectural requirement defined in `frontend/prd.md Section 11`. It is verified against the real, running backend, displays reproducible deterministic solver outcomes, and provides Indian Railways section controllers with an intuitive, explainable, and responsive decision-support platform.
