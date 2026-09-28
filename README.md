# UEBA Sentinel: User & Entity Behavior Analytics Platform

A complete, production-grade cybersecurity User and Entity Behavior Analytics (UEBA) web application prototype built with a **FastAPI backend** and a clean, responsive web frontend. Purpose-built around enterprise SOC requirements, core design objectives, and four foundational **"How Might We" (HMW)** design challenges contributed by **Shriram, Arshinth, Keshav, and Alfred**.

---

## 🚀 Quick Start & Installation

### 1. Python FastAPI Backend (Standalone)

```bash
# Install Python 3.10+ dependencies
pip install -r requirements.txt

# Start FastAPI server with live WebSocket streaming
uvicorn backend.app:app --reload --host 0.0.0.0 --port 8000
```
- **Landing Page:** `http://localhost:8000/`
- **Real-Time SOC Dashboard:** `http://localhost:8000/dashboard.html`
- **HMW Strategy Board:** `http://localhost:8000/hmw.html`
- **Interactive OpenAPI Docs:** `http://localhost:8000/docs`
- **WebSocket Streaming URL:** `ws://localhost:8000/ws/telemetry`

### 2. Node.js Full-Stack Dev Server (Port 3000)

```bash
# Start Vite + Express server
npm run dev
```
- **Unified SOC Console:** `http://localhost:3000/`
- **Standalone Dashboard:** `http://localhost:3000/dashboard.html`
- **HMW Ideation Board:** `http://localhost:3000/hmw.html`

---

## 🎯 The Four Core HMW Problem Statements & Solutions

UEBA Sentinel provides dedicated, tangible functional modules for the four core design challenges:

### • HMW 1: "How might we detect slow, gradual changes in behavior before they become serious?"
> **Contributor:** Shriram | **Design Goal:** Goal 4 (Early Pre-Incident Warning)
- **Feature:** **Long-Term Baseline Drift & Cumulative Velocity Tracker**
- **Mechanism:** Implements an Exponentially Weighted Moving Average (EWMA) with smoothing factor $\alpha = 0.20$:
  $$EWMA_t = \alpha \cdot X_t + (1 - \alpha) \cdot EWMA_{t-1}$$
  $$\text{Weekly Drift \%} = \frac{EWMA_t - \text{Baseline}}{\text{Baseline}} \times 100\%$$
- **Detection:** Detects "low-and-slow" exfiltration and gradual habit changes that stay beneath single-event thresholds but show continuous deviation (>15% weekly drift).
- **UI Indicator:** Dedicated **Drift Velocity Indicator** in the Unified Entity Dossier displaying e.g. `+28.4% Weekly Drift — Low & Slow Exfil Warning`.

---

### • HMW 2: "How might we make security dashboards easier to understand at a glance?"
> **Contributor:** Keshav | **Design Goal:** Goal 1 (Unified Behavioral Dossier)
- **Feature:** **Plain-English Anomaly Narrative & 3-Second Visual Chips**
- **Mechanism:** Eliminates raw JSON dumps and cryptic error codes. Automatically generates concise, human-readable sentence summaries:
  > *"Sophia Chen executed Cloud Storage Bulk Sync on `s3://sentinel-customer-pii-vault/archive.tar.gz` from atypical IP (Munich, Germany) during non-business hours downloading 4.5x daily volume with +28.4% cumulative weekly drift."*
- **Visual Chips:** 3-second visual tag chips: `[ATYPICAL_LOCATION]`, `[OFF_HOURS]`, `[VOLUME_SPIKE]`, `[RAPID_DRIFT]`, `[PRIVILEGE_SPIKE]`.

---

### • HMW 3: "How might we integrate AI-driven detection without losing human oversight?"
> **Contributor:** Alfred | **Design Goal:** Goal 2 (AI Detection with Human Control)
- **Feature:** **"Explain Why" Factor Breakdown & Dynamic Feedback Loop**
- **Mechanism:** Every incident card includes an expandable **"Why was this flagged?"** inspector displaying exact model factor contributions:
  - *Peer Volume Deviation (40%)*: Exceeds peer group average by 3.2x.
  - *Off-Hours Circadian Multiplier (35%)*: Activity performed outside authorized schedule window.
  - *Cumulative Baseline Drift (25%)*: Multi-day EWMA volume drift.
- **1-Click Triage Actions:**
  - **Verify Threat**: Immediately flags threat and initiates entity containment.
  - **Step-Up MFA**: Dispatches real-time challenge to user's registered authenticator.
  - **Flag False Positive**: Automatically down-weights that specific signal type in memory (e.g. `RULE_ODD_HOURS` drops from 1.0x to 0.65x multiplier), eliminating alert fatigue.

---

### • HMW 4: "How might we make new security tools easier to onboard into an existing stack?"
> **Contributor:** Arshinth | **Design Goal:** Goal 6 (Real-Time Sub-Second Ingestion)
- **Feature:** **Universal Telemetry Ingestion Adapter (`POST /api/v1/telemetry/universal`)**
- **Mechanism:** Schema-flexible ingestion endpoint with an automatic field normalizer:
  - Seamlessly accepts **CEF (Common Event Format)**, **Syslog (RFC 5424/3164)**, and **arbitrary JSON keys**.
  - Maps arbitrary aliases to canonical fields:
    - User: `client_ip`, `src_ip`, `src`, `host_ip`, `network_source` $\to$ `source_ip`
    - Account: `suser`, `account`, `user`, `username`, `login`, `uid` $\to$ `user_id`
    - Action: `act`, `event_type`, `activity`, `operation`, `action_name` $\to$ `action`
    - Volume: `bytes_transferred`, `size`, `transfer_size`, `byte_count` $\to$ `bytes`
- **Interactive Test Runner:** Built-in modal in the dashboard with sample CEF, Syslog, and JSON presets to test live log forwarding in seconds.

---

## 📊 Complete 9 Goals & Contributor Attribution Matrix

| # | Design Goal | Contributor | Mapped Feature & View |
|---|---|---|---|
| **1** | Unified risk scores, behavior trends, and account activity | **Keshav** | **Unified Entity View**: 24h circadian curve, risk scores, peer comparisons |
| **2** | AI anomaly detection with human control | **Alfred** | **"Explain Why" Factor Inspector** & 1-click Verify/MFA/False Positive |
| **3** | Dynamic alert prioritization by risk velocity | **Keshav** | **Prioritized Incident Queue** ordered by composite severity score |
| **4** | Detect deviations before they become incidents | **Shriram** | **EWMA Long-Term Baseline Drift** & Early Pre-Incident Warning |
| **5** | Continuous false-positive reduction | **Arshinth** | **Dynamic Signal Down-Weighting** via closed-loop analyst feedback |
| **6** | Low-latency real-time detection | **Shriram** | **Native WebSocket Layer** (`/ws/telemetry`) with sub-second scoring |
| **7** | Real-time insider threat detection | **Arshinth** | **Corroboration Engine**: impossible travel velocity & privilege abuse |
| **8** | Automated behavioral AI without static rules | **Shriram** | **Multi-Dimensional Anomaly Engine**: hour, volume, baseline ratios |
| **9** | Proactive security posture shift | **Arshinth** | **Executive Posture Panel**: Proactive (78%) vs Reactive (22%) ratio |

---

## 🏛️ System Architecture

```
                    ┌────────────────────────────────────────┐
                    │       Web Frontend Clients             │
                    │  • frontend/index.html (Landing)       │
                    │  • frontend/dashboard.html (SOC Console)│
                    │  • frontend/hmw.html (Strategy Board)  │
                    └───────┬────────────────────────▲───────┘
                            │ REST /api/v1/*         │ WebSocket (/ws/telemetry)
                            ▼                        │
┌────────────────────────────────────────────────────┴───────────────────────────┐
│                      FastAPI Backend Engine (backend/app.py)                   │
├────────────────────────────────────────────────────────────────────────────────┤
│ • Universal Telemetry Normalizer (CEF / Syslog / JSON)                         │
│ • EWMA Baseline Drift & Cumulative Velocity Calculator (>15% weekly drift)     │
│ • Plain-English Narrative & 3-Second Visual Chips Generator                    │
│ • "Explain Why" Factor Weight Engine (Peer Vol, Off-Hours, Drift, Privilege)   │
│ • Closed-Loop Feedback Down-Weight Multipliers (RULE_ODD_HOURS -> 0.65x)       │
│ • Native WebSocket Broadcast Manager with zero-polling live updates            │
│ • Synthetic Enterprise Telemetry Emitter (generator.py)                        │
└────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📁 Repository File Structure

```
├── backend/
│   ├── app.py                  # FastAPI application, WebSockets & REST routes
│   ├── detection_engine.py     # EWMA drift, plain-English narrative, Explain-Why
│   ├── generator.py            # Synthetic enterprise telemetry & anomaly injector
│   ├── models.py               # Pydantic v2 schemas for events, alerts, HMW
│   └── fastapi_ueba.py         # scikit-learn Isolation Forest engine
├── frontend/
│   ├── index.html              # Landing Page with product overview & value props
│   ├── dashboard.html          # Real-Time SOC Dashboard (Posture, Stream, Dossier, Queue)
│   ├── hmw.html                # HMW Strategy & Ideation Board with interactive voting
│   ├── app.js                  # Frontend WebSocket client & chart controllers
│   └── styles.css              # Custom layout and scrollbar extensions
├── server/
│   ├── routes.ts               # Express API router (including /api/v1 endpoints)
│   ├── realtimeEngine.ts       # Node.js WebSocket engine & scoring orchestrator
│   └── syntheticGenerator.ts   # 30-day baseline data generator
├── requirements.txt            # Python dependencies (fastapi, uvicorn, pydantic)
├── package.json                # Node.js dependencies & scripts
├── server.ts                   # Unified dev server entry point (Port 3000)
└── README.md                   # Comprehensive system documentation
```

---

## 🧪 Interactive Threat Simulations

From either the **SOC Dashboard** or API (`POST /api/v1/simulation/scenario`), test live scenarios:
1. **Low & Slow Exfiltration (`LOW_AND_SLOW_EXFIL`)**: Demonstrates HMW 1 with gradual multi-day EWMA drift (+28.4%) triggering early warning before full alert thresholds.
2. **Atypical Off-Hours Access (`ATYPICAL_OFF_HOURS_ACCESS`)**: Demonstrates HMW 2 & 3 with plain-English summary, factor breakdown, and 1-click MFA challenge.
3. **Impossible Travel Velocity (`IMPOSSIBLE_TRAVEL_VELOCITY`)**: Geolocation displacement exceeding physical aircraft velocities (>900 km/h).
4. **Universal Log Ingestion (`POST /api/v1/telemetry/universal`)**: Test raw CEF or Syslog payloads directly using the dashboard adapter modal.
