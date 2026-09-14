# RAILNET-AI: Automatic Maintenance Block Planning System
### Smart India Hackathon 2026 (Problem Statement ID: SIH26027)
**Ministry of Railways · Government of India**

An autonomous, constraint-programming maintenance scheduling system that harmonizes cross-departmental track possessions (Track, Signal, and Electrical/Traction) with real train timetables, preventing train delays through automated zero-conflict corridor optimization.

---

## Architecture Overview

```
┌────────────────────────────────────────────────────────────────────────┐
│                          PRESENTATION LAYER                            │
│           Next.js 16 (React 19 + Turbopack + Tailwind CSS)            │
│  - Executive Dashboard (/)          - Optimizer Command (/optimizer)   │
│  - Weekly / Monthly Gantt Plans     - Corridor Twin (/sections)        │
│  - Live Trains (/trains)            - Audit Explainer (/blocks/[id])   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / REST (Port 3000 -> 8000)
┌───────────────────────────────────▼────────────────────────────────────┐
│                           API & ENGINE LAYER                           │
│                 FastAPI (Uvicorn) + Python 3.12/3.14                   │
│  - Google OR-Tools CP-SAT Solver (Mathematical zero-conflict engine)   │
│  - Statutory 5-Factor Priority Engine (30/25/20/15/10 formula)         │
│  - FCFS & EDD Baseline Benchmark Analyzer (PRD Section 13)             │
│  - Audit Explainability Engine (FR6.1 rationale & buffer analysis)     │
└───────────────────┬────────────────────────────────┬───────────────────┘
                    │ Prisma ORM                     │ REST API
┌───────────────────▼─────────────────┐   ┌──────────▼───────────────────┐
│           DATABASE LAYER            │   │      EXTERNAL SERVICES       │
│           PostgreSQL 16             │   │       RailRadar API          │
│  - 183 Physical Corridor Sections   │   │  - 20 Premier Trains         │
│  - 120 Synthetic Maintenance Jobs   │   │  - Real Station Timetables   │
│  - Optimized Blocks & Results       │   │  - Local Disk Quota Cache    │
└─────────────────────────────────────┘   └──────────────────────────────┘
```

---

## Required Environment Variables

Copy `.env.example` to your working files:

```bash
cp .env.example .env
cp .env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

### Environment Variables Reference Table

| Variable | Scope | Default / Value | Description |
|---|---|---|---|
| `DATABASE_URL` | Backend / DB | `postgresql://postgres:postgres@localhost:5432/railway_blocks` | PostgreSQL connection string |
| `POSTGRES_USER` | Docker / DB | `postgres` | Database superuser username |
| `POSTGRES_PASSWORD` | Docker / DB | `postgres` | Database superuser password |
| `POSTGRES_DB` | Docker / DB | `railway_blocks` | Database name |
| `RAILRADAR_API_KEY` | Backend | `rg_e9e683e4e91f4eb89f877154edca1462` | Official RailRadar API key (free tier, disk-cached) |
| `DEMO_BASE_DATE` | Backend | `2026-09-07` | Pinned corridor date for reproducible benchmark evaluation |
| `NEXT_PUBLIC_API_BASE_URL` | Frontend | `http://localhost:8000` | Backend API URL reachable by client browser |

---

## Quick Start (Local Development)

### 1. Start the Database (PostgreSQL 16)
```bash
docker compose up -d postgres
# Or with Podman:
podman start railway_postgres
```

### 2. Set Up & Start Backend
```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
prisma generate

# Seed database with real timetable & synthetic maintenance jobs
python scripts/demo.py

# Run FastAPI backend server
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```
API Documentation will be accessible at: [http://localhost:8000/docs](http://localhost:8000/docs)

### 3. Set Up & Start Frontend
```bash
cd frontend
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Production Deployment with Docker Compose

To deploy the complete application (PostgreSQL + FastAPI + Next.js) on any server or VPS:

```bash
# 1. Clone repository
git clone https://github.com/your-username/RAILNET-AI-SIH.git
cd RAILNET-AI-SIH

# 2. Configure environment
cp .env.example .env

# 3. Launch full stack with Docker Compose
docker compose -f docker-compose.prod.yml up -d --build
```

Services will be online at:
- **Web App:** `http://your-server-ip:3000`
- **Backend API:** `http://your-server-ip:8000`
- **API Swagger Docs:** `http://your-server-ip:8000/docs`

---

## Verification & Testing Suite

### Run Backend Tests (Pytest)
```bash
cd backend
pytest -v
```
*Executes all 35 tests covering CP-SAT solver determinism, baseline comparisons, API routing, conflict detection, and timetable caching.*

### Run Frontend Lint & Type Checks
```bash
cd frontend
npm run lint
npx tsc --noEmit
npm run build
```
*Verifies 0 ESLint warnings, 0 TypeScript errors, and successful standalone Next.js compilation.*

