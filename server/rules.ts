/**
 * Rule-Based Anomaly Detectors & Threat Corroboration Engine.
 * Combines statistical deviations with deterministic heuristic rules:
 * - Odd-hour logins vs role baseline
 * - Impossible travel (geographical distance / delta time velocity)
 * - Unusual data egress volume
 * - Unauthorized privilege escalation or sensitive resource probes
 */

export interface GeoLocation {
  city: string;
  country: string;
  lat: number;
  lon: number;
}

export interface RuleSignal {
  code: 'RULE_ODD_HOURS' | 'RULE_IMPOSSIBLE_TRAVEL' | 'RULE_UNUSUAL_VOLUME' | 'RULE_PRIVILEGE_PROBE' | 'RULE_AUTH_SPIKE' | 'RULE_IFOREST_ANOMALY';
  title: string;
  stage: 'Ingress & Authentication' | 'Reconnaissance & Privilege' | 'Action on Objectives & Exfiltration';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
  description: string;
  evidence: Record<string, any>;
  timestamp: string;
}

/**
 * Computes great-circle distance in kilometers using the Haversine formula
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Evaluates rules for an activity event against user/role baseline
 */
export function evaluateEventRules(
  event: {
    timestamp: string;
    hourOfDay: number;
    actionType: string;
    resource: string;
    ipAddress: string;
    location: GeoLocation;
    bytesTransferred: number;
    isSensitive: boolean;
  },
  previousEvent: {
    timestamp: string;
    location: GeoLocation;
    ipAddress: string;
  } | null,
  roleBaseline: {
    typicalStartHour: number;
    typicalEndHour: number;
    meanDailyBytesMB: number;
    stdDailyBytesMB: number;
    expectedThresholdMB: number;
  },
  userPrivileged: boolean,
  iForestNormalizedScore: number
): RuleSignal[] {
  const signals: RuleSignal[] = [];

  // 1. Odd-Hour Access Rule (deep late-night or abnormal high-impact off-hours)
  const hour = event.hourOfDay;
  const isWeekend = new Date(event.timestamp).getDay() % 6 === 0;
  const isLateNight = hour >= 23 || hour <= 5;
  const isBeyondWorkHours = hour < roleBaseline.typicalStartHour || hour >= roleBaseline.typicalEndHour;

  if (isLateNight || (isBeyondWorkHours && (event.isSensitive || event.bytesTransferred > 80 * 1024 * 1024))) {
    signals.push({
      code: 'RULE_ODD_HOURS',
      title: isLateNight ? 'Late-Night Abnormal Access' : 'Off-Hours Account Activity',
      stage: 'Ingress & Authentication',
      severity: isLateNight ? 'HIGH' : 'MEDIUM',
      weight: isLateNight ? 22 : 14,
      description: `Activity initiated at ${String(hour).padStart(2, '0')}:00 outside role baseline standard (${roleBaseline.typicalStartHour}:00 - ${roleBaseline.typicalEndHour}:00).`,
      evidence: {
        hour,
        baselineRange: `${roleBaseline.typicalStartHour}:00 - ${roleBaseline.typicalEndHour}:00`,
        isWeekend,
      },
      timestamp: event.timestamp,
    });
  }

  // 2. Impossible Travel Rule
  if (previousEvent && previousEvent.location && event.location) {
    const timeDeltaMs = Math.abs(new Date(event.timestamp).getTime() - new Date(previousEvent.timestamp).getTime());
    const timeDeltaHours = timeDeltaMs / (1000 * 60 * 60);

    if (timeDeltaHours > 0 && timeDeltaHours < 8) {
      const distanceKm = haversineDistance(
        previousEvent.location.lat,
        previousEvent.location.lon,
        event.location.lat,
        event.location.lon
      );

      if (distanceKm > 400) {
        const speedKmH = distanceKm / timeDeltaHours;
        // Commercial airliners cruise at ~850-900 km/h. Anything faster than 800 km/h in under 6 hours is flagged
        if (speedKmH > 750) {
          signals.push({
            code: 'RULE_IMPOSSIBLE_TRAVEL',
            title: 'Impossible Travel Velocity Detected',
            stage: 'Ingress & Authentication',
            severity: 'CRITICAL',
            weight: 35,
            description: `Physical distance of ${Math.round(distanceKm)} km traversed between ${previousEvent.location.city} and ${event.location.city} in ${(timeDeltaHours * 60).toFixed(0)} mins (${Math.round(speedKmH)} km/h). Exceeds commercial flight velocity limit.`,
            evidence: {
              originCity: previousEvent.location.city,
              destCity: event.location.city,
              distanceKm: Math.round(distanceKm),
              timeDeltaMinutes: Math.round(timeDeltaHours * 60),
              speedKmH: Math.round(speedKmH),
            },
            timestamp: event.timestamp,
          });
        }
      }
    }
  }

  // 3. Unusual Data Egress Volume Rule
  const eventBytesMB = event.bytesTransferred / (1024 * 1024);
  const baselineThreshold = roleBaseline.expectedThresholdMB;
  const ratioAboveBaseline = baselineThreshold > 0 ? eventBytesMB / baselineThreshold : 1;

  if (eventBytesMB > baselineThreshold * 1.5 && eventBytesMB > 250) {
    const isMassive = eventBytesMB > 2000;
    signals.push({
      code: 'RULE_UNUSUAL_VOLUME',
      title: 'Abnormal Outbound Data Egress',
      stage: 'Action on Objectives & Exfiltration',
      severity: isMassive ? 'CRITICAL' : 'HIGH',
      weight: isMassive ? 30 : 20,
      description: `Egress of ${eventBytesMB.toFixed(1)} MB exceeds per-role baseline threshold of ${baselineThreshold.toFixed(1)} MB (${ratioAboveBaseline.toFixed(1)}x expected peer volume).`,
      evidence: {
        egressMB: Math.round(eventBytesMB * 10) / 10,
        peerRoleThresholdMB: baselineThreshold,
        deviationRatio: Math.round(ratioAboveBaseline * 10) / 10,
      },
      timestamp: event.timestamp,
    });
  }

  // 4. Privilege Probe / Sensitive Resource Access Rule
  if (event.isSensitive || event.actionType === 'SUDO_COMMAND' || event.actionType === 'API_BULK_EXPORT') {
    const isUnauthorized = !userPrivileged;
    signals.push({
      code: 'RULE_PRIVILEGE_PROBE',
      title: isUnauthorized ? 'Unauthorized Sensitive Asset Probe' : 'High-Privilege Security Action',
      stage: 'Reconnaissance & Privilege',
      severity: isUnauthorized ? 'HIGH' : 'MEDIUM',
      weight: isUnauthorized ? 25 : 12,
      description: `Accessed high-impact asset "${event.resource}" via action ${event.actionType}.${isUnauthorized ? ' User lacks administrative credential role.' : ''}`,
      evidence: {
        resource: event.resource,
        actionType: event.actionType,
        userPrivileged,
      },
      timestamp: event.timestamp,
    });
  }

  // 5. Machine Learning iForest Anomaly Signal
  if (iForestNormalizedScore >= 65) {
    signals.push({
      code: 'RULE_IFOREST_ANOMALY',
      title: 'Multivariate Isolation Forest Anomaly',
      stage: 'Reconnaissance & Privilege',
      severity: iForestNormalizedScore >= 80 ? 'HIGH' : 'MEDIUM',
      weight: Math.round((iForestNormalizedScore / 100) * 25),
      description: `Isolation Forest tree ensemble flagged multi-feature outlier vector (Normalized score: ${iForestNormalizedScore}/100) combining time, location variance, and transfer scale.`,
      evidence: {
        iForestScore: iForestNormalizedScore,
      },
      timestamp: event.timestamp,
    });
  }

  return signals;
}

/**
 * Synthesizes co-occurring signals into a corroborated incident narrative
 */
export function corroborateSignals(signals: RuleSignal[]): {
  isCorroborated: boolean;
  corroborationSummary: string;
  attackStagesPresent: string[];
} {
  const uniqueStages = Array.from(new Set(signals.map((s) => s.stage)));
  const isMultiStage = uniqueStages.length >= 2;
  const isCorroborated = signals.length >= 2;

  let summary = '';
  if (isMultiStage) {
    summary = `Multi-stage threat chain corroborated across ${uniqueStages.length} phases (${uniqueStages.join(' → ')}). Co-occurrence of independent signals increases threat confidence.`;
  } else if (isCorroborated) {
    summary = `Multiple corroborating signals observed in same session (${signals.map((s) => s.title).join(' + ')}).`;
  } else if (signals.length === 1) {
    summary = `Single isolated behavioral signal: ${signals[0].title}. Requires contextual verification.`;
  } else {
    summary = `Standard baseline telemetry with no anomalous corroboration.`;
  }

  return {
    isCorroborated,
    corroborationSummary: summary,
    attackStagesPresent: uniqueStages,
  };
}
