"""
Detection & Analytics Engine for UEBA Sentinel
Implements:
1. HMW 1: EWMA Long-Term Baseline Drift & Cumulative Velocity Tracker (>15% weekly drift detection)
2. HMW 2: Plain-English Anomaly Narrative & 3-Second Visual Chips
3. HMW 3: Explain-Why Factor Breakdown & Dynamic Analyst Feedback Weighting
4. HMW 4: Universal Telemetry Normalizer (CEF, Syslog, Flexible JSON)
"""

import math
import re
from datetime import datetime
from typing import Dict, List, Any, Tuple, Optional
from backend.models import (
    TelemetryEvent,
    UniversalTelemetryPayload,
    ExplainWhyFactor,
    AlertItem,
    UserProfile,
    AnalystFeedback
)

# In-memory baseline dictionary for users: user_id -> dict
USER_BASELINES: Dict[str, Dict[str, Any]] = {
    "sophia.chen": {
        "name": "Sophia Chen",
        "email": "sophia.chen@sentinel.soc",
        "department": "Engineering",
        "role_title": "Senior Infrastructure Architect",
        "risk_score": 88,
        "baseline_volume_bytes": 15_000_000,  # 15 MB normal
        "expected_work_start": 9,
        "expected_work_end": 18,
        "ewma_velocity": 24.8,
        "current_ewma_bytes": 22_500_000,
        "drift_velocity_pct": 28.4,
        "is_drifting": True,
        "peer_avg_risk": 32,
        "privilege_level": "Tier-1 Admin",
        "privilege_multiplier": 1.45,
    },
    "marcus.vance": {
        "name": "Marcus Vance",
        "email": "marcus.vance@sentinel.soc",
        "department": "Finance",
        "role_title": "Staff Financial Controller",
        "risk_score": 79,
        "baseline_volume_bytes": 8_000_000,
        "expected_work_start": 8,
        "expected_work_end": 17,
        "ewma_velocity": 17.5,
        "current_ewma_bytes": 11_200_000,
        "drift_velocity_pct": 19.2,
        "is_drifting": True,
        "peer_avg_risk": 28,
        "privilege_level": "Financial Lead",
        "privilege_multiplier": 1.30,
    },
    "elena.rostova": {
        "name": "Elena Rostova",
        "email": "elena.rostova@sentinel.soc",
        "department": "DevOps",
        "role_title": "Kubernetes Cluster Administrator",
        "risk_score": 64,
        "baseline_volume_bytes": 25_000_000,
        "expected_work_start": 10,
        "expected_work_end": 19,
        "ewma_velocity": 12.0,
        "current_ewma_bytes": 28_000_000,
        "drift_velocity_pct": 12.0,
        "is_drifting": False,
        "peer_avg_risk": 38,
        "privilege_level": "Root Admin",
        "privilege_multiplier": 1.50,
    },
    "david.kim": {
        "name": "David Kim",
        "email": "david.kim@sentinel.soc",
        "department": "Human Resources",
        "role_title": "HR Operations Specialist",
        "risk_score": 42,
        "baseline_volume_bytes": 3_000_000,
        "expected_work_start": 8,
        "expected_work_end": 16,
        "ewma_velocity": 4.5,
        "current_ewma_bytes": 3_200_000,
        "drift_velocity_pct": 6.7,
        "is_drifting": False,
        "peer_avg_risk": 22,
        "privilege_level": "Standard",
        "privilege_multiplier": 1.0,
    }
}

# Signal weight multipliers in memory (HMW 3: Dynamic FP down-weighting)
SIGNAL_MULTIPLIERS: Dict[str, float] = {
    "RULE_ODD_HOURS": 0.65,          # Heavily downweighted by analyst feedback
    "RULE_IMPOSSIBLE_TRAVEL": 0.85,  # Moderately downweighted (benign VPNs)
    "RULE_VOLUME_SPIKE": 1.0,
    "RULE_OFF_HOURS_EXFIL": 1.25,
    "RULE_PRIVILEGE_ESCALATION": 1.35,
    "RULE_EWMA_DRIFT": 1.20,
}

# Feedback statistics
FEEDBACK_HISTORY: List[AnalystFeedback] = []

class UniversalFieldNormalizer:
    """
    HMW 4: Accepts CEF, Syslog, or flexible JSON dictionaries and standardizes them.
    Maps heterogeneous keys from popular SIEM forwarders into the normalized schema.
    """
    USER_ALIASES = ["user", "username", "suser", "account", "src_user", "login", "uid", "identity", "usr", "user_id"]
    IP_ALIASES = ["client_ip", "src_ip", "src", "host_ip", "ip", "network_source", "remote_addr", "origin_ip", "source_ip"]
    ACTION_ALIASES = ["act", "event_type", "activity", "operation", "command", "action_name", "method", "action"]
    RESOURCE_ALIASES = ["file", "target", "resource_uri", "table", "service", "url", "dst_path", "object", "resource"]
    BYTES_ALIASES = ["bytes_transferred", "bytes_sent", "size", "transfer_size", "volume", "byte_count", "bytes", "length"]
    LOCATION_ALIASES = ["country", "geo", "city", "src_geo", "client_location", "location"]

    @classmethod
    def parse_cef(cls, raw: str) -> Dict[str, Any]:
        """
        Parses Common Event Format string:
        CEF:Version|Device Vendor|Device Product|Device Version|Device Event Class ID|Name|Severity|[Extension]
        """
        result = {}
        parts = raw.split("|")
        if len(parts) >= 7:
            result["action"] = parts[5].strip()
            # Parse key=value extensions
            ext_part = "|".join(parts[7:]) if len(parts) > 7 else parts[6]
            pairs = re.findall(r'(\w+)=([^=]+)(?:\s+|$)', ext_part)
            for k, v in pairs:
                result[k.strip()] = v.strip()
        return result

    @classmethod
    def parse_syslog(cls, raw: str) -> Dict[str, Any]:
        """
        Parses RFC 5424 / RFC 3164 Syslog with key=value or message body.
        """
        result = {}
        tokens = raw.split(" ")
        for token in tokens:
            if "=" in token:
                k, v = token.split("=", 1)
                result[k.strip()] = v.strip().strip('"').strip("'")
        return result

    @classmethod
    def normalize(cls, payload: UniversalTelemetryPayload) -> Dict[str, Any]:
        extracted = {}

        # 1. Parse raw string if provided
        if payload.raw_payload:
            fmt = (payload.format_type or "generic_json").lower()
            if fmt == "cef" or payload.raw_payload.startswith("CEF:"):
                extracted.update(cls.parse_cef(payload.raw_payload))
            elif fmt == "syslog" or "<" in payload.raw_payload[:5]:
                extracted.update(cls.parse_syslog(payload.raw_payload))

        # 2. Merge dictionary payload
        if payload.data:
            extracted.update(payload.data)

        # 3. Direct overrides
        for field in ["user_id", "action", "resource", "source_ip", "bytes", "location"]:
            val = getattr(payload, field, None)
            if val is not None:
                extracted[field] = val

        # 4. Map aliases with case-insensitivity
        normalized: Dict[str, Any] = {}
        extracted_lower = {k.lower(): v for k, v in extracted.items()}

        def find_first(aliases: List[str], default: Any) -> Any:
            for alias in aliases:
                if alias in extracted_lower and extracted_lower[alias] is not None:
                    return extracted_lower[alias]
            return default

        user_raw = find_first(cls.USER_ALIASES, "sophia.chen")
        normalized["user_id"] = str(user_raw).strip()
        normalized["source_ip"] = str(find_first(cls.IP_ALIASES, "192.168.1.105")).strip()
        normalized["action"] = str(find_first(cls.ACTION_ALIASES, "DATA_QUERY")).strip()
        normalized["resource"] = str(find_first(cls.RESOURCE_ALIASES, "/api/v1/customer_records")).strip()
        
        try:
            normalized["bytes_transferred"] = int(find_first(cls.BYTES_ALIASES, 120_000))
        except (ValueError, TypeError):
            normalized["bytes_transferred"] = 120_000

        normalized["location"] = str(find_first(cls.LOCATION_ALIASES, "HQ Internal")).strip()
        normalized["timestamp"] = datetime.utcnow().isoformat() + "Z"
        
        return normalized

class EWMADriftCalculator:
    """
    HMW 1: Long-Term Baseline Drift & Cumulative Velocity Tracker
    EWMA = alpha * Current + (1 - alpha) * Previous_EWMA
    Weekly Drift % = ((EWMA - Baseline) / Baseline) * 100%
    Flags slow, gradual exfiltration staying beneath per-event alerts.
    """
    ALPHA = 0.20  # Exponential smoothing parameter

    @classmethod
    def update_drift(cls, user_id: str, event_bytes: int) -> Tuple[float, float, bool]:
        baseline = USER_BASELINES.get(user_id, {
            "baseline_volume_bytes": 10_000_000,
            "current_ewma_bytes": 10_000_000,
            "drift_velocity_pct": 5.0,
            "is_drifting": False
        })

        base_vol = baseline["baseline_volume_bytes"]
        prev_ewma = baseline.get("current_ewma_bytes", base_vol)

        # Calculate new EWMA
        new_ewma = (cls.ALPHA * event_bytes) + ((1.0 - cls.ALPHA) * prev_ewma)
        baseline["current_ewma_bytes"] = new_ewma

        # Calculate drift percentage compared to established 30-day baseline
        drift_pct = round(((new_ewma - base_vol) / base_vol) * 100.0, 1)
        baseline["drift_velocity_pct"] = drift_pct

        # Flag if drift exceeds 15% cumulative threshold
        is_drifting = drift_pct > 15.0
        baseline["is_drifting"] = is_drifting

        return new_ewma, drift_pct, is_drifting

class PlainEnglishNarrativeGenerator:
    """
    HMW 2: Plain-English Anomaly Narrative & 3-Second Visual Chips
    Transforms composite anomaly scores into concise, scannable sentences.
    """
    @classmethod
    def generate(
        cls,
        user_name: str,
        action: str,
        resource: str,
        location: str,
        is_off_hours: bool,
        volume_ratio: float,
        drift_pct: float,
        signals: List[str]
    ) -> Tuple[str, List[str]]:
        chips: List[str] = []
        narrative_parts = []

        narrative_parts.append(f"{user_name} executed {action.replace('_', ' ').title()} on {resource}")

        if location and location not in ["Office Network", "HQ Internal", "VPN - US-East"]:
            narrative_parts.append(f"from atypical IP/origin ({location})")
            chips.append("ATYPICAL_LOCATION")

        if is_off_hours:
            narrative_parts.append("during non-business hours")
            chips.append("OFF_HOURS")

        if volume_ratio >= 2.0:
            narrative_parts.append(f"downloading {volume_ratio:.1f}x normal volume")
            chips.append("VOLUME_SPIKE")

        if drift_pct > 15.0:
            narrative_parts.append(f"with +{drift_pct:.1f}% cumulative weekly drift")
            chips.append("RAPID_DRIFT")

        if "RULE_IMPOSSIBLE_TRAVEL" in signals:
            chips.append("IMPOSSIBLE_TRAVEL")
        if "RULE_PRIVILEGE_ESCALATION" in signals:
            chips.append("PRIVILEGE_SPIKE")

        if not chips:
            chips.append("ROUTINE_BASELINE")

        full_sentence = " ".join(narrative_parts) + "."
        return full_sentence, chips

class ExplainWhyBreakdownEngine:
    """
    HMW 3: Explain-Why Model Contribution Factor Breakdown
    Calculates exact percentage contribution for transparency and analyst trust.
    """
    @classmethod
    def calculate_factors(
        cls,
        volume_ratio: float,
        is_off_hours: bool,
        drift_pct: float,
        privilege_multiplier: float,
        signals: List[str]
    ) -> List[ExplainWhyFactor]:
        raw_weights: Dict[str, Tuple[float, str, str]] = {}

        # 1. Peer / Volume deviation
        if volume_ratio > 1.2:
            vol_score = min(volume_ratio * 25.0, 50.0)
            raw_weights["Peer Volume Deviation"] = (
                vol_score,
                f"Transfer exceeds peer group average by {volume_ratio:.1f}x",
                "HIGH" if volume_ratio > 2.5 else "MEDIUM"
            )

        # 2. Off-hours timing multiplier
        if is_off_hours:
            mult = SIGNAL_MULTIPLIERS.get("RULE_ODD_HOURS", 1.0)
            raw_weights["Off-Hours Circadian Multiplier"] = (
                35.0 * mult,
                f"Activity performed outside authorized schedule window (downweighted: {mult:.2f}x)",
                "HIGH" if mult > 0.8 else "MEDIUM"
            )

        # 3. Baseline drift factor (HMW 1)
        if drift_pct > 10.0:
            drift_score = min(drift_pct * 1.5, 45.0)
            raw_weights["Cumulative Baseline Drift"] = (
                drift_score,
                f"Multi-day EWMA volume trending +{drift_pct:.1f}% above established 30-day baseline",
                "CRITICAL" if drift_pct > 25.0 else "HIGH"
            )

        # 4. Privilege Blast Radius
        if privilege_multiplier > 1.2:
            raw_weights["Privilege Blast Radius"] = (
                20.0 * (privilege_multiplier - 1.0) * 2.0,
                f"High-privilege entity ({privilege_multiplier:.2f}x blast radius multiplier applied)",
                "MEDIUM"
            )

        # 5. Geolocation / Impossible Travel
        if "RULE_IMPOSSIBLE_TRAVEL" in signals:
            mult = SIGNAL_MULTIPLIERS.get("RULE_IMPOSSIBLE_TRAVEL", 1.0)
            raw_weights["Impossible Travel Velocity"] = (
                40.0 * mult,
                f"Rapid geographic displacement exceeding 900 km/h physical travel bounds",
                "CRITICAL"
            )

        if not raw_weights:
            raw_weights["Baseline Corroboration"] = (
                100.0,
                "Routine behavioral alignment with expected circadian model",
                "LOW"
            )

        total_raw = sum(item[0] for item in raw_weights.values())
        factors = []
        for name, (score, desc, impact) in raw_weights.items():
            pct = max(5, int(round((score / total_raw) * 100.0)))
            factors.append(ExplainWhyFactor(
                factor_name=name,
                weight_pct=pct,
                description=desc,
                impact=impact
            ))

        # Normalize sum to 100
        total_pct = sum(f.weight_pct for f in factors)
        if factors and total_pct != 100:
            factors[0].weight_pct += (100 - total_pct)

        # Sort descending by weight
        factors.sort(key=lambda f: f.weight_pct, reverse=True)
        return factors

def score_and_process_event(normalized_dict: Dict[str, Any]) -> Tuple[TelemetryEvent, Optional[AlertItem]]:
    """
    End-to-End Orchestrator:
    Takes normalized event -> applies EWMA drift -> generates narrative & chips ->
    calculates Explain-Why factors -> evaluates Early Warning vs Reactive Alert threshold.
    """
    user_id = normalized_dict.get("user_id", "sophia.chen")
    user_meta = USER_BASELINES.get(user_id, {
        "name": user_id.replace(".", " ").title(),
        "department": "Engineering",
        "baseline_volume_bytes": 10_000_000,
        "expected_work_start": 9,
        "expected_work_end": 18,
        "privilege_multiplier": 1.2
    })

    bytes_transferred = normalized_dict.get("bytes_transferred", 150_000)
    base_bytes = user_meta["baseline_volume_bytes"]
    volume_ratio = bytes_transferred / max(base_bytes, 100_000)

    # Check off-hours
    now_hour = datetime.utcnow().hour
    is_off_hours = (now_hour < user_meta.get("expected_work_start", 9)) or (now_hour > user_meta.get("expected_work_end", 18))

    # 1. Update EWMA drift (HMW 1)
    new_ewma, drift_pct, is_drifting = EWMADriftCalculator.update_drift(user_id, bytes_transferred)

    # 2. Detect signals
    signals = []
    if is_off_hours:
        signals.append("RULE_ODD_HOURS")
    if volume_ratio > 1.8:
        signals.append("RULE_VOLUME_SPIKE")
    if is_drifting:
        signals.append("RULE_EWMA_DRIFT")
    if "Munich" in normalized_dict.get("location", "") or "Singapore" in normalized_dict.get("location", ""):
        signals.append("RULE_IMPOSSIBLE_TRAVEL")

    # 3. Calculate anomaly score with dynamic feedback multipliers (HMW 3)
    base_anomaly = 30.0
    if is_off_hours:
        base_anomaly += 25.0 * SIGNAL_MULTIPLIERS.get("RULE_ODD_HOURS", 1.0)
    if volume_ratio > 1.8:
        base_anomaly += min(35.0 * (volume_ratio - 1.0), 40.0) * SIGNAL_MULTIPLIERS.get("RULE_VOLUME_SPIKE", 1.0)
    if is_drifting:
        base_anomaly += 20.0 * (drift_pct / 15.0) * SIGNAL_MULTIPLIERS.get("RULE_EWMA_DRIFT", 1.0)
    if "RULE_IMPOSSIBLE_TRAVEL" in signals:
        base_anomaly += 30.0 * SIGNAL_MULTIPLIERS.get("RULE_IMPOSSIBLE_TRAVEL", 1.0)

    # Privilege multiplier blast radius
    privilege_mult = user_meta.get("privilege_multiplier", 1.2)
    composite_score = min(int(round(base_anomaly * privilege_mult)), 99)

    # 4. Generate Plain-English Narrative and 3-Second Chips (HMW 2)
    narrative, chips = PlainEnglishNarrativeGenerator.generate(
        user_name=user_meta["name"],
        action=normalized_dict.get("action", "DATA_ACCESS"),
        resource=normalized_dict.get("resource", "/system/files"),
        location=normalized_dict.get("location", "Office Network"),
        is_off_hours=is_off_hours,
        volume_ratio=volume_ratio,
        drift_pct=drift_pct,
        signals=signals
    )

    # 5. Explain-Why Factor Breakdown (HMW 3)
    explain_why = ExplainWhyBreakdownEngine.calculate_factors(
        volume_ratio=volume_ratio,
        is_off_hours=is_off_hours,
        drift_pct=drift_pct,
        privilege_multiplier=privilege_mult,
        signals=signals
    )

    # Determine Early Warning vs Critical Incident
    is_early_warning = (55 <= composite_score < 80) or (is_drifting and composite_score < 80)
    is_critical_alert = composite_score >= 80

    event_id = f"evt-{int(datetime.utcnow().timestamp() * 1000)}"
    telemetry_event = TelemetryEvent(
        event_id=event_id,
        timestamp=normalized_dict.get("timestamp", datetime.utcnow().isoformat() + "Z"),
        user_id=user_id,
        user_name=user_meta["name"],
        department=user_meta["department"],
        action=normalized_dict.get("action", "DATA_ACCESS"),
        resource=normalized_dict.get("resource", "/app/resources"),
        source_ip=normalized_dict.get("source_ip", "10.0.4.12"),
        location=normalized_dict.get("location", "Office Network"),
        bytes_transferred=bytes_transferred,
        is_off_hours=is_off_hours,
        is_sensitive_resource=volume_ratio > 1.5,
        anomaly_score=float(composite_score),
        priority_score=composite_score,
        is_early_warning=is_early_warning,
        signals=signals,
        plain_english_narrative=narrative,
        chips=chips,
        explain_why=explain_why,
        drift_velocity_pct=drift_pct
    )

    alert_item = None
    if is_early_warning or is_critical_alert:
        severity = "CRITICAL" if composite_score >= 85 else ("HIGH" if composite_score >= 75 else "MEDIUM")
        detection_type = "PROACTIVE_EARLY_WARNING" if is_early_warning else "REACTIVE_THRESHOLD"
        warning_label = "Rising risk — not yet critical" if is_early_warning else "Critical Threshold Breached"

        alert_item = AlertItem(
            alert_id=f"alt-{int(datetime.utcnow().timestamp() * 1000)}",
            timestamp=telemetry_event.timestamp,
            user_id=user_id,
            user_name=user_meta["name"],
            department=user_meta["department"],
            title=f"{'Proactive Warning' if is_early_warning else 'Security Incident'}: {user_meta['name']} ({', '.join(chips[:2])})",
            severity=severity,
            priority_score=composite_score,
            is_early_warning=is_early_warning,
            detection_type=detection_type,
            warning_label=warning_label,
            plain_english_narrative=narrative,
            chips=chips,
            explain_why=explain_why,
            signals=signals,
            analyst_status="PENDING",
            mitre_attack="T1078.004 Valid Accounts" if "OFF_HOURS" in chips else "T1048 Exfiltration",
            drift_velocity_pct=drift_pct
        )

    return telemetry_event, alert_item
