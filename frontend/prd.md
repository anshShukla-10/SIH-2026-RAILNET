# PRD — AI-Powered Automatic Block Planning (Frontend)

**Problem Statement:** SIH26027 · Ministry of Railways · Smart India Hackathon 2026
**Scope of this PRD:** Frontend only. Consumes the backend REST API defined
in `backend/prd.md` (Section 8) — this document does not redefine backend
behavior, only how it is presented.
**Target:** A polished, professional demo-ready dashboard, buildable in a
short phased sprint on top of an already-complete backend.

---

## 1. Overview

The backend (see `backend/prd.md`) integrates track/signal/traction
maintenance data with real train timetables, scores and prioritizes
maintenance jobs, and produces conflict-free weekly/monthly block
schedules via a CP-SAT optimizer — all exposed today only through raw
JSON and `/docs`. This PRD covers the frontend: a dashboard that makes
the four official SIH26027 asks (Integrate, Prioritize, Optimize,
Multi-horizon) **visible and explainable** to a non-technical evaluator
in under two minutes of clicking around, without needing to read JSON.

---

## 2. Goals & Success Criteria

- G1: Every backend capability (Sections 3–8 of `backend/prd.md`) has a
  corresponding, legible UI surface — nothing is "API-only."
- G2: A judge can, without narration, understand *why* a given block was
  scheduled where it was (explainability is a first-class UI feature, not
  a JSON blob).
- G3: One consistent design system (shadcn/ui) across every page — no
  page looks like it came from a different app.
- G4: The optimizer run (`POST /api/blocks/optimize`) is a visible,
  triggerable action with a live before/after result, not just a curl
  example.
- G5: The app is fully usable read-only with zero configuration beyond
  pointing at the backend's base URL.
- G6: Loading, empty, and error states are designed intentionally
  everywhere — no raw fetch errors or blank white screens during a demo.

**Non-goals for this build:**
Authentication/RBAC (matches backend non-goals), write/edit UI for
maintenance jobs (backend has no PUT/PATCH endpoints for this), mobile
native app, real-time WebSocket updates (backend has no realtime layer
yet — see backend PRD Section 13), map-based geospatial view (post-MVP
on the backend side too), multi-corridor switching (backend seeds one
corridor).

---

## 3. Users / Personas

| Persona | Needs from the frontend |
|---|---|
| Hackathon evaluator | Wants to see the 4 official asks working, visually, fast — plus a "why" behind any given decision |
| Section Controller (in-story persona) | Wants to see the weekly/monthly plan as a schedule they'd actually trust, not a table dump |
| TMS/SMMS/TDMS planner (in-story persona) | Wants to see their department's jobs, priority ranking, and whether they got a fair, explainable slot |
| Presenter (your own team, demo day) | Needs a UI that recovers gracefully if the backend is momentarily slow/cold-started, and that tells a clear before → optimize → after story live |

---

## 4. Information Architecture

```
/                      Dashboard (overview + KPIs)
/trains                Real train timetable browser (RailRadar-sourced)
/sections               Section directory + per-section mini-timeline
/maintenance-jobs       Job list, filterable by department, sortable by priority
/optimizer               Trigger + result view for POST /api/blocks/optimize
/blocks/[id]             Explainability detail view (GET /api/blocks/{id}/explain)
/plans/weekly            7-day rolling schedule
/plans/monthly           30-day rolling schedule
```

A persistent sidebar (shadcn `Sidebar` primitive) provides navigation
across all pages plus a live backend health indicator (`GET /health`,
polled) so a dead backend is visually obvious during a demo rather than
silently broken pages.

---

## 5. Page-by-Page Specification

### 5.1 Dashboard (`/`)
- KPI cards (shadcn `Card`): total jobs, jobs scheduled, zero-conflict %,
  hard-conflict count, real trains ingested, real sections, synthetic
  jobs by department — sourced from the latest optimizer run + base
  resource counts.
- A department breakdown chart (Recharts bar/pie via shadcn chart
  wrapper): TMS vs SMMS vs TDMS job counts and average priority score.
- A "Real vs Synthetic" badge/callout block — directly surfaces the
  `is_synthetic`/`source_note` provenance story from the backend PRD,
  since judge credibility depends on this being visible, not buried.
- Quick links into `/optimizer` and `/plans/weekly`.

### 5.2 Trains (`/trains`)
- Data table (TanStack Table + shadcn `Table`) of `GET /api/trains`,
  paginated server-side (skip/limit), columns: train_id, name,
  source→destination, run_days.
- Row click → expandable stop sequence (if/when a train-detail endpoint
  exists; otherwise show what's available from the list response —
  don't invent data the backend doesn't provide).
- A visible "Source: RailRadar API (real data)" badge, consistent with
  the Dashboard's provenance framing.

### 5.3 Sections (`/sections`)
- Data table of `GET /api/sections`: section_id, name, single_line
  badge.
- Optional: a lightweight per-section mini-timeline showing scheduled
  blocks on that section for the week (reuses the same timeline
  component as `/plans/weekly`, filtered to one section) — only if time
  allows; not a hard requirement.

### 5.4 Maintenance Jobs (`/maintenance-jobs`)
- Data table of `GET /api/maintenance-jobs`, with a department filter
  (shadcn `Tabs` or `Select`: All / TMS / SMMS / TDMS) wired to the
  query param.
- Columns: job_id, department (colored `Badge` per department),
  defect_desc, priority_score (sorted descending by default), due_date,
  status (`Badge`: PENDING/SCHEDULED/GRANTED), has_hard_conflict
  (warning `Badge` if true).
- Row click → navigates to `/blocks/[id]` if the job has an associated
  Block, otherwise shows a "not yet scheduled" state.
- Sortable by priority_score, criticality, urgency (client-side sort on
  the fetched page is acceptable for MVP scale).

### 5.5 Optimizer (`/optimizer`)
- A clear "Run Optimizer" primary action button (shadcn `Button`) that
  calls `POST /api/blocks/optimize`.
- Before the run: show current counts (pending vs scheduled jobs).
- While running: a loading state (shadcn `Skeleton`/spinner) — this
  call may take a few seconds against 120 jobs, must not look frozen.
- After the run: display the `OptimizerRunSummary` as a results panel —
  jobs_scheduled, zero_conflict_jobs, relaxed_but_clean_jobs,
  hard_conflict_jobs, total_conflicts — plus a "View full weekly plan →"
  CTA into `/plans/weekly`.
- This page is the single best "wow" moment in the demo — it should
  visually distinguish clean vs relaxed vs hard-conflict outcomes (e.g.
  three colored stat tiles), not just print numbers.

### 5.6 Block Explainability (`/blocks/[id]`)
- Full detail view of `GET /api/blocks/{id}/explain`: block window,
  section, linked job (defect, department, asset), priority_rank /
  total_jobs, conflict_count, hard_conflict/relaxed badges, and the
  `reason` text rendered prominently (this is FR6 made visible — it
  should read like a sentence a human wrote, in a large readable card,
  not a small table cell).
- A small "why this window, not another" mini-explainer: show the
  window rank and, if available from the API, how many candidate
  windows were considered — don't fabricate data the endpoint doesn't
  return.
- 404 state: friendly "block not found" page, not a raw error.

### 5.7 Weekly Plan (`/plans/weekly`) and Monthly Plan (`/plans/monthly`)
- The other centerpiece view. A timeline/schedule visualization: sections
  on one axis, time on the other, each scheduled Block rendered as a
  colored bar (color by department), clickable through to
  `/blocks/[id]`.
- A conventional data-table fallback view (toggle) for accessibility and
  for anyone who wants to scan/sort raw rows instead of the timeline.
- Empty state: if `POST /api/blocks/optimize` hasn't been run yet, show
  a clear "No plan yet — run the optimizer" CTA linking to `/optimizer`,
  matching the backend's documented empty-list behavior.
- Monthly view reuses the same component with a 30-day window and a
  visible note that this is a simplified stand-in for full rolling-
  horizon planning (mirrors the backend PRD's own caveat under FR7.2) —
  don't let the UI imply more sophistication than the backend actually
  has.

---

## 6. Design System Requirements

- **shadcn/ui exclusively** for interactive primitives (buttons, tables,
  tabs, dialogs, badges, cards, skeletons, sidebar) — no mixing in a
  second component library. Every page pulls from the same installed
  component set so visual language never drifts.
- One Tailwind theme config (colors, radius, font) shared globally;
  department colors (TMS/SMMS/TDMS) and status colors
  (clean/relaxed/hard-conflict, PENDING/SCHEDULED/GRANTED) defined once
  as named tokens and reused everywhere — never redefined per-page.
- Dark mode not required for MVP but shadcn's theming should not be
  fought against if it's trivial to leave enabled.
- Loading skeletons, not spinners-only, for every data table/card to
  keep perceived performance high during a live demo.
- Typography: one heading scale, one body scale, applied consistently —
  no page-specific font sizes invented ad hoc.

---

## 7. Data Fetching & API Integration

- Single API client module wrapping `fetch`, base URL from
  `NEXT_PUBLIC_API_BASE_URL` env var (defaults to
  `http://localhost:8000`).
- Types generated from the backend's OpenAPI schema
  (`openapi-typescript` against `GET /openapi.json`) — regenerate
  whenever the backend's Pydantic models change; never hand-maintain
  duplicate types that can drift from the backend contract.
- TanStack Query for every GET; a single mutation hook for
  `POST /api/blocks/optimize` that invalidates the maintenance-jobs,
  blocks, and plans queries on success so the UI reflects the new state
  immediately without a manual refresh.
- Centralized error boundary / query error handling: a 404 from
  `/api/blocks/{id}/explain` renders the friendly not-found state
  described in 5.6; network/5xx errors render a retry-capable error
  card, never an unstyled stack trace.

---

## 8. Tech Stack

See conversation for full rationale. Summary:

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Components | shadcn/ui (Radix-based) |
| Data fetching | TanStack Query |
| Tables | TanStack Table |
| Charts | Recharts (shadcn chart wrappers) |
| Timeline | Custom lightweight component (CSS grid) |
| Icons | lucide-react |
| Forms/filters | react-hook-form + zod |
| Client state | Zustand (minimal) |
| Type safety vs backend | openapi-typescript, generated from backend OpenAPI schema |

---

## 9. Repository Structure

```
frontend/
  app/
    page.tsx                    # Dashboard
    trains/page.tsx
    sections/page.tsx
    maintenance-jobs/page.tsx
    optimizer/page.tsx
    blocks/[id]/page.tsx
    plans/weekly/page.tsx
    plans/monthly/page.tsx
    layout.tsx                  # Sidebar + shell
  components/
    ui/                         # shadcn-generated primitives, untouched
    layout/
      sidebar.tsx
      health-indicator.tsx
    data-table/
      data-table.tsx            # shared TanStack Table wrapper
    dashboard/
      kpi-card.tsx
      department-chart.tsx
      provenance-badge.tsx
    schedule/
      timeline.tsx              # shared weekly/monthly timeline
      block-badge.tsx
    explain/
      reason-card.tsx
  lib/
    api/
      client.ts                 # fetch wrapper
      types.ts                  # generated from OpenAPI
      hooks.ts                  # TanStack Query hooks per endpoint
    theme/
      tokens.ts                 # department/status color tokens
  public/
  package.json
  tailwind.config.ts
  components.json               # shadcn config
  README.md
```

---

## 10. Milestones (Phased Build)

| Phase | Deliverable |
|---|---|
| 1 | Next.js + Tailwind + shadcn scaffolding, theme tokens, sidebar shell, API client + generated types, health indicator |
| 2 | Dashboard page (KPIs, department chart, provenance callout) wired to real data |
| 3 | Trains, Sections, Maintenance Jobs pages (data tables, filters, sorting) |
| 4 | Optimizer page (trigger + results) + Block explainability detail page |
| 5 | Weekly/Monthly plan pages (timeline component + table fallback), empty/error states pass, final polish |

---

## 11. Acceptance Criteria (Definition of Done)

- [ ] Every endpoint in `backend/prd.md` Section 8 has a corresponding
      UI surface per Section 5 of this document.
- [ ] All interactive components are shadcn/ui — no second component
      library present in `package.json`.
- [ ] `POST /api/blocks/optimize` is triggerable from the UI and its
      result is reflected live without a manual page refresh.
- [ ] `/blocks/[id]` renders the full `reason` text and rank
      information from the explain endpoint, plus a friendly 404 for
      bad ids.
- [ ] Weekly and monthly plans render a visual timeline, not just a
      table, with an empty state before any optimizer run.
- [ ] Loading skeletons present on every data-fetching page — no blank
      white flashes.
- [ ] Backend health indicator visibly reflects `GET /health` status.
- [ ] Department and status colors are defined once as shared tokens
      and used identically across every page.
- [ ] `npm run build` succeeds with no type errors against the
      generated OpenAPI types.

---

## 12. Future Enhancements (Post-MVP)

- Map-based geospatial section view (depends on backend's post-MVP
  PostGIS work).
- Real-time updates via WebSocket/SSE once the backend adds a realtime
  layer.
- Per-section drag-and-drop re-planning UI (depends on backend's
  post-MVP stability-aware re-planning).
- Auth-gated views per persona (Section Controller vs department
  planner) once the backend adds RBAC.
- Exportable weekly/monthly plan (PDF/CSV) for offline circulation.