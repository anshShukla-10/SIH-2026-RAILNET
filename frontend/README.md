# RAILNET AI

RAILNET AI is a React + TypeScript railway operations prototype for the Smart India Hackathon concept **AI-Powered Automatic Block Planning to Maximize Asset Availability for Train Operations on Indian Railways**.

## What works in this prototype

- Command Centre and railway operations dashboard
- Live Railway Map / Digital Twin view
- OpenStreetMap base map with OpenRailwayMap railway-infrastructure overlay
- Local railway-network fallback so the map still renders when external tiles are unavailable
- Train search by number, name, origin, destination and route text
- Station and asset search suggestions
- Train marker positioned on the synthetic railway track geometry
- Full available route geometry for the prototype's Delhi-area network
- Selected-train route, passed/remaining track, station stops and train details
- TMS, TDMS, SMMS and COA prototype views
- Inspections, maintenance, bridges, asset intelligence and alerts
- Block Planner with conflict screening and decision-support recommendations
- AI Risk Engine using the prototype risk dataset
- Data Integration view showing current simulated sources and the target production architecture
- Hash routing for static hosting

## Important data status

The prototype uses synthetic/local demonstration data. Train positions are timetable-derived estimates, not Indian Railways live operational positions.

The production architecture can later replace the local adapters with authenticated railway-system APIs and a backend data layer. Do not expose production API keys in browser code.

## Run locally

Requirements:

- Node.js 20+
- npm 10+

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Map sources

The map uses MapLibre GL JS. It attempts a dark OSM-derived base layer, falls back to the standard OpenStreetMap tile service if necessary, and overlays OpenRailwayMap railway tiles. A local GeoJSON region and synthetic railway network remain available as the final fallback.

Normal interactive OpenStreetMap tile usage must follow the OpenStreetMap tile policy and attribution requirements. For production traffic, use an appropriate hosted tile provider or self-hosted tiles.

## Production architecture target

```text
TMS / TDMS / SMMS / COA / RTIS
            |
      Integration Layer
            |
  Common Railway Data Model
            |
   PostgreSQL + PostGIS
            |
  +---------+----------+
  |                    |
Conflict Engine    Risk / ML
  |                    |
  +---------+----------+
            |
     OR-Tools Planner
            |
     RAILNET AI UI
```

FastAPI, PostgreSQL/PostGIS, WebSocket/event streaming, OR-Tools and ML models are target production components; they are not claimed as implemented in this frontend-only prototype.
