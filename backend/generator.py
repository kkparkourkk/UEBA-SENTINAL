"""
Synthetic Enterprise Telemetry Emitter for UEBA Sentinel
Generates realistic normal enterprise operations mixed with simulated
insider threats, low-and-slow exfiltration, and circadian deviations.
"""

import random
import asyncio
from datetime import datetime
from typing import Dict, Any, List

ENTERPRISE_USERS = [
    {
        "id": "sophia.chen",
        "name": "Sophia Chen",
        "dept": "Engineering",
        "normal_ips": ["10.0.12.44", "192.168.10.12"],
        "normal_actions": ["GIT_COMMIT", "PULL_REQUEST_MERGE", "K8S_DEPLOY", "GRAFANA_QUERY"],
        "normal_resources": ["repo://sentinel/core-service", "k8s://cluster-prod-01", "s3://eng-build-artifacts"]
    },
    {
        "id": "marcus.vance",
        "name": "Marcus Vance",
        "dept": "Finance",
        "normal_ips": ["10.0.8.21", "192.168.10.88"],
        "normal_actions": ["NETSUITE_INVOICE_GEN", "EXCEL_EXPORT", "STRIPE_RECONCILE", "AUDIT_LOG_VIEW"],
        "normal_resources": ["netsuite://ledger/q3-reports", "sharepoint://finance/payroll-2026.xlsx", "stripe://reporting/tx"]
    },
    {
        "id": "elena.rostova",
        "name": "Elena Rostova",
        "dept": "DevOps",
        "normal_ips": ["10.0.14.90", "172.16.4.55"],
        "normal_actions": ["TERRAFORM_APPLY", "VAULT_SECRET_READ", "SSH_SESSION_START", "DOCKER_BUILD"],
        "normal_resources": ["vault://secret/prod/db-credentials", "aws://iam/role-federation", "bastion://us-east-1.corp"]
    },
    {
        "id": "david.kim",
        "name": "David Kim",
        "dept": "Human Resources",
        "normal_ips": ["10.0.22.15"],
        "normal_actions": ["WORKDAY_EMPLOYEE_VIEW", "DOCUSIGN_SEND", "OFFER_LETTER_GEN"],
        "normal_resources": ["workday://employees/engineering", "docusign://templates/nda-v4"]
    }
]

ANOMALY_TEMPLATES = [
    {
        "type": "LOW_AND_SLOW_EXFIL",
        "user_id": "sophia.chen",
        "action": "CLOUD_STORAGE_BULK_SYNC",
        "resource": "s3://sentinel-customer-pii-vault/archive.tar.gz",
        "source_ip": "194.26.29.112",
        "location": "Atypical Origin (Munich, Germany)",
        "bytes_transferred": 38_500_000,
        "is_off_hours": True
    },
    {
        "type": "ATYPICAL_OFF_HOURS_ACCESS",
        "user_id": "marcus.vance",
        "action": "PAYROLL_DATABASE_BULK_DUMP",
        "resource": "db://payroll-rds.internal/employee_salaries",
        "source_ip": "185.220.101.5",
        "location": "Tor Exit Node (Amsterdam)",
        "bytes_transferred": 24_000_000,
        "is_off_hours": True
    },
    {
        "type": "PRIVILEGE_STAGING",
        "user_id": "elena.rostova",
        "action": "ROOT_TOKEN_CREATION",
        "resource": "vault://auth/token/create-orphan",
        "source_ip": "10.0.14.90",
        "location": "HQ Internal",
        "bytes_transferred": 450_000,
        "is_off_hours": False
    },
    {
        "type": "IMPOSSIBLE_TRAVEL_VELOCITY",
        "user_id": "sophia.chen",
        "action": "API_GATEWAY_TOKEN_USE",
        "resource": "api://gateway/prod/customer_records",
        "source_ip": "103.252.118.2",
        "location": "Singapore",
        "bytes_transferred": 16_000_000,
        "is_off_hours": True
    }
]

class SyntheticTelemetryEmitter:
    """
    Generates background telemetry with continuous 2-3 second cadence.
    Injects anomalous events with realistic probability (~15-20%).
    """
    @classmethod
    def generate_next_event(cls, force_anomaly_type: str = None) -> Dict[str, Any]:
        # If forced scenario requested (e.g. from UI interactive test button)
        if force_anomaly_type:
            matched = next((a for a in ANOMALY_TEMPLATES if a["type"] == force_anomaly_type), ANOMALY_TEMPLATES[0])
            event = dict(matched)
            event["timestamp"] = datetime.utcnow().isoformat() + "Z"
            return event

        # 18% chance of simulated anomaly, 82% normal routine event
        is_anomaly = random.random() < 0.18

        if is_anomaly:
            scenario = random.choice(ANOMALY_TEMPLATES)
            event = dict(scenario)
            event["timestamp"] = datetime.utcnow().isoformat() + "Z"
            # Randomize bytes slightly
            event["bytes_transferred"] = int(event["bytes_transferred"] * random.uniform(0.85, 1.25))
            return event
        else:
            user = random.choice(ENTERPRISE_USERS)
            action = random.choice(user["normal_actions"])
            resource = random.choice(user["normal_resources"])
            ip = random.choice(user["normal_ips"])
            bytes_sent = random.randint(15_000, 480_000)

            return {
                "user_id": user["id"],
                "action": action,
                "resource": resource,
                "source_ip": ip,
                "location": "HQ Internal",
                "bytes_transferred": bytes_sent,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "is_off_hours": False
            }
