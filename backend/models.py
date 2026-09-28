"""
Pydantic v2 Schemas for UEBA Sentinel
Supports Universal Telemetry Ingestion, Dynamic EWMA Drift Scoring,
Explain-Why Breakdown Factors, Analyst Feedback, and HMW Question Management.
"""

from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime

class ExplainWhyFactor(BaseModel):
    factor_name: str
    weight_pct: int
    description: str
    impact: str = "HIGH"  # LOW, MEDIUM, HIGH, CRITICAL

class TelemetryEvent(BaseModel):
    event_id: str
    timestamp: str
    user_id: str
    user_name: Optional[str] = None
    department: Optional[str] = None
    action: str
    resource: str
    source_ip: str
    location: Optional[str] = "Office Network"
    bytes_transferred: int = 0
    is_off_hours: bool = False
    is_sensitive_resource: bool = False
    anomaly_score: float = 0.0
    priority_score: int = 0
    is_early_warning: bool = False
    signals: List[str] = Field(default_factory=list)
    plain_english_narrative: Optional[str] = None
    chips: List[str] = Field(default_factory=list)
    explain_why: List[ExplainWhyFactor] = Field(default_factory=list)
    drift_velocity_pct: Optional[float] = None

class UniversalTelemetryPayload(BaseModel):
    """
    HMW 4: Flexible ingestion payload supporting CEF, Syslog, or arbitrary JSON keys.
    The normalizer will automatically map alias keys into standard telemetry fields.
    """
    format_type: Optional[str] = "generic_json"  # "cef", "syslog", "generic_json"
    raw_payload: Optional[str] = None
    
    # Generic dictionary allowing arbitrary keys from log forwarders (e.g., client_ip, suser, etc.)
    data: Optional[Dict[str, Any]] = None

    # Optional direct fields if already structured
    user_id: Optional[str] = None
    action: Optional[str] = None
    resource: Optional[str] = None
    source_ip: Optional[str] = None
    bytes: Optional[int] = None
    timestamp: Optional[str] = None
    location: Optional[str] = None

class AlertItem(BaseModel):
    alert_id: str
    timestamp: str
    user_id: str
    user_name: str
    department: str
    title: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    priority_score: int
    is_early_warning: bool = False
    detection_type: str = "REACTIVE_THRESHOLD"  # PROACTIVE_EARLY_WARNING or REACTIVE_THRESHOLD
    warning_label: Optional[str] = None
    plain_english_narrative: str
    chips: List[str]
    explain_why: List[ExplainWhyFactor]
    signals: List[str]
    analyst_status: str = "PENDING"  # PENDING, VERIFIED_THREAT, STEP_UP_MFA, FALSE_POSITIVE
    analyst_action_taken: Optional[str] = None
    mitre_attack: Optional[str] = None
    drift_velocity_pct: Optional[float] = 0.0
    details: Optional[Dict[str, Any]] = None

class UserProfile(BaseModel):
    id: str
    name: str
    email: str
    department: str
    role_title: str
    risk_score: int
    baseline_volume_bytes: int
    expected_work_start: int = 8
    expected_work_end: int = 18
    ewma_velocity_score: float = 0.0
    drift_velocity_pct: float = 0.0
    is_drifting: bool = False
    last_active: str
    peer_avg_risk: int = 35

class AnalystFeedback(BaseModel):
    alert_id: str
    signal_type: str
    decision: str  # "VERIFY_THREAT", "STEP_UP_MFA", "FLAG_FALSE_POSITIVE", "DISMISSED"
    notes: Optional[str] = ""
    analyst_name: Optional[str] = "SOC Analyst"
    downweight_applied: Optional[float] = 0.0

class PostureStats(BaseModel):
    proactive_ratio: int
    early_warnings_count: int
    reactive_alerts_count: int
    avg_lead_time_hours: float
    false_positive_rates: Dict[str, float]
    signal_weight_multipliers: Dict[str, float]
    total_events_processed: int
    threats_neutralized: int

class HMWQuestion(BaseModel):
    id: str
    question: str
    contributor: str  # Shriram, Arshinth, Keshav, Alfred
    theme: str        # Early Warning, False Positive Reduction, Prioritization, Oversight, Ingestion
    status: str       # "Backlog", "In Prototype", "Validated"
    target_goal: str
    solution_summary: str
    votes: int = 0
    created_at: Optional[str] = None
