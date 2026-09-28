/**
 * Priority Scoring & Alert Aggregation Engine (Goal 3).
 * Weighs:
 * 1. Anomaly severity (Isolation Forest + rule severity)
 * 2. Account sensitivity (Privileged sysadmin/finance vs standard employee)
 * 3. Number of co-occurring signals (Threat corroboration multiplier)
 * 4. Deviation from per-role expected activity threshold
 *
 * Also groups related events from the same user and session into unified incidents.
 */

import { RuleSignal } from './rules.js';

export interface AlertIncident {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  isPrivileged: boolean;
  sessionId: string;
  title: string;
  summary: string;
  primaryEventId: number;
  timestamp: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  rawAnomalyScore: number;
  priorityScore: number;
  accountSensitivityWeight: number;
  cooccurringSignalsCount: number;
  roleDeviationRatio: number;
  cooccurringSignals: RuleSignal[];
  groupedEventIds: number[];
  analystStatus: 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'MARK_FOR_REVIEW';
  analystNotes?: string;
  analystDecisionTime?: string;
}

/**
 * Calculates priority score (0-100) using multi-factor threat weighting
 */
export function calculatePriorityScore(params: {
  rawAnomalyScore: number; // 0 - 100
  isPrivileged: boolean;
  signals: RuleSignal[];
  roleBaselineRatio: number; // e.g. 1.0 (normal) to 5.0+ (huge deviation)
}): {
  priorityScore: number;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  accountSensitivityWeight: number;
  cooccurringSignalsCount: number;
  roleDeviationRatio: number;
} {
  const { rawAnomalyScore, isPrivileged, signals, roleBaselineRatio } = params;

  // 1. Account sensitivity weight (Privileged accounts carry higher blast radius)
  const accountSensitivityWeight = isPrivileged ? 1.35 : 1.0;

  // 2. Co-occurring signals bonus (co-occurrence increases confidence exponentially)
  const cooccurringSignalsCount = signals.length;
  let cooccurrenceBonus = 0;
  if (cooccurringSignalsCount >= 4) {
    cooccurrenceBonus = 26;
  } else if (cooccurringSignalsCount === 3) {
    cooccurrenceBonus = 18;
  } else if (cooccurringSignalsCount === 2) {
    cooccurrenceBonus = 10;
  } else if (cooccurringSignalsCount === 1) {
    cooccurrenceBonus = 0;
  }

  // 3. Per-role deviation component
  // Instead of a global cutoff, deviation from that role's specific expected threshold
  const roleDeviationContribution = Math.min(22, Math.max(0, (roleBaselineRatio - 1.0) * 6.5));

  // 4. Maximum signal severity booster
  let ruleMaxWeight = 0;
  signals.forEach((s) => {
    if (s.weight > ruleMaxWeight) ruleMaxWeight = s.weight;
  });

  // Base blend: 50% AI Anomaly + 50% Highest Rule Weight
  const baseBlendedSeverity = rawAnomalyScore * 0.5 + ruleMaxWeight * 2.0 * 0.5;

  // Raw priority computation with account multiplier and corroboration
  let computed = (baseBlendedSeverity * 0.65 + roleDeviationContribution) * (isPrivileged ? 1.25 : 1.0) + cooccurrenceBonus;

  // Ensure bounded 0-100
  const priorityScore = Math.min(100, Math.max(10, Math.round(computed)));

  let severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
  if (priorityScore >= 82) {
    severity = 'CRITICAL';
  } else if (priorityScore >= 66) {
    severity = 'HIGH';
  } else if (priorityScore >= 45) {
    severity = 'MEDIUM';
  } else {
    severity = 'LOW';
  }

  return {
    priorityScore,
    severity,
    accountSensitivityWeight,
    cooccurringSignalsCount,
    roleDeviationRatio: Math.round(roleBaselineRatio * 10) / 10,
  };
}

/**
 * Group raw events into unified incidents by user & session
 */
export function groupEventsIntoAlerts(
  eventsWithScores: Array<{
    eventId: number;
    userId: string;
    userName: string;
    userRole: string;
    department: string;
    isPrivileged: boolean;
    sessionId: string;
    timestamp: string;
    actionType: string;
    resource: string;
    rawAnomalyScore: number;
    signals: RuleSignal[];
    roleBaselineRatio: number;
  }>
): AlertIncident[] {
  // Group by userId + sessionId or 6-hour time window
  const groupMap = new Map<string, typeof eventsWithScores>();

  for (const item of eventsWithScores) {
    // Only consider events with at least one signal or anomaly score >= 55
    if (item.signals.length === 0 && item.rawAnomalyScore < 55) continue;

    const groupKey = `${item.userId}__${item.sessionId}`;
    if (!groupMap.has(groupKey)) {
      groupMap.set(groupKey, []);
    }
    groupMap.get(groupKey)!.push(item);
  }

  const incidents: AlertIncident[] = [];
  let counter = 1;

  for (const [key, group] of groupMap.entries()) {
    // Sort chronological
    group.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    const first = group[0];
    const maxScoreItem = group.reduce((prev, curr) => (curr.rawAnomalyScore > prev.rawAnomalyScore ? curr : prev), first);

    // Combine signals across events in session
    const signalMap = new Map<string, RuleSignal>();
    for (const item of group) {
      for (const sig of item.signals) {
        signalMap.set(sig.code, sig);
      }
    }
    const combinedSignals = Array.from(signalMap.values());

    // Noise suppression: Only produce an incident if multi-signal corroborated,
    // or if a high/critical signal or extreme score (>= 72) is present
    const hasCriticalRule = combinedSignals.some((s) => s.severity === 'CRITICAL');
    const hasHighRule = combinedSignals.some((s) => s.severity === 'HIGH');
    const isCorroborated = combinedSignals.length >= 2;
    const isExtremeScore = maxScoreItem.rawAnomalyScore >= 72;

    if (!isCorroborated && !hasCriticalRule && !hasHighRule && !isExtremeScore) {
      continue;
    }

    const maxBaselineRatio = Math.max(...group.map((g) => g.roleBaselineRatio));

    const { priorityScore, severity, accountSensitivityWeight, cooccurringSignalsCount, roleDeviationRatio } =
      calculatePriorityScore({
        rawAnomalyScore: maxScoreItem.rawAnomalyScore,
        isPrivileged: first.isPrivileged,
        signals: combinedSignals,
        roleBaselineRatio: maxBaselineRatio,
      });

    // Determine an intuitive title based on prominent corroboration
    let title = 'Behavioral Anomaly Cluster';
    if (combinedSignals.some((s) => s.code === 'RULE_IMPOSSIBLE_TRAVEL')) {
      title = 'Suspicious Login & Impossible Travel Velocity';
    } else if (combinedSignals.some((s) => s.code === 'RULE_UNUSUAL_VOLUME') && combinedSignals.some((s) => s.code === 'RULE_ODD_HOURS')) {
      title = 'Off-Hours Massive Data Exfiltration Attempt';
    } else if (combinedSignals.some((s) => s.code === 'RULE_PRIVILEGE_PROBE')) {
      title = 'Unauthorized Privilege Escalation & Resource Probe';
    } else if (combinedSignals.some((s) => s.code === 'RULE_UNUSUAL_VOLUME')) {
      title = 'Excessive Egress Volume Threshold Breach';
    } else if (combinedSignals.some((s) => s.code === 'RULE_ODD_HOURS')) {
      title = 'Off-Hours Authentication & Baseline Divergence';
    }

    const summary = `${group.length} anomalous event(s) clustered in session ${first.sessionId.slice(-6)}. Corroborated ${combinedSignals.length} independent behavioral signals.`;

    incidents.push({
      id: `ALT-${String(counter++).padStart(4, '0')}`,
      userId: first.userId,
      userName: first.userName,
      userRole: first.userRole,
      department: first.department,
      isPrivileged: first.isPrivileged,
      sessionId: first.sessionId,
      title,
      summary,
      primaryEventId: maxScoreItem.eventId,
      timestamp: maxScoreItem.timestamp,
      severity,
      rawAnomalyScore: maxScoreItem.rawAnomalyScore,
      priorityScore,
      accountSensitivityWeight,
      cooccurringSignalsCount,
      roleDeviationRatio,
      cooccurringSignals: combinedSignals,
      groupedEventIds: group.map((g) => g.eventId),
      analystStatus: 'PENDING',
    });
  }

  // Goal 3: Default-sort by priority score descending!
  incidents.sort((a, b) => b.priorityScore - a.priorityScore);

  return incidents;
}
