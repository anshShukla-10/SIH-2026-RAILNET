# RAILNET-AI: Intelligent Joint Corridor Maintenance Planning System
### Smart India Hackathon 2026 (Problem Statement ID: SIH26027)
**Ministry of Railways · Government of India**

---

## 1. Executive Summary: What is this project?

Imagine a 440-kilometer superhighway with hundreds of high-speed trains running day and night — carrying over a million passengers every week between **New Delhi** and **Kanpur Central**. 

To keep this railway line safe, three separate departments must inspect and repair the infrastructure:
1. **Civil Engineering (Track / TMS):** Replaces worn rails, packs stone ballast, and fixes switches.
2. **Signalling & Telecom (Signals / SMMS):** Services signal lights, track sensors, and electronic interlocking systems.
3. **Electrical (Traction / TDMS):** Repairs 25,000-volt overhead electric cables (OHE) that power locomotives.

### The Real-World Dilemma
- If engineers stop trains to repair the tracks without coordination, premier trains like **Vande Bharat** and **Rajdhani Express** get stuck, delayed, or cancelled.
- If engineers delay repairs to avoid disturbing trains, rails can crack, signals fail, or overhead cables snap — creating life-threatening safety hazards and derailment risks.

### What RAILNET-AI Does
**RAILNET-AI** is an intelligent, automated scheduling brain for Indian Railways. It acts like an expert "Air Traffic Controller" for maintenance work:
- It looks at **real passenger train schedules** minute-by-minute across all 183 track sections.
- It collects maintenance requests from all three departments.
- In just **3 to 5 seconds**, it calculates the perfect schedule where all critical track work gets completed during natural train gaps, ensuring **zero clashes with passenger trains** and **zero conflicting departmental work on the same track**.

---

## 2. The Problem We Are Solving (The Everyday Reality in Railways)

### How it works today (Manual & Fragmented):
1. **Siloed Requests:** Each department works in its own world. The Track engineer submits a paper slip asking for 3 hours on Tuesday morning. The Signal engineer wants 2 hours on Wednesday. The Electrical team wants 4 hours on Thursday night.
2. **Manual Negotiation:** Section controllers and departmental officers sit in daily "Block Meetings" or talk over phone calls, trying to manually negotiate track possession ("traffic blocks").
3. **The Finger-Pointing Cycle:** When train delays happen, departments blame each other. When a repair is postponed repeatedly, an emergency speed restriction (caution order) is imposed, slowing trains down for weeks.
4. **Wasted Track Time:** A section is shut down on Tuesday for rails, and then shut down *again* on Thursday for electrical wires. The track is blocked twice when both teams could have worked safely together during a single window!

---

## 3. The Four Core Pillars We Built for SIH2026

Our project directly addresses all four requirements mandated by the Ministry of Railways in SIH26027:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        RAILNET-AI CORE PLATFORM                        │
├───────────────────┬────────────────────┬───────────────────────────────┤
│ 1. Unified Portal │ 2. Fair Scoring    │ 3. Autonomous AI Engine       │
│    (Track, Signal │    (Transparent &  │    (Google OR-Tools CP-SAT    │
│    & Electrical)  │    Standardized)   │    Zero Train Clashes)        │
└───────────────────┴────────────────────┴───────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ 4. Interactive Schedules & Plain-English Explanations                  │
│    (7-Day & 30-Day Gantt Timetables + Why each block was chosen)       │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Pillar 1: One Unified System for All Three Departments
Instead of separate logbooks, RAILNET-AI provides a single unified digital workspace where:
- **Track Management System (TMS)**,
- **Signalling Maintenance Management System (SMMS)**, and
- **Traction Distribution Management System (TDMS)**
all register their work requests with the exact location (section km), equipment needed, and estimated duration.

### Pillar 2: Transparent, Scientific Priority Scoring
Which job gets scheduled first when time is limited? In manual systems, whoever shouts the loudest or gets senior intervention often gets the slot. 

RAILNET-AI replaces guesswork with a statutory, 100% objective priority formula backed by Indian Railways maintenance manuals:
- **30% Criticality:** How severe is this asset to overall safety?
- **25% Urgency:** Is it an urgent repair or routine maintenance?
- **20% Asset Risk:** How heavily loaded or degraded is this track section?
- **15% Overdue Factor:** How many days has this maintenance been waiting?
- **10% Failure History:** Has this specific equipment failed in the past?

Every job receives an unalterable, transparent score from **0 to 100**. Everyone knows exactly why a job is prioritized.

### Pillar 3: The Autonomous Optimization Brain
At the heart of RAILNET-AI is **Constraint Programming (Google OR-Tools CP-SAT)** — the same mathematical technology used by aerospace agencies and global logistics giants.

Instead of human trial-and-error, the solver mathematically guarantees:
1. **Zero Train Clashes (Hard Rule):** No maintenance block is ever granted when a train is passing through.
2. **Safety Buffer (Hard Rule):** Safe clearance time before the train arrives and after it departs.
3. **No Overlap (Hard Rule):** Two conflicting maintenance crews are never assigned to the same physical section at the same time unless co-ordinated.
4. **Smart Shadow Bundling (Synergy):** If the Track team needs the section from 01:00 to 03:00, and the Electrical team needs 1 hour on the same section, the system smartly schedules them together. **One track closure, two repairs completed.**

### Pillar 4: Multi-Horizon Timetables & Human Explainability
Computers that act as "black boxes" are rejected by railway controllers. Railway controllers have legal responsibility for train safety; they need to know *why* a decision was made.

RAILNET-AI provides:
- **Weekly (7-Day) & Monthly (30-Day) Interactive Timetables:** Beautiful visual timelines (Gantt charts) showing every scheduled train and every maintenance block side-by-side.
- **Audit-Ready "Explain This Block" Cards:** Click any maintenance block on the screen, and the system explains in plain English:
  > *"Scheduled on 05 Sept from 01:30 to 03:30 (120 mins). Reason: Priority score 86. Fits in the night corridor window between Train 12424 (Rajdhani Express, departing 01:10) and Train 12004 (Shatabdi Express, arriving 04:05). Zero passenger clash, safe buffer maintained."*

---

## 4. Real Data vs. Synthetic Data (Honest Engineering)

Judges at SIH value authenticity. We have been 100% transparent in how data enters our system:

| Data Category | Real or Synthetic? | Where it comes from |
|---|---|---|
| **Railway Line (NDLS to CNB)** | **100% REAL** | 440 km corridor with 34 actual stations (New Delhi, Ghaziabad, Aligarh, Tundla, Kanpur) and 183 physical block sections. |
| **Train Schedules** | **100% REAL** | 20 premier passenger trains fetched live from the official **RailRadar API**, tracking thousands of real stop arrivals and departures. |
| **Maintenance Jobs** | **Realistic Synthetic** | Internal railway software (TMS/SMMS/TDMS) is protected behind government intranets. We realistically synthesized 120 authentic maintenance jobs following official railway maintenance rules and flagged them openly. |

---

## 5. Walkthrough of the Application Screens

When you open the RAILNET-AI web application, here is what you experience:

### 1. Executive Dashboard (`/`)
- A high-level control room overview.
- Real-time KPIs: Total corridor sections active, pending maintenance backlog, scheduled blocks, and train punctuality health.
- Quick navigation to weekly timetables, corridor health, and the optimizer.

### 2. The Optimizer Command Center (`/optimizer`)
- The control room where section managers initiate schedule generation.
- Shows the official statutory formula (30/25/20/15/10) and corridor boundaries.
- Clicking **"Run CP-SAT Optimizer"** runs the solver live with a real-time progress indicator, displaying the completed schedule in under 5 seconds with zero conflicts.

### 3. Interactive Timetable / Gantt Chart (`/plans/weekly` & `/plans/monthly`)
- An interactive, color-coded visual schedule:
  - 🔵 **Blue:** Track Department (TMS)
  - 🟣 **Purple:** Signal Department (SMMS)
  - 🟠 **Amber:** Electrical Department (TDMS)
  - 🟢 **Green Badge:** Clean window (zero train disturbance).
  - 🟡 **Yellow Badge:** Relaxed window (soft preference accommodated).
  - 🔴 **Red Alert:** Highlights any impossible bottlenecks so controllers can take action in advance.
- Allows zooming and clicking any block to view full details.

### 4. Corridor & Station Twin (`/sections`)
- An interactive map and list of all 34 stations and 183 block sections between New Delhi and Kanpur.
- Shows current speed restrictions, active maintenance possessions, and section health.

### 5. Trains Monitor (`/trains`)
- Live timetable monitor of the premier trains traversing the corridor (Rajdhani, Vande Bharat, Gomti Express, etc.).
- Displays scheduled arrival, departure, platform, and delay tolerance.

### 6. Transparent Block Explainer (`/blocks/{id}`)
- Dedicated audit page for any single maintenance job.
- Explains the mathematical reasoning, preceding/succeeding train movements, and safety buffers in plain, non-technical language.

---

## 6. Proven Results: Why is our AI better than Manual Planning?

To prove the value of our system to SIH judges, we conducted a rigorous benchmark comparison against traditional planning heuristics:

| Metric | Traditional Method (First-Come-First-Served) | Traditional Method (Earliest-Deadline-First) | **RAILNET-AI (Our CP-SAT Optimizer)** | Real-World Railway Benefit |
|---|---|---|---|---|
| **Hard Train Clashes** | High (frequent overlaps) | Frequent overlaps | **0 (Zero)** | Eliminates train stops caused by maintenance work. |
| **Cross-Department Clashes** | Common (conflicting repairs) | Common | **0 (Zero)** | Prevents dangerous conflicting work on the same track. |
| **Critical Job Backlog** | Often delayed | Delayed by simple dates | **Scheduled within safety windows** | High-risk track flaws are fixed before accidents happen. |
| **Planning Time** | Several hours of phone calls | 1 to 2 hours of manual sorting | **~3 seconds** | Frees controllers to focus on real-time train safety. |

---

## 7. Real-World Benefits for Indian Railways

1. **Better Train Punctuality (Mission Raftaar):** Trains do not get held up at outer signals because track work was scheduled during an unexpected train gap.
2. **Passenger Safety:** Broken rails, failing signal relays, and loose catenary wires are systematically addressed by priority rather than whoever calls first.
3. **Productive Track Utilization:** By combining Track and Electrical repairs into simultaneous shared blocks ("shadow blocks"), Indian Railways gets more repairs done with fewer total track closures.
4. **Audit Trail & Accountability:** Every decision is logged with timestamps, priority scores, and reason codes, reducing inter-departmental conflict.

---

## 8. Summary for Judges

> **"RAILNET-AI transforms railway maintenance from a reactive, paper-and-phone negotiation into a proactive, mathematically verified corridor timetable — protecting passenger safety, improving train punctuality, and ensuring every rupee and minute spent on railway maintenance delivers maximum impact."**

