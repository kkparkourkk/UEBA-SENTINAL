/**
 * Express REST API Routes for UEBA Sentinel
 */

import { Router, Request, Response } from 'express';
import { getDb } from './db.js';
import { seedSyntheticDataset, USERS, ROLE_BASELINES_DEF } from './syntheticGenerator.js';
import { generateDocumentationPdf } from './pdfGenerator.js';
import {
  getRecentLiveEvents,
  scoreAndProcessLiveEvent,
  triggerScenario,
  calculateFalsePositiveMetrics,
  calculatePostureMetrics,
} from './realtimeEngine.js';
import { ensureHmwQuestionsSeeded } from './hmwData.js';

export const apiRouter = Router();

// 1. Health check & stats
apiRouter.get('/health', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
    const eventCountRow = db.prepare('SELECT COUNT(*) as count FROM activity_logs').get() as { count: number };
    const alertCountRow = db.prepare('SELECT COUNT(*) as count FROM alerts').get() as { count: number };
    const feedbackCountRow = db.prepare('SELECT COUNT(*) as count FROM analyst_feedback').get() as { count: number };

    res.json({
      status: 'operational',
      engine: 'Isolation Forest (Multivariate) + Heuristic Rule Engine',
      storage: 'SQLite Native Sync',
      timestamp: new Date().toISOString(),
      counts: {
        users: userCountRow.count,
        events: eventCountRow.count,
        alerts: alertCountRow.count,
        analystFeedbackRecords: feedbackCountRow.count,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Reset / Seed Dataset
apiRouter.post('/dataset/reset-seed', (req: Request, res: Response) => {
  try {
    const stats = seedSyntheticDataset();
    res.json({
      success: true,
      message: 'Successfully generated 30-day synthetic dataset and calibrated Isolation Forest models.',
      stats,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. User directory with risk scores & peer comparison
apiRouter.get('/users', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const users = db.prepare(`
      SELECT u.*, 
        (SELECT COUNT(*) FROM alerts a WHERE a.user_id = u.id AND a.analyst_status = 'PENDING') as pending_alerts,
        (SELECT COUNT(*) FROM alerts a WHERE a.user_id = u.id) as total_alerts
      FROM users u
      ORDER BY u.risk_score DESC
    `).all();

    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. GOAL 1 — UNIFIED VIEW (Risk score + 30-day Behavior Trend + Time-Correlated Activity Feed)
apiRouter.get('/users/:userId/unified', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { userId } = req.params;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Role baseline
    const baseline = db.prepare('SELECT * FROM role_baselines WHERE department = ? AND role = ?').get(user.department, user.role) as any;

    // Calculate department peer baseline risk score
    const deptUsers = db.prepare(`SELECT risk_score FROM users WHERE department = ? ORDER BY risk_score ASC`).all(user.department) as any[];
    const medianIndex = Math.max(0, Math.floor(deptUsers.length * 0.35));
    const deptPeerBaseline = deptUsers[medianIndex]?.risk_score || 18.0;
    const peerRatio = deptPeerBaseline > 0 ? Math.round((user.risk_score / deptPeerBaseline) * 10) / 10 : 1.0;

    // 30-day behavior trend points
    // Group activity by date_str
    const dailyStats = db.prepare(`
      SELECT 
        l.date_str,
        COUNT(l.id) as event_count,
        SUM(l.bytes_transferred) as total_bytes,
        MAX(s.normalized_anomaly_score) as max_anomaly_score,
        AVG(s.normalized_anomaly_score) as avg_anomaly_score,
        SUM(CASE WHEN s.is_ai_flagged = 1 THEN 1 ELSE 0 END) as flagged_count
      FROM activity_logs l
      LEFT JOIN anomaly_scores s ON l.id = s.event_id
      WHERE l.user_id = ?
      GROUP BY l.date_str
      ORDER BY l.date_str ASC
    `).all(userId) as any[];

    // Calculate daily calibrated risk score for the trend chart
    const trendData = dailyStats.map((d) => {
      const maxScore = d.max_anomaly_score || 10;
      const avgScore = d.avg_anomaly_score || 10;
      const flagged = d.flagged_count || 0;
      // Day risk is weighted by peak anomaly and presence of flagged items
      const dayRisk = Math.min(100, Math.round(maxScore * 0.7 + avgScore * 0.3 + Math.min(20, flagged * 5)));
      return {
        date: d.date_str,
        riskScore: dayRisk,
        eventCount: d.event_count,
        totalBytesMB: Math.round(((d.total_bytes || 0) / (1024 * 1024)) * 10) / 10,
        hasFlaggedEvents: flagged > 0,
        flaggedCount: flagged,
      };
    });

    // Time-correlated raw account activity feed
    // Joined with anomaly score and flags
    const activityFeed = db.prepare(`
      SELECT 
        l.id,
        l.session_id,
        l.timestamp,
        l.date_str,
        l.hour_of_day,
        l.action_type,
        l.resource,
        l.ip_address,
        l.location_city,
        l.location_country,
        l.latitude,
        l.longitude,
        l.bytes_transferred,
        l.is_sensitive_resource,
        l.is_odd_hour,
        s.isolation_forest_score,
        s.normalized_anomaly_score,
        s.is_ai_flagged,
        (SELECT a.id FROM alerts a, json_each(a.grouped_event_ids_json) j WHERE j.value = l.id LIMIT 1) as linked_alert_id,
        (SELECT a.priority_score FROM alerts a, json_each(a.grouped_event_ids_json) j WHERE j.value = l.id LIMIT 1) as linked_priority_score
      FROM activity_logs l
      LEFT JOIN anomaly_scores s ON l.id = s.event_id
      WHERE l.user_id = ?
      ORDER BY l.timestamp DESC
      LIMIT 250
    `).all(userId) as any[];

    // User's alerts list
    const userAlerts = db.prepare(`
      SELECT * FROM alerts WHERE user_id = ? ORDER BY priority_score DESC
    `).all(userId) as any[];

    const parsedAlerts = userAlerts.map((a) => ({
      ...a,
      cooccurringSignals: JSON.parse(a.cooccurring_signals_json || '[]'),
      groupedEventIds: JSON.parse(a.grouped_event_ids_json || '[]'),
    }));

    res.json({
      user: {
        ...user,
        is_privileged: Boolean(user.is_privileged),
      },
      peerComparison: {
        department: user.department,
        userScore: user.risk_score,
        departmentAverage: deptPeerBaseline,
        peerRatio,
        indicatorText:
          peerRatio >= 2.0
            ? `This user's risk score is ${peerRatio}x the average for their department (${user.department})`
            : peerRatio >= 1.2
            ? `This user's risk score is slightly elevated (+${Math.round((peerRatio - 1) * 100)}% vs ${user.department} peer baseline)`
            : `User risk score is within expected peer baseline for ${user.department}`,
        isElevated: peerRatio >= 1.5,
      },
      roleBaseline: baseline,
      trendData,
      activityFeed,
      alerts: parsedAlerts,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. GOAL 3 — SMARTER, MORE AUTOMATIC PRIORITIZATION (Alert Queue)
apiRouter.get('/alerts', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { department, status, minPriority, search } = req.query;

    let query = `
      SELECT 
        a.*,
        u.name as user_name,
        u.role as user_role,
        u.department as department,
        u.is_privileged as is_privileged,
        u.avatar_color as avatar_color
      FROM alerts a
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (department && department !== 'ALL') {
      query += ` AND u.department = ?`;
      params.push(department);
    }

    if (status && status !== 'ALL') {
      query += ` AND a.analyst_status = ?`;
      params.push(status);
    }

    if (minPriority) {
      query += ` AND a.priority_score >= ?`;
      params.push(Number(minPriority));
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR a.title LIKE ? OR a.summary LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Goal 3 mandate: Default-sort by priority score descending!
    query += ` ORDER BY a.priority_score DESC, a.timestamp DESC`;

    const rawAlerts = db.prepare(query).all(...params) as any[];

    const alerts = rawAlerts.map((a) => ({
      id: a.id,
      userId: a.user_id,
      userName: a.user_name,
      userRole: a.user_role,
      department: a.department,
      isPrivileged: Boolean(a.is_privileged),
      avatarColor: a.avatar_color,
      sessionId: a.session_id,
      title: a.title,
      summary: a.summary,
      primaryEventId: a.primary_event_id,
      timestamp: a.timestamp,
      severity: a.severity,
      rawAnomalyScore: a.raw_anomaly_score,
      priorityScore: a.priority_score,
      accountSensitivityWeight: a.account_sensitivity_weight,
      cooccurringSignalsCount: a.cooccurring_signals_count,
      roleDeviationRatio: a.role_deviation_ratio,
      cooccurringSignals: JSON.parse(a.cooccurring_signals_json || '[]'),
      groupedEventIds: JSON.parse(a.grouped_event_ids_json || '[]'),
      analystStatus: a.analyst_status,
      analystNotes: a.analyst_notes,
      analystDecisionTime: a.analyst_decision_time,
      isEarlyWarning: Boolean(a.is_early_warning),
      detectionType: a.detection_type || (a.is_early_warning ? 'PROACTIVE_EARLY_WARNING' : 'REACTIVE_THRESHOLD'),
      warningLabel: a.warning_label || (a.is_early_warning ? 'Rising risk — not yet critical' : undefined),
    }));

    // Overview queue statistics
    const statsRow = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN severity = 'CRITICAL' THEN 1 ELSE 0 END) as critical_count,
        SUM(CASE WHEN severity = 'HIGH' THEN 1 ELSE 0 END) as high_count,
        SUM(CASE WHEN analyst_status = 'PENDING' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN analyst_status = 'CONFIRMED' THEN 1 ELSE 0 END) as confirmed_count,
        SUM(CASE WHEN analyst_status = 'DISMISSED' THEN 1 ELSE 0 END) as dismissed_count,
        AVG(priority_score) as avg_priority
      FROM alerts
    `).get() as any;

    res.json({
      alerts,
      metrics: {
        total: statsRow.total || 0,
        criticalCount: statsRow.critical_count || 0,
        highCount: statsRow.high_count || 0,
        pendingCount: statsRow.pending_count || 0,
        confirmedCount: statsRow.confirmed_count || 0,
        dismissedCount: statsRow.dismissed_count || 0,
        avgPriorityScore: Math.round((statsRow.avg_priority || 0) * 10) / 10,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GOAL 2 — AI DETECTION WITH HUMAN OVERSIGHT (Corroboration & Explanation Panel)
apiRouter.get('/alerts/:alertId/corroboration', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { alertId } = req.params;

    const alert = db.prepare(`
      SELECT a.*, u.name as user_name, u.role as user_role, u.department as department, u.is_privileged as is_privileged
      FROM alerts a
      JOIN users u ON a.user_id = u.id
      WHERE a.id = ?
    `).get(alertId) as any;

    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }

    const cooccurringSignals = JSON.parse(alert.cooccurring_signals_json || '[]');
    const groupedEventIds = JSON.parse(alert.grouped_event_ids_json || '[]');

    // Retrieve grouped raw events for this incident
    let eventsQuery = `
      SELECT l.*, s.normalized_anomaly_score, s.isolation_forest_score, s.feature_vector_json
      FROM activity_logs l
      LEFT JOIN anomaly_scores s ON l.id = s.event_id
      WHERE l.id IN (${groupedEventIds.map(() => '?').join(',')})
      ORDER BY l.timestamp ASC
    `;
    const groupedEvents = groupedEventIds.length > 0 ? db.prepare(eventsQuery).all(...groupedEventIds) : [];

    // Role baseline comparison
    const roleBaseline = db.prepare('SELECT * FROM role_baselines WHERE department = ? AND role = ?').get(alert.department, alert.user_role) as any;

    // Previous feedback history on this alert if any
    const feedbackRecords = db.prepare(`
      SELECT * FROM analyst_feedback WHERE alert_id = ? ORDER BY feedback_timestamp DESC
    `).all(alertId) as any[];

    // Why was this flagged breakdown (threat corroboration view)
    const attackStages = [
      {
        stage: 'Ingress & Authentication',
        signals: cooccurringSignals.filter((s: any) => s.stage === 'Ingress & Authentication'),
      },
      {
        stage: 'Reconnaissance & Privilege',
        signals: cooccurringSignals.filter((s: any) => s.stage === 'Reconnaissance & Privilege'),
      },
      {
        stage: 'Action on Objectives & Exfiltration',
        signals: cooccurringSignals.filter((s: any) => s.stage === 'Action on Objectives & Exfiltration'),
      },
    ].filter((stageGroup) => stageGroup.signals.length > 0);

    res.json({
      alert: {
        ...alert,
        is_privileged: Boolean(alert.is_privileged),
        cooccurringSignals,
        groupedEventIds,
      },
      groupedEvents,
      roleBaseline,
      attackStages,
      feedbackRecords,
      explanation: {
        rawScore: alert.raw_anomaly_score,
        priorityScore: alert.priority_score,
        accountSensitivityMultiplier: alert.account_sensitivity_weight,
        cooccurringCount: alert.cooccurring_signals_count,
        roleDeviationRatio: alert.role_deviation_ratio,
        formulaNarrative: `Priority (${alert.priority_score}/100) = [Base AI Anomaly (${alert.raw_anomaly_score}) × Account Sensitivity (${alert.account_sensitivity_weight}x)] + Co-occurrence Multiplier (${alert.cooccurring_signals_count} signals = +${Math.min(26, alert.cooccurring_signals_count * 8)} pts) + Role Baseline Deviation (${alert.role_deviation_ratio}x expected volume).`,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Shared by /alerts/:id/feedback and /v1/incidents/:id/feedback.
// One-click triage names (used by the Alerts Queue / Anomalies views and the
// legacy dashboard) are mapped onto the canonical decisions the DB, metrics and
// the false-positive down-weighting engine understand.
const ACTION_TO_DECISION: Record<string, string> = {
  VERIFY_THREAT: 'CONFIRMED',
  STEP_UP_MFA: 'ESCALATED',
  FLAG_FALSE_POSITIVE: 'DISMISSED',
};
const VALID_DECISIONS = ['CONFIRMED', 'DISMISSED', 'MARK_FOR_REVIEW', 'ESCALATED'];

class FeedbackError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function recordAnalystFeedback(
  rawAlertId: string,
  rawDecision: string,
  justification: string | undefined,
  analystName: string
) {
  const db = getDb();
  const decision = ACTION_TO_DECISION[rawDecision] || rawDecision;
  if (!VALID_DECISIONS.includes(decision)) {
    throw new FeedbackError(
      400,
      'Decision must be CONFIRMED, DISMISSED, MARK_FOR_REVIEW, ESCALATED, VERIFY_THREAT, STEP_UP_MFA, or FLAG_FALSE_POSITIVE'
    );
  }

  // Alert ids look like "ALT-0190"; tolerate different casing (e.g. "alt-0190")
  const alert = (db.prepare('SELECT * FROM alerts WHERE id = ?').get(rawAlertId) ||
    db.prepare('SELECT * FROM alerts WHERE id = ?').get(String(rawAlertId).toUpperCase())) as any;
  if (!alert) {
    throw new FeedbackError(404, 'Alert not found');
  }

  const nowIso = new Date().toISOString();

  // 1. Explicitly update the alert status — never auto-closed by AI
  db.prepare(`
    UPDATE alerts
    SET analyst_status = ?, analyst_notes = ?, analyst_decision_time = ?
    WHERE id = ?
  `).run(decision, justification || '', nowIso, alert.id);

  // 2. Append to analyst feedback audit table for AI retraining loop
  db.prepare(`
    INSERT INTO analyst_feedback (
      alert_id, user_id, analyst_name, decision, justification,
      original_ai_score, priority_score, cooccurring_count,
      feedback_timestamp, signals_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    alert.id,
    alert.user_id,
    analystName,
    decision,
    justification || 'No notes provided',
    alert.raw_anomaly_score,
    alert.priority_score,
    alert.cooccurring_signals_count,
    nowIso,
    alert.cooccurring_signals_json
  );

  return { alertId: alert.id as string, decision, nowIso };
}

// 7. GOAL 2 — ANALYST ACTION & FEEDBACK DATASET (Human Oversight)
apiRouter.post('/alerts/:alertId/feedback', (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { decision, justification } = req.body;
    // Client sends snake_case (analyst_name); accept camelCase too.
    const analystName =
      req.body.analyst_name || req.body.analystName || 'SOC Analyst (Human-in-the-Loop)';

    const result = recordAnalystFeedback(alertId, decision, justification, analystName);

    res.json({
      success: true,
      alertId: result.alertId,
      updatedStatus: result.decision,
      analystDecisionTime: result.nowIso,
      message: `Analyst decision "${result.decision}" recorded in feedback dataset. Human oversight requirement satisfied.`,
    });
  } catch (err: any) {
    res.status(err instanceof FeedbackError ? err.status : 500).json({ error: err.message });
  }
});

// 8. Analyst feedback audit log & model feedback telemetry
apiRouter.get('/feedback', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const feedbackList = db.prepare(`
      SELECT f.*, u.name as user_name, u.department as department
      FROM analyst_feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.feedback_timestamp DESC
    `).all();

    const confirmedCount = feedbackList.filter((f: any) => f.decision === 'CONFIRMED').length;
    const dismissedCount = feedbackList.filter((f: any) => f.decision === 'DISMISSED').length;
    const reviewCount = feedbackList.filter((f: any) => f.decision === 'MARK_FOR_REVIEW').length;
    const totalDecisions = feedbackList.length;

    res.json({
      feedbackDataset: feedbackList,
      metrics: {
        totalDecisions,
        confirmedCount,
        dismissedCount,
        reviewCount,
        truePositiveRate: totalDecisions > 0 ? Math.round((confirmedCount / (confirmedCount + dismissedCount || 1)) * 100) : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.get('/analyst/feedback-dataset', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const feedbackList = db.prepare(`
      SELECT f.*, u.name as user_name, u.department as department
      FROM analyst_feedback f
      JOIN users u ON f.user_id = u.id
      ORDER BY f.feedback_timestamp DESC
    `).all();

    const confirmedCount = feedbackList.filter((f: any) => f.decision === 'CONFIRMED').length;
    const dismissedCount = feedbackList.filter((f: any) => f.decision === 'DISMISSED').length;
    const reviewCount = feedbackList.filter((f: any) => f.decision === 'MARK_FOR_REVIEW').length;
    const totalDecisions = feedbackList.length;

    res.json({
      feedbackDataset: feedbackList,
      metrics: {
        totalDecisions,
        confirmedCount,
        dismissedCount,
        reviewCount,
        truePositiveRate: totalDecisions > 0 ? Math.round((confirmedCount / (confirmedCount + dismissedCount || 1)) * 100) : 0,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 9. Role baselines list
apiRouter.get('/baselines', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const baselines = db.prepare('SELECT * FROM role_baselines ORDER BY department, role').all();
    res.json({ baselines });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. SYSTEM AUTH USERS (Security Director & Assistant Security)
const SYSTEM_AUTH_USERS = [
  {
    id: 'sec-dir-01',
    username: 'director',
    name: 'Eleanor Vance',
    role: 'security_director',
    roleTitle: 'Security Director',
    email: 'eleanor.vance@sentinel.soc',
    clearance: 'Level 4 — Executive Threat Authority',
    avatarColor: '#ea580c',
    canEscalate: true,
    canAddEntity: true,
  },
  {
    id: 'sec-asst-02',
    username: 'assistant',
    name: 'Caleb Hayes',
    role: 'assistant_security',
    roleTitle: 'Assistant Security Analyst',
    email: 'caleb.hayes@sentinel.soc',
    clearance: 'Level 2 — Security Operations & Triage',
    avatarColor: '#0284c7',
    canEscalate: true,
    canAddEntity: false,
  },
];

apiRouter.get('/auth/users', (req: Request, res: Response) => {
  res.json({ users: SYSTEM_AUTH_USERS });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { username, role } = req.body;
  const user = SYSTEM_AUTH_USERS.find(
    (u) => u.username === username || u.role === role || u.id === username
  );
  if (!user) {
    return res.status(401).json({ error: 'Invalid user credentials.' });
  }
  res.json({ success: true, user });
});

// 11. ONBOARD NEW MONITORED ENTITY (Restricted to Security Director ONLY)
apiRouter.post('/entities', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const callerRole = req.headers['x-user-role'] || req.body.callerRole;

    // RBAC Enforcement: Adding entity can ONLY be done by the security director!
    if (callerRole !== 'security_director') {
      return res.status(403).json({
        error: 'Permission Denied: Adding entities can only be performed by the Security Director.',
        requiredRole: 'security_director',
        providedRole: callerRole || 'none',
      });
    }

    const {
      name,
      department,
      isPrivileged = false,
      typicalStartHour = 9,
      typicalEndHour = 18,
      baselineDailyBytesMB = 50,
      email,
      initialRiskScore = 12,
    } = req.body;

    const roleTitle = req.body.roleTitle || req.body.role;

    if (!name || !department || !roleTitle) {
      return res.status(400).json({ error: 'Name, department, and role title are required.' });
    }

    const id = req.body.id || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
    const userEmail = email || `${id}@corp.internal`;

    // Check if user ID already exists
    const existing = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
    if (existing) {
      return res.status(400).json({ error: `An entity with identifier "${id}" already exists in the system.` });
    }

    const colors = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];
    const nowIso = new Date().toISOString();

    // 1. Insert user
    db.prepare(`
      INSERT INTO users (id, name, email, role, department, is_privileged, risk_score, peer_ratio, avatar_color, last_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      userEmail,
      roleTitle,
      department,
      isPrivileged ? 1 : 0,
      initialRiskScore,
      1.0,
      avatarColor,
      nowIso
    );

    // 2. Ensure baseline exists for this role/department
    const baselineExists = db.prepare(
      'SELECT * FROM role_baselines WHERE department = ? AND role = ?'
    ).get(department, roleTitle);

    if (!baselineExists) {
      db.prepare(`
        INSERT INTO role_baselines (
          department, role, typical_start_hour, typical_end_hour,
          mean_daily_events, std_daily_events, mean_daily_bytes_mb,
          std_daily_bytes_mb, expected_threshold_mb
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        department,
        roleTitle,
        Number(typicalStartHour),
        Number(typicalEndHour),
        26,
        5,
        Number(baselineDailyBytesMB),
        Number(baselineDailyBytesMB) * 0.25,
        Number(baselineDailyBytesMB) * 2.5
      );
    }

    // 3. Generate initial 30-day baseline circadian activity logs for this entity
    const insertLog = db.prepare(`
      INSERT INTO activity_logs (
        user_id, session_id, timestamp, date_str, hour_of_day,
        action_type, resource, ip_address, location_city, location_country,
        latitude, longitude, bytes_transferred, is_sensitive_resource,
        is_odd_hour, travel_speed_kmh, raw_event_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertAnomaly = db.prepare(`
      INSERT INTO anomaly_scores (
        event_id, user_id, timestamp, isolation_forest_score,
        normalized_anomaly_score, is_ai_flagged, feature_vector_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const now = new Date();
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const d = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const isWeekend = d.getDay() === 0 || d.getDay() === 6;
      if (isWeekend && Math.random() > 0.15) continue;

      const dateStr = d.toISOString().split('T')[0];
      const sessionId = `sess_${id}_${dateStr}`;
      const eventsCount = Math.floor(Math.random() * 6) + 12;

      for (let e = 0; e < eventsCount; e++) {
        const hour = Number(typicalStartHour) + Math.floor(Math.random() * Math.max(1, Number(typicalEndHour) - Number(typicalStartHour)));
        const eventTime = new Date(d);
        eventTime.setHours(hour, Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));

        const actions = ['SSO_LOGIN', 'FILE_READ', 'DATABASE_QUERY', 'API_CALL', 'PORTAL_ACCESS'];
        const actionType = actions[Math.floor(Math.random() * actions.length)];
        const resource = actionType === 'DATABASE_QUERY' ? `db://${department.toLowerCase()}/records` : `/shares/${department.toLowerCase()}/doc_${e}.pdf`;
        const bytes = Math.floor(Math.random() * 450000) + 10000;

        const result = insertLog.run(
          id,
          sessionId,
          eventTime.toISOString(),
          dateStr,
          hour,
          actionType,
          resource,
          '10.0.4.112',
          'San Jose',
          'United States',
          37.3382,
          -121.8863,
          bytes,
          0,
          0,
          0,
          JSON.stringify({ note: 'Normal circadian baseline session' })
        );

        insertAnomaly.run(
          result.lastInsertRowid,
          id,
          eventTime.toISOString(),
          0.12,
          initialRiskScore,
          0,
          JSON.stringify({ hour, bytes, is_odd_hour: 0 })
        );
      }
    }

    const createdUser = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as any;
    res.json({
      success: true,
      message: `Entity "${name}" successfully onboarded into UEBA Sentinel by Security Director.`,
      user: {
        ...createdUser,
        is_privileged: Boolean(createdUser.is_privileged),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 12. Generate and download complete PDF documentation
apiRouter.get('/download-documentation-pdf', (req: Request, res: Response) => {
  try {
    const pdfBuffer = generateDocumentationPdf();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="UEBA_Sentinel_Complete_System_Manual.pdf"');
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (err: any) {
    console.error('PDF Generation error:', err);
    res.status(500).json({ error: 'Failed to generate PDF documentation: ' + err.message });
  }
});

// 13. REAL-TIME & WEBSOCKET LAYER (Goals 4, 6, 7, 8)
apiRouter.get('/live/events', (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 40;
    const events = getRecentLiveEvents(limit);
    res.json({ events, count: events.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/live/score', (req: Request, res: Response) => {
  try {
    const scoredEvent = scoreAndProcessLiveEvent(req.body);
    res.json({ success: true, event: scoredEvent });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/live/scenario', (req: Request, res: Response) => {
  try {
    const { scenario } = req.body;
    const triggered = triggerScenario(scenario || 'INSIDER_EXFILTRATION');
    res.json({
      success: true,
      message: `Threat scenario "${scenario}" injected and scored in real-time.`,
      event: triggered,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 14. FALSE-POSITIVE RATE METRICS PER SIGNAL TYPE (Goal 5)
apiRouter.get('/metrics/false-positives', (req: Request, res: Response) => {
  try {
    const metrics = calculateFalsePositiveMetrics();
    res.json({
      metrics,
      algorithm: 'Analyst Feedback Closed Loop with Dynamic Signal Down-Weighting',
      summary: 'Signal weights automatically attenuated by up to 65% when high false-positive ratios are confirmed by human analysts.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 15. SECURITY POSTURE PANEL (Goal 9)
apiRouter.get('/metrics/posture', (req: Request, res: Response) => {
  try {
    const posture = calculatePostureMetrics();
    res.json({ posture });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 16. HMW (HOW MIGHT WE) COLLABORATIVE MATRIX (Team Questions: Shriram, Arshinth, Keshav, Alfred)
apiRouter.get('/hmw', (req: Request, res: Response) => {
  try {
    ensureHmwQuestionsSeeded();
    const db = getDb();
    const { contributor, theme, status } = req.query;

    let query = 'SELECT * FROM hmw_questions WHERE 1=1';
    const params: any[] = [];

    if (contributor && contributor !== 'ALL') {
      query += ' AND contributor = ?';
      params.push(contributor);
    }
    if (theme && theme !== 'ALL') {
      query += ' AND theme = ?';
      params.push(theme);
    }
    if (status && status !== 'ALL') {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY votes DESC, id ASC';

    const questions = db.prepare(query).all(...params);
    res.json({ questions });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/hmw/:id/vote', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('UPDATE hmw_questions SET votes = votes + 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT * FROM hmw_questions WHERE id = ?').get(id);
    res.json({ success: true, question: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.patch('/hmw/:id/status', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { status } = req.body;
    db.prepare('UPDATE hmw_questions SET status = ? WHERE id = ?').run(status, id);
    const updated = db.prepare('SELECT * FROM hmw_questions WHERE id = ?').get(id);
    res.json({ success: true, question: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

apiRouter.post('/hmw', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { question, contributor = 'Guest Analyst', theme = 'Proactive Security', target_goal = 'General Goal', solution_summary = '' } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question content is required' });
    }

    const id = `HMW-${String(Date.now()).slice(-4)}`;
    const nowIso = new Date().toISOString();

    db.prepare(`
      INSERT INTO hmw_questions (
        id, question, contributor, theme, status, target_goal, solution_summary, votes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, question, contributor, theme, 'ACTIVE_MONITORING', target_goal, solution_summary, 1, nowIso);

    const created = db.prepare('SELECT * FROM hmw_questions WHERE id = ?').get(id);
    res.json({ success: true, question: created });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// V1 API ROUTES (HMW 1, 2, 3, 4 & Dashboard)
// ==========================================

// HMW 4: Universal Telemetry Ingestion Adapter (CEF, Syslog, JSON normalization)
apiRouter.post('/v1/telemetry/universal', (req: Request, res: Response) => {
  try {
    const rawPayload = req.body.raw_payload || '';
    const bodyData = req.body.data || (typeof req.body === 'object' ? req.body : {});
    const extracted: Record<string, any> = { ...bodyData };

    // Parse CEF
    if (rawPayload && (rawPayload.startsWith('CEF:') || req.body.format_type === 'cef')) {
      const parts = rawPayload.split('|');
      if (parts.length >= 7) {
        extracted.action = parts[5].trim();
        const ext = parts.slice(7).join('|') || parts[6];
        const matches = ext.matchAll(/(\w+)=([^=\s]+)/g);
        for (const m of matches) {
          extracted[m[1]] = m[2];
        }
      }
    } else if (rawPayload && (rawPayload.startsWith('<') || req.body.format_type === 'syslog')) {
      // Parse Syslog
      const tokens = rawPayload.split(' ');
      for (const tok of tokens) {
        if (tok.includes('=')) {
          const [k, v] = tok.split('=', 2);
          extracted[k.trim()] = v.trim().replace(/"/g, '').replace(/'/g, '');
        }
      }
    }

    // Normalized alias matching
    const findField = (aliases: string[], fallback: any) => {
      for (const a of aliases) {
        if (extracted[a] !== undefined && extracted[a] !== null) return extracted[a];
        const lowerKey = Object.keys(extracted).find(k => k.toLowerCase() === a.toLowerCase());
        if (lowerKey && extracted[lowerKey] !== undefined) return extracted[lowerKey];
      }
      return fallback;
    };

    const userId = String(findField(['user', 'username', 'suser', 'account', 'src_user', 'user_id', 'login', 'uid'], 'sophia.chen'));
    const sourceIp = String(findField(['client_ip', 'src_ip', 'src', 'host_ip', 'ip', 'network_source', 'source_ip'], '192.168.1.105'));
    const action = String(findField(['act', 'event_type', 'activity', 'operation', 'command', 'action_name', 'action'], 'DATA_QUERY'));
    const resource = String(findField(['file', 'target', 'resource_uri', 'table', 'service', 'resource', 'dst_path'], '/api/v1/customer_records'));
    const bytes = Number(findField(['bytes_transferred', 'bytes_sent', 'size', 'transfer_size', 'volume', 'bytes'], 125000)) || 125000;
    const location = String(findField(['country', 'geo', 'city', 'location', 'src_geo'], 'HQ Internal'));

    const scored = scoreAndProcessLiveEvent({
      userId,
      actionType: action,
      resource,
      ipAddress: sourceIp,
      bytesTransferred: bytes,
      hourOfDay: new Date().getUTCHours(),
    });

    const isEarly = scored.isEarlyWarning;
    const chips = scored.signals.map(s => s.code.replace('RULE_', ''));
    if (!chips.length) chips.push('ROUTINE_BASELINE');

    const narrative = `${scored.userName} performed ${action.replace(/_/g, ' ')} on ${resource} from ${location} (${Math.round(scored.anomalyScore)} anomaly score).`;

    res.json({
      status: 'ingested_and_scored',
      normalized_event: {
        event_id: `evt-${scored.id}`,
        timestamp: scored.timestamp,
        user_id: scored.userId,
        user_name: scored.userName,
        department: scored.department,
        action,
        resource,
        source_ip: sourceIp,
        location,
        bytes_transferred: bytes,
        anomaly_score: scored.anomalyScore,
        priority_score: scored.priorityScore,
        is_early_warning: isEarly,
        signals: scored.signals.map(s => s.code),
        plain_english_narrative: narrative,
        chips,
        explain_why: [
          { factor_name: 'Peer Volume Deviation', weight_pct: 35, description: 'Exceeds peer department volume average by 3.2x', impact: 'HIGH' },
          { factor_name: 'Off-Hours Circadian Multiplier', weight_pct: 30, description: 'Outside normal schedule window', impact: 'MEDIUM' },
          { factor_name: 'Cumulative EWMA Drift', weight_pct: 20, description: '+24.8% rolling weekly drift', impact: 'HIGH' },
          { factor_name: 'Privilege Blast Radius', weight_pct: 15, description: 'Tier-1 Administrative account access', impact: 'MEDIUM' }
        ],
        drift_velocity_pct: 24.8
      },
      incident_generated: scored.isEarlyWarning || scored.isThreat,
      alert_id: scored.isEarlyWarning || scored.isThreat ? `alt-${Date.now()}` : null
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/events/recent
apiRouter.get('/v1/events/recent', (req: Request, res: Response) => {
  const events = getRecentLiveEvents(30);
  res.json(events);
});

// GET /v1/incidents
apiRouter.get('/v1/incidents', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT a.*, u.name as user_name, u.department
      FROM alerts a
      LEFT JOIN users u ON a.user_id = u.id
      ORDER BY a.priority_score DESC, a.id DESC
      LIMIT 25
    `).all() as any[];

    const mapped = rows.map(r => ({
      alert_id: `alt-${r.id}`,
      timestamp: r.created_at,
      user_id: r.user_id,
      user_name: r.user_name || r.user_id,
      department: r.department || 'Engineering',
      title: r.title,
      severity: r.severity,
      priority_score: r.priority_score,
      is_early_warning: Boolean(r.is_early_warning),
      detection_type: r.detection_type || (r.is_early_warning ? 'PROACTIVE_EARLY_WARNING' : 'REACTIVE_THRESHOLD'),
      warning_label: r.is_early_warning ? 'Rising risk — not yet critical' : 'Critical Threshold Breached',
      plain_english_narrative: r.description,
      chips: [r.rule_code?.replace('RULE_', '') || 'ANOMALY', Boolean(r.is_early_warning) ? 'EARLY_WARNING' : 'CRITICAL_BREACH'],
      explain_why: [
        { factor_name: 'Peer Volume Deviation', weight_pct: 40, description: 'Transfer exceeds peer department average' },
        { factor_name: 'Off-Hours Circadian Multiplier', weight_pct: 35, description: 'Activity performed outside normal work schedule' },
        { factor_name: 'Cumulative Baseline Drift', weight_pct: 25, description: '+24.8% multi-day EWMA volume deviation' }
      ],
      signals: [r.rule_code || 'RULE_ANOMALY'],
      analyst_status: r.analyst_status || 'PENDING',
      drift_velocity_pct: 24.8
    }));

    res.json(mapped);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/incidents/:alert_id/feedback (HMW 3: Dynamic FP down-weighting & 1-click triage)
apiRouter.post('/v1/incidents/:alertId/feedback', (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { decision, notes } = req.body;

    const result = recordAnalystFeedback(
      alertId,
      decision,
      notes || `1-click analyst action: ${decision}`,
      req.body.analyst_name || 'Primary SOC Analyst'
    );

    res.json({
      status: 'success',
      alert_id: result.alertId,
      decision,
      posture: calculatePostureMetrics()
    });
  } catch (err: any) {
    res.status(err instanceof FeedbackError ? err.status : 500).json({ error: err.message });
  }
});

// GET /v1/entities/:userId/dossier (HMW 1: EWMA Baseline Drift & Circadian Curve)
apiRouter.get('/v1/entities/:userId/dossier', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { userId } = req.params;
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as any;

    if (!user) {
      return res.status(404).json({ error: 'Entity profile not found' });
    }

    const circadianCurve: any[] = [];
    const expectedBase = 1200;
    for (let h = 0; h < 24; h++) {
      const isWork = h >= 9 && h <= 18;
      const exp = isWork ? expectedBase : expectedBase / 8;
      let act = exp;
      if (user.risk_score >= 75 && (h === 2 || h === 3 || h === 23)) {
        act = exp * 3.5;
      }
      circadianCurve.push({
        hour: `${String(h).padStart(2, '0')}:00`,
        expected_baseline_kb: Math.round(exp),
        actual_observed_kb: Math.round(act)
      });
    }

    res.json({
      entity: {
        id: user.id,
        name: user.name,
        email: user.email,
        department: user.department,
        role_title: user.role_title,
        risk_score: user.risk_score,
        peer_avg_risk: 32,
        ewma_velocity_score: 24.8,
        drift_velocity_pct: user.risk_score >= 70 ? 28.4 : 5.2,
        is_drifting: user.risk_score >= 70,
        privilege_level: user.department === 'Engineering' ? 'Tier-1 Admin' : 'Standard'
      },
      circadian_24h_curve: circadianCurve
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/metrics/posture
apiRouter.get('/v1/metrics/posture', (req: Request, res: Response) => {
  try {
    const posture = calculatePostureMetrics();
    res.json({
      proactive_ratio: posture.proactiveRatio,
      early_warnings_count: posture.proactiveCount,
      reactive_alerts_count: posture.reactiveCount,
      avg_lead_time_hours: posture.avgLeadTimeHours,
      signal_weight_multipliers: {
        RULE_ODD_HOURS: 0.65,
        RULE_IMPOSSIBLE_TRAVEL: 0.85,
        RULE_VOLUME_SPIKE: 1.0,
        RULE_EWMA_DRIFT: 1.20
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /v1/hmw
apiRouter.get('/v1/hmw', (req: Request, res: Response) => {
  try {
    ensureHmwQuestionsSeeded();
    const db = getDb();
    const questions = db.prepare('SELECT * FROM hmw_questions ORDER BY votes DESC').all();
    res.json(questions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/hmw
apiRouter.post('/v1/hmw', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { question, contributor, theme, status, target_goal, solution_summary } = req.body;
    const id = `hmw-${Date.now()}`;
    db.prepare(`
      INSERT INTO hmw_questions (id, question, contributor, theme, status, target_goal, solution_summary, votes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(id, question, contributor, theme, status || 'In Prototype', target_goal, solution_summary, new Date().toISOString());

    const created = db.prepare('SELECT * FROM hmw_questions WHERE id = ?').get(id);
    res.json(created);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/hmw/:id/vote
apiRouter.post('/v1/hmw/:id/vote', (req: Request, res: Response) => {
  try {
    const db = getDb();
    const { id } = req.params;
    db.prepare('UPDATE hmw_questions SET votes = votes + 1 WHERE id = ?').run(id);
    const updated = db.prepare('SELECT * FROM hmw_questions WHERE id = ?').get(id) as any;
    res.json({ id, votes: updated ? updated.votes : 1 });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /v1/simulation/scenario
apiRouter.post('/v1/simulation/scenario', (req: Request, res: Response) => {
  try {
    const scenario = req.body.scenario_type || 'LOW_AND_SLOW_EXFIL';
    const alert = triggerScenario(scenario);
    res.json({ status: 'scenario_injected', scenario, alert });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
