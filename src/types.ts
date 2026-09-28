export interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  is_privileged: boolean;
  risk_score: number;
  peer_ratio: number;
  avatar_color: string;
  last_active: string;
  pending_alerts?: number;
  total_alerts?: number;
}

export interface PeerComparison {
  department: string;
  userScore: number;
  departmentAverage: number;
  peerRatio: number;
  indicatorText: string;
  isElevated: boolean;
}

export interface RoleBaseline {
  department: string;
  role: string;
  typical_start_hour: number;
  typical_end_hour: number;
  mean_daily_events: number;
  std_daily_events: number;
  mean_daily_bytes_mb: number;
  std_daily_bytes_mb: number;
  expected_threshold_mb: number;
}

export interface TrendPoint {
  date: string;
  riskScore: number;
  eventCount: number;
  totalBytesMB: number;
  hasFlaggedEvents: boolean;
  flaggedCount: number;
}

export interface ActivityEvent {
  id: number;
  session_id: string;
  timestamp: string;
  date_str: string;
  hour_of_day: number;
  action_type: string;
  resource: string;
  ip_address: string;
  location_city: string;
  location_country: string;
  latitude: number;
  longitude: number;
  bytes_transferred: number;
  is_sensitive_resource: number;
  is_odd_hour: number;
  isolation_forest_score: number;
  normalized_anomaly_score: number;
  is_ai_flagged: number;
  linked_alert_id?: string;
  linked_priority_score?: number;
}

export interface RuleSignal {
  code: string;
  title: string;
  stage: 'Ingress & Authentication' | 'Reconnaissance & Privilege' | 'Action on Objectives & Exfiltration';
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  weight: number;
  description: string;
  evidence: Record<string, any>;
  timestamp: string;
}

export interface AlertIncident {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  isPrivileged: boolean;
  avatarColor?: string;
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
  analystStatus: 'PENDING' | 'CONFIRMED' | 'DISMISSED' | 'MARK_FOR_REVIEW' | 'ESCALATED';
  analystNotes?: string;
  analystDecisionTime?: string;
  isEarlyWarning?: boolean;
  detectionType?: 'PROACTIVE_EARLY_WARNING' | 'REACTIVE_THRESHOLD';
  warningLabel?: string;
}

export interface AnalystFeedbackRecord {
  id: number;
  alert_id: string;
  user_id: string;
  user_name?: string;
  department?: string;
  analyst_name: string;
  decision: 'CONFIRMED' | 'DISMISSED' | 'MARK_FOR_REVIEW' | 'ESCALATED';
  justification: string;
  original_ai_score: number;
  priority_score: number;
  cooccurring_count: number;
  feedback_timestamp: string;
  signals_snapshot: string;
}

export interface LiveEventItem {
  id: number;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: string;
  department: string;
  isPrivileged: boolean;
  actionType: string;
  resource: string;
  ipAddress: string;
  bytesTransferred: number;
  anomalyScore: number;
  priorityScore: number;
  isEarlyWarning: boolean;
  isThreat: boolean;
  warningLabel?: string;
  signals: RuleSignal[];
  scenarioTag?: string;
}

export interface FalsePositiveMetric {
  signalCode: string;
  signalName: string;
  category: string;
  totalEvaluated: number;
  confirmedCount: number;
  dismissedCount: number;
  falsePositiveRate: number;
  currentWeightMultiplier: number;
  status: 'OPTIMAL' | 'MODERATE_NOISE' | 'HIGH_NOISE_SUPPRESSED';
}

export interface PostureMetrics {
  proactiveCount: number;
  reactiveCount: number;
  totalAlerts: number;
  proactiveRatio: number;
  reactiveRatio: number;
  avgLeadTimeHours: number;
  incidentsPrevented: number;
  postureGrade: 'A+' | 'A' | 'B+' | 'B' | 'C';
  talkingPoints: string[];
}

export interface HMWQuestionItem {
  id: string;
  question: string;
  contributor: 'Shriram' | 'Arshinth' | 'Keshav' | 'Alfred' | string;
  theme: string;
  status: 'IMPLEMENTED' | 'IN_PRODUCTION' | 'ACTIVE_MONITORING';
  target_goal: string;
  solution_summary: string;
  votes: number;
  created_at: string;
}

export type SecurityRole = 'security_director' | 'assistant_security';

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: SecurityRole;
  roleTitle: string;
  email: string;
  clearance: string;
  avatarColor: string;
  canEscalate: boolean;
  canAddEntity: boolean;
}

export interface UnifiedUserPayload {
  user: User;
  peerComparison: PeerComparison;
  roleBaseline: RoleBaseline;
  trendData: TrendPoint[];
  activityFeed: ActivityEvent[];
  alerts: AlertIncident[];
}

export type AppView =
  | 'overview'
  | 'entities'
  | 'activity'
  | 'anomalies'
  | 'alerts'
  | 'audit'
  | 'architecture'
  | 'settings'
  | 'investigations'
  | 'unified'
  | 'landing'
  | 'oversight'
  | 'priority'
  | 'live'
  | 'posture'
  | 'login';

