"""
FastAPI Backend Application for UEBA Sentinel
Provides:
- Native WebSocket (/ws/telemetry) broadcasting live events, alerts, and posture
- Universal Telemetry Ingestion route (/api/v1/telemetry/universal) for CEF, Syslog, JSON (HMW 4)
- EWMA Drift & Anomaly Evaluation (HMW 1)
- Plain-English Narratives & 3-Second Visual Chips (HMW 2)
- Explain-Why Factor Breakdown & Analyst Feedback Downweighting (HMW 3)
- HMW Strategic Ideation Management
"""

import asyncio
import json
from typing import List, Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from backend.models import (
    UniversalTelemetryPayload,
    TelemetryEvent,
    AlertItem,
    AnalystFeedback,
    PostureStats,
    HMWQuestion,
    UserProfile
)
from backend.detection_engine import (
    UniversalFieldNormalizer,
    EWMADriftCalculator,
    PlainEnglishNarrativeGenerator,
    ExplainWhyBreakdownEngine,
    score_and_process_event,
    USER_BASELINES,
    SIGNAL_MULTIPLIERS,
    FEEDBACK_HISTORY
)
from backend.generator import SyntheticTelemetryEmitter

app = FastAPI(
    title="UEBA Sentinel - Enterprise Security Intelligence",
    description="ManageEngine Log360-inspired UEBA prototype with real-time WebSocket, EWMA baseline drift, and universal telemetry ingestion.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- IN-MEMORY STATE -----------------
LIVE_EVENTS: List[TelemetryEvent] = []
INCIDENT_QUEUE: List[AlertItem] = []
PROCESSED_EVENTS_COUNT = 1420
THEATS_NEUTRALIZED_COUNT = 18

HMW_QUESTIONS: List[HMWQuestion] = [
    HMWQuestion(
        id="hmw-1",
        question="How might we detect slow, gradual changes in behavior before they become serious?",
        contributor="Shriram",
        theme="Early Warning",
        status="Validated",
        target_goal="Goal 4: Early Pre-Incident Warning",
        solution_summary="Exponentially Weighted Moving Average (EWMA) tracker detecting weekly drift >15% across multi-day volume baselines.",
        votes=28,
        created_at="2026-09-24T10:00:00Z"
    ),
    HMWQuestion(
        id="hmw-2",
        question="How might we make security dashboards easier to understand at a glance?",
        contributor="Keshav",
        theme="Unified Dossier",
        status="Validated",
        target_goal="Goal 1: Unified Behavioral Dossier",
        solution_summary="Automated Plain-English Anomaly Narrative generator that produces complete sentence summaries with 3-second visual chips.",
        votes=34,
        created_at="2026-09-24T11:30:00Z"
    ),
    HMWQuestion(
        id="hmw-3",
        question="How might we integrate AI-driven detection without losing human oversight?",
        contributor="Alfred",
        theme="Oversight",
        status="Validated",
        target_goal="Goal 2: AI Detection with Human Control",
        solution_summary="Expandable 'Why was this flagged?' breakdown with exact model factor percentages and 1-click triage actions (Verify Threat, Step-Up MFA, Flag False Positive).",
        votes=41,
        created_at="2026-09-24T14:15:00Z"
    ),
    HMWQuestion(
        id="hmw-4",
        question="How might we make new security tools easier to onboard into an existing stack?",
        contributor="Arshinth",
        theme="Universal Ingestion",
        status="Validated",
        target_goal="Goal 6: Real-Time Sub-Second Ingestion",
        solution_summary="Universal Telemetry Adapter (/api/v1/telemetry/universal) mapping CEF, Syslog, and arbitrary JSON keys automatically.",
        votes=37,
        created_at="2026-09-25T09:00:00Z"
    ),
    HMWQuestion(
        id="hmw-5",
        question="How might we reduce alert fatigue caused by benign off-hours employee activity?",
        contributor="Arshinth",
        theme="False Positive Reduction",
        status="In Prototype",
        target_goal="Goal 5: Dynamic False-Positive Reduction",
        solution_summary="Feedback-driven signal multiplier downweighting benign triggers (e.g. RULE_ODD_HOURS downweighted to 0.65x multiplier).",
        votes=25,
        created_at="2026-09-25T11:00:00Z"
    ),
    HMWQuestion(
        id="hmw-6",
        question="How might we detect insider threats operating completely within valid credentials?",
        contributor="Shriram",
        theme="Insider Threat",
        status="In Prototype",
        target_goal="Goal 7: Real-Time Insider Threat Detection",
        solution_summary="Corroborate credential velocity, impossible geographic displacement, and high blast-radius resource staging.",
        votes=31,
        created_at="2026-09-26T08:30:00Z"
    ),
    HMWQuestion(
        id="hmw-7",
        question="How might we help CISOs measure whether our defense is truly proactive?",
        contributor="Arshinth",
        theme="Posture Defense",
        status="Validated",
        target_goal="Goal 9: Shift to Proactive Posture",
        solution_summary="Executive Posture Panel comparing early-warning preemptions against reactive threshold breaches with lead-time metrics.",
        votes=29,
        created_at="2026-09-26T14:00:00Z"
    )
]

# ----------------- WEBSOCKET BROADCAST MANAGER -----------------
class WebSocketBroadcastManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_json(self, message: Dict[str, Any]):
        for connection in list(self.active_connections):
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                self.disconnect(connection)

ws_manager = WebSocketBroadcastManager()

def compute_posture_stats() -> PostureStats:
    early_warnings = sum(1 for a in INCIDENT_QUEUE if a.is_early_warning)
    reactive = sum(1 for a in INCIDENT_QUEUE if not a.is_early_warning)
    total = early_warnings + reactive
    ratio = int(round((early_warnings / max(total, 1)) * 100)) if total > 0 else 78

    fp_rates = {
        "RULE_ODD_HOURS": 34.2,
        "RULE_IMPOSSIBLE_TRAVEL": 14.8,
        "RULE_VOLUME_SPIKE": 8.5,
        "RULE_OFF_HOURS_EXFIL": 4.1,
        "RULE_PRIVILEGE_ESCALATION": 2.3
    }

    return PostureStats(
        proactive_ratio=ratio,
        early_warnings_count=early_warnings,
        reactive_alerts_count=reactive,
        avg_lead_time_hours=4.2,
        false_positive_rates=fp_rates,
        signal_weight_multipliers=SIGNAL_MULTIPLIERS,
        total_events_processed=PROCESSED_EVENTS_COUNT,
        threats_neutralized=THEATS_NEUTRALIZED_COUNT
    )

# ----------------- WEBSOCKET ROUTE -----------------
@app.websocket("/ws/telemetry")
async def websocket_telemetry_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial sync payload
        init_payload = {
            "type": "INITIAL_SYNC",
            "recent_events": [e.dict() for e in LIVE_EVENTS[-20:]],
            "incidents": [i.dict() for i in INCIDENT_QUEUE[:15]],
            "posture": compute_posture_stats().dict()
        }
        await websocket.send_text(json.dumps(init_payload))

        while True:
            # Handle incoming ping/action messages from frontend client
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("action") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG", "timestamp": datetime.utcnow().isoformat()}))
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)

# ----------------- API ROUTES -----------------

@app.get("/api/health")
def get_health():
    return {
        "status": "healthy",
        "service": "UEBA Sentinel Fast Engine",
        "version": "2.0.0",
        "active_ws_clients": len(ws_manager.active_connections),
        "total_events_processed": PROCESSED_EVENTS_COUNT
    }

@app.post("/api/v1/telemetry/universal")
async def ingest_universal_telemetry(payload: UniversalTelemetryPayload):
    """
    HMW 4: Universal Ingestion Adapter
    Accepts CEF, Syslog, or flexible JSON. Standardizes fields and immediately scores the event.
    """
    global PROCESSED_EVENTS_COUNT
    normalized = UniversalFieldNormalizer.normalize(payload)
    event, alert = score_and_process_event(normalized)

    PROCESSED_EVENTS_COUNT += 1
    LIVE_EVENTS.insert(0, event)
    if len(LIVE_EVENTS) > 100:
        LIVE_EVENTS.pop()

    if alert:
        INCIDENT_QUEUE.insert(0, alert)
        if len(INCIDENT_QUEUE) > 50:
            INCIDENT_QUEUE.pop()

    # Broadcast via WebSocket in real-time
    await ws_manager.broadcast_json({
        "type": "LIVE_TELEMETRY_SCORED",
        "event": event.dict(),
        "alert": alert.dict() if alert else None,
        "posture": compute_posture_stats().dict()
    })

    return {
        "status": "ingested_and_scored",
        "normalized_event": event,
        "incident_generated": alert is not None,
        "alert_id": alert.alert_id if alert else None
    }

@app.get("/api/v1/events/recent", response_model=List[TelemetryEvent])
def get_recent_events(limit: int = 30):
    return LIVE_EVENTS[:limit]

@app.get("/api/v1/incidents", response_model=List[AlertItem])
def get_incidents():
    return INCIDENT_QUEUE

@app.post("/api/v1/incidents/{alert_id}/feedback")
async def record_analyst_feedback(alert_id: str, feedback: AnalystFeedback):
    """
    HMW 3: Dynamic Analyst Feedback Loop
    Actions: "VERIFY_THREAT", "STEP_UP_MFA", "FLAG_FALSE_POSITIVE"
    Down-weights repeat false positives in memory.
    """
    global THEATS_NEUTRALIZED_COUNT
    target_alert = next((a for a in INCIDENT_QUEUE if a.alert_id == alert_id), None)
    if not target_alert:
        raise HTTPException(status_code=404, detail="Alert incident not found")

    target_alert.analyst_status = feedback.decision
    target_alert.analyst_action_taken = feedback.decision

    downweight_applied = 0.0
    if feedback.decision == "FLAG_FALSE_POSITIVE":
        sig = feedback.signal_type or (target_alert.signals[0] if target_alert.signals else "RULE_ODD_HOURS")
        current_mult = SIGNAL_MULTIPLIERS.get(sig, 1.0)
        # Reduce weight by 20% down to 0.35 floor
        new_mult = max(0.35, round(current_mult * 0.80, 2))
        SIGNAL_MULTIPLIERS[sig] = new_mult
        downweight_applied = round(current_mult - new_mult, 2)
    elif feedback.decision in ["VERIFY_THREAT", "STEP_UP_MFA"]:
        THEATS_NEUTRALIZED_COUNT += 1

    feedback.downweight_applied = downweight_applied
    FEEDBACK_HISTORY.append(feedback)

    # Broadcast updated incident and posture
    await ws_manager.broadcast_json({
        "type": "ANALYST_ACTION_COMMITTED",
        "alert_id": alert_id,
        "decision": feedback.decision,
        "signal_multipliers": SIGNAL_MULTIPLIERS,
        "posture": compute_posture_stats().dict()
    })

    return {
        "status": "success",
        "alert_id": alert_id,
        "decision": feedback.decision,
        "downweight_applied": downweight_applied,
        "current_multipliers": SIGNAL_MULTIPLIERS
    }

@app.get("/api/v1/entities/{user_id}/dossier")
def get_entity_dossier(user_id: str):
    """
    HMW 1 & Goal 1: Unified Entity View with EWMA Baseline Drift
    """
    meta = USER_BASELINES.get(user_id)
    if not meta:
        raise HTTPException(status_code=404, detail="Entity profile not found")

    # Generate 24h circadian curve: hourly expected baseline vs observed
    circadian_curve = []
    for h in range(24):
        is_normal_work = meta["expected_work_start"] <= h <= meta["expected_work_end"]
        expected_bytes = int(meta["baseline_volume_bytes"] / 10) if is_normal_work else int(meta["baseline_volume_bytes"] / 60)
        # Add actual observed
        actual_bytes = expected_bytes
        if meta["is_drifting"] and (h == 2 or h == 3 or h == 23):
            actual_bytes = int(expected_bytes * 3.8)
        circadian_curve.append({
            "hour": f"{h:02d}:00",
            "expected_baseline_kb": round(expected_bytes / 1024, 1),
            "actual_observed_kb": round(actual_bytes / 1024, 1)
        })

    return {
        "entity": {
            "id": user_id,
            "name": meta["name"],
            "email": meta["email"],
            "department": meta["department"],
            "role_title": meta["role_title"],
            "risk_score": meta["risk_score"],
            "peer_avg_risk": meta["peer_avg_risk"],
            "ewma_velocity_score": meta.get("ewma_velocity", 18.4),
            "drift_velocity_pct": meta.get("drift_velocity_pct", 24.8),
            "is_drifting": meta.get("is_drifting", True),
            "privilege_level": meta.get("privilege_level", "Tier-1 Admin"),
            "baseline_volume_bytes": meta["baseline_volume_bytes"]
        },
        "circadian_24h_curve": circadian_curve,
        "user_alerts": [a.dict() for a in INCIDENT_QUEUE if a.user_id == user_id][:5]
    }

@app.get("/api/v1/metrics/posture", response_model=PostureStats)
def get_posture_metrics():
    return compute_posture_stats()

@app.get("/api/v1/hmw", response_model=List[HMWQuestion])
def get_hmw_questions():
    return HMW_QUESTIONS

@app.post("/api/v1/hmw", response_model=HMWQuestion)
def add_hmw_question(q: HMWQuestion):
    q.id = f"hmw-{len(HMW_QUESTIONS) + 1}"
    q.created_at = datetime.utcnow().isoformat() + "Z"
    HMW_QUESTIONS.append(q)
    return q

@app.post("/api/v1/hmw/{question_id}/vote")
def upvote_hmw_question(question_id: str):
    target = next((q for q in HMW_QUESTIONS if q.id == question_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="HMW Question not found")
    target.votes += 1
    return {"id": question_id, "votes": target.votes}

@app.post("/api/v1/simulation/scenario")
async def trigger_simulated_threat_scenario(scenario_type: str = Body(..., embed=True)):
    """
    Allows analysts to inject instant threat scenarios (e.g. LOW_AND_SLOW_EXFIL, ATYPICAL_OFF_HOURS_ACCESS)
    """
    raw_event = SyntheticTelemetryEmitter.generate_next_event(force_anomaly_type=scenario_type)
    normalized = UniversalFieldNormalizer.normalize(UniversalTelemetryPayload(data=raw_event))
    event, alert = score_and_process_event(normalized)

    LIVE_EVENTS.insert(0, event)
    if alert:
        INCIDENT_QUEUE.insert(0, alert)

    await ws_manager.broadcast_json({
        "type": "LIVE_TELEMETRY_SCORED",
        "event": event.dict(),
        "alert": alert.dict() if alert else None,
        "posture": compute_posture_stats().dict()
    })

    return {
        "status": "scenario_injected",
        "scenario": scenario_type,
        "event": event,
        "alert": alert
    }

# Seed initial incidents on startup
def _seed_initial_state():
    for user_id in USER_BASELINES.keys():
        sample = SyntheticTelemetryEmitter.generate_next_event()
        sample["user_id"] = user_id
        norm = UniversalFieldNormalizer.normalize(UniversalTelemetryPayload(data=sample))
        evt, alt = score_and_process_event(norm)
        LIVE_EVENTS.append(evt)
        if alt:
            INCIDENT_QUEUE.append(alt)

_seed_initial_state()

# ----------------- BACKGROUND TELEMETRY EMITTER TASK -----------------
async def background_telemetry_loop():
    while True:
        try:
            await asyncio.sleep(3.5)
            raw = SyntheticTelemetryEmitter.generate_next_event()
            norm = UniversalFieldNormalizer.normalize(UniversalTelemetryPayload(data=raw))
            evt, alt = score_and_process_event(norm)

            LIVE_EVENTS.insert(0, evt)
            if len(LIVE_EVENTS) > 100:
                LIVE_EVENTS.pop()

            if alt:
                INCIDENT_QUEUE.insert(0, alt)
                if len(INCIDENT_QUEUE) > 50:
                    INCIDENT_QUEUE.pop()

            if ws_manager.active_connections:
                await ws_manager.broadcast_json({
                    "type": "LIVE_TELEMETRY_SCORED",
                    "event": evt.dict(),
                    "alert": alt.dict() if alt else None,
                    "posture": compute_posture_stats().dict()
                })
        except asyncio.CancelledError:
            break
        except Exception as e:
            await asyncio.sleep(1.0)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(background_telemetry_loop())

# Mount frontend directory if exists
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/")
    def serve_frontend_root():
        return FileResponse(os.path.join(frontend_dir, "index.html"))

    @app.get("/dashboard.html")
    def serve_dashboard():
        return FileResponse(os.path.join(frontend_dir, "dashboard.html"))

    @app.get("/hmw.html")
    def serve_hmw():
        return FileResponse(os.path.join(frontend_dir, "hmw.html"))
