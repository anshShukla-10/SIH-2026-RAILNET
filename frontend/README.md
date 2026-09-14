# RAILNET-AI — Frontend Dashboard

**Smart India Hackathon 2026 (SIH26027)** · **Ministry of Railways**  
*AI-Powered Automatic Block Planning System*

The frontend dashboard provides a unified, explainable interface for railway corridor block scheduling, constraint-satisfaction optimization results, real train feeds (RailRadar), track/signalling/traction maintenance jobs, and multi-horizon weekly/monthly plans.

---

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (tested on Node `v22.23.1`)
- **npm**: `v10.x` or higher
- **Backend Service**: RAILNET-AI FastAPI server (`backend/`) running on `http://localhost:8000`

---

## 2. Setup & Installation

From the `frontend/` directory:

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.local.example .env.local
   ```
   Verify that `NEXT_PUBLIC_API_BASE_URL` matches your backend address:
   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 3. Regenerating Typed API Client (`lib/api/types.ts`)

The TypeScript API schema is auto-generated directly from the backend's OpenAPI 3.1 specification to guarantee contract sync with Pydantic models.

### Option A: From a running backend (recommended)
With the backend server running on `http://localhost:8000`:
```bash
npx openapi-typescript http://localhost:8000/openapi.json -o lib/api/types.ts
```

### Option B: Offline generation from backend repository
From the project root:
```bash
PYTHONPATH=backend backend/.venv/bin/python -c "import json; from api.main import app; print(json.dumps(app.openapi(), indent=2))" > /tmp/openapi.json
cd frontend
npx openapi-typescript /tmp/openapi.json -o lib/api/types.ts
```

> [!NOTE]
> Never manually edit `lib/api/types.ts`. It begins with an auto-generated banner and is regenerated whenever backend schemas change.

---

## 4. Build & Production Check

Run standard Next.js compilation and type-check:
```bash
npm run build
```

Run linter:
```bash
npm run lint
```

---

## 5. Design System & Theme Tokens

All department (TMS/SMMS/TDMS) and lifecycle/conflict status colors are declared strictly in:
```
lib/theme/tokens.ts
```
Pages and components consume `DEPARTMENT_TOKENS`, `CONFLICT_STATUS_TOKENS`, and `LIFECYCLE_STATUS_TOKENS`. No component hardcodes custom hex codes or competing color definitions for department or status semantics.

---

## 6. Backend Health Indicator

The persistent sidebar and header include a live backend health indicator polling `GET /health` every 10 seconds:
- 🟢 **Backend Connected**: The backend is running and healthy.
- 🔴 **Backend Unreachable**: The backend is stopped or unreachable. Check that the backend server is running on `http://localhost:8000`.

---

## 7. Reproducible Demo Verification (`DEMO_BASE_DATE`)

To guarantee 100% reproducible demo verification that exercises both clean and non-clean outcomes (**116 clean**, **3 relaxed**, **1 hard conflict** on the congested Delhi choke point `SEC-DSB-DLI`), ensure `DEMO_BASE_DATE` is pinned in `backend/.env`:

```env
DEMO_BASE_DATE="2026-09-07"
```

When `DEMO_BASE_DATE="2026-09-07"` is active:
- `POST /api/blocks/optimize` returns: `zero_conflict_jobs=116`, `relaxed_but_clean_jobs=3`, `hard_conflict_jobs=1`, and `total_conflicts=1`.
- `/optimizer` displays all 5 stat tiles including **Relaxed Clean (3)** and **Hard Clashes (1)**.
- `/plans/weekly` highlights the hard clash block `BLK-JOB-TDMS-0083` on `SEC-DSB-DLI` (Sep 9, 23:30–02:30) with an animated clash badge and token outline.
- `/blocks/BLK-JOB-TDMS-0083` renders the algorithmic bottleneck explanation for the unavoidable train clash.
- `/blocks/BLK-JOB-TMS-0022` renders the 14-day extended horizon explanation for the relaxed window.

