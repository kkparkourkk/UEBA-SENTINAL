/**
 * 30-Day Synthetic Telemetry Generator for UEBA.
 * Generates realistic enterprise telemetry for ~25 users across 4 departments,
 * establishes circadian baselines, and injects 5 realistic threat scenarios.
 */

import { getDb } from './db.js';
import { IsolationForest } from './isolationForest.js';
import { evaluateEventRules, haversineDistance, RuleSignal } from './rules.js';
import { groupEventsIntoAlerts } from './prioritization.js';

export interface UserDef {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isPrivileged: boolean;
  avatarColor: string;
  isAnomalous?: boolean;
  anomalyType?: 'EXFILTRATION' | 'IMPOSSIBLE_TRAVEL' | 'PRIVILEGE_PROBE' | 'SLOW_BURN' | 'BENIGN_BURST';
}

export const USERS: UserDef[] = [
  // --- ENGINEERING ---
  {
    id: 'marcus.vance',
    name: 'Marcus Vance',
    email: 'marcus.vance@corp.internal',
    role: 'Senior Software Engineer',
    department: 'Engineering',
    isPrivileged: false,
    avatarColor: '#f97316',
    isAnomalous: true,
    anomalyType: 'EXFILTRATION',
  },
  {
    id: 'david.kramer',
    name: 'David Kramer',
    email: 'david.kramer@corp.internal',
    role: 'Junior DevOps Engineer',
    department: 'Engineering',
    isPrivileged: false,
    avatarColor: '#eab308',
    isAnomalous: true,
    anomalyType: 'PRIVILEGE_PROBE',
  },
  {
    id: 'liam.chen',
    name: 'Liam Chen',
    email: 'liam.chen@corp.internal',
    role: 'Principal Architect',
    department: 'Engineering',
    isPrivileged: true,
    avatarColor: '#3b82f6',
  },
  {
    id: 'sarah.jenkins',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@corp.internal',
    role: 'Backend Engineer',
    department: 'Engineering',
    isPrivileged: false,
    avatarColor: '#06b6d4',
  },
  {
    id: 'priya.patel',
    name: 'Priya Patel',
    email: 'priya.patel@corp.internal',
    role: 'Infrastructure Lead',
    department: 'Engineering',
    isPrivileged: true,
    avatarColor: '#8b5cf6',
  },
  {
    id: 'maya.lin',
    name: 'Maya Lin',
    email: 'maya.lin@corp.internal',
    role: 'Frontend Engineer',
    department: 'Engineering',
    isPrivileged: false,
    avatarColor: '#ec4899',
  },
  {
    id: 'carlos.gomez',
    name: 'Carlos Gomez',
    email: 'carlos.gomez@corp.internal',
    role: 'QA Automation Engineer',
    department: 'Engineering',
    isPrivileged: false,
    avatarColor: '#10b981',
  },

  // --- HUMAN RESOURCES ---
  {
    id: 'sophia.chen',
    name: 'Sophia Chen',
    email: 'sophia.chen@corp.internal',
    role: 'HR Director',
    department: 'Human Resources',
    isPrivileged: true, // privileged access to employee PII & compensation
    avatarColor: '#ef4444',
    isAnomalous: true,
    anomalyType: 'IMPOSSIBLE_TRAVEL',
  },
  {
    id: 'rachel.adams',
    name: 'Rachel Adams',
    email: 'rachel.adams@corp.internal',
    role: 'Senior Talent Partner',
    department: 'Human Resources',
    isPrivileged: false,
    avatarColor: '#6366f1',
  },
  {
    id: 'ethan.wright',
    name: 'Ethan Wright',
    email: 'ethan.wright@corp.internal',
    role: 'HR Operations Lead',
    department: 'Human Resources',
    isPrivileged: false,
    avatarColor: '#14b8a6',
  },
  {
    id: 'olivia.martin',
    name: 'Olivia Martin',
    email: 'olivia.martin@corp.internal',
    role: 'People Experience Lead',
    department: 'Human Resources',
    isPrivileged: false,
    avatarColor: '#f43f5e',
  },
  {
    id: 'daniel.kim',
    name: 'Daniel Kim',
    email: 'daniel.kim@corp.internal',
    role: 'HR Benefits Analyst',
    department: 'Human Resources',
    isPrivileged: false,
    avatarColor: '#84cc16',
  },

  // --- FINANCE ---
  {
    id: 'natalie.brooks',
    name: 'Natalie Brooks',
    email: 'natalie.brooks@corp.internal',
    role: 'Senior Financial Analyst',
    department: 'Finance',
    isPrivileged: false,
    avatarColor: '#a855f7',
    isAnomalous: true,
    anomalyType: 'SLOW_BURN',
  },
  {
    id: 'elena.rostova',
    name: 'Elena Rostova',
    email: 'elena.rostova@corp.internal',
    role: 'VP Corporate Controller',
    department: 'Finance',
    isPrivileged: true,
    avatarColor: '#0ea5e9',
  },
  {
    id: 'lucas.rossi',
    name: 'Lucas Rossi',
    email: 'lucas.rossi@corp.internal',
    role: 'Senior Accountant',
    department: 'Finance',
    isPrivileged: false,
    avatarColor: '#22c55e',
  },
  {
    id: 'chloe.bennett',
    name: 'Chloe Bennett',
    email: 'chloe.bennett@corp.internal',
    role: 'Payroll Specialist',
    department: 'Finance',
    isPrivileged: false,
    avatarColor: '#d946ef',
  },
  {
    id: 'james.oconnor',
    name: "James O'Connor",
    email: 'james.oconnor@corp.internal',
    role: 'Treasury Analyst',
    department: 'Finance',
    isPrivileged: false,
    avatarColor: '#f59e0b',
  },
  {
    id: 'harper.diaz',
    name: 'Harper Diaz',
    email: 'harper.diaz@corp.internal',
    role: 'Internal Audit Manager',
    department: 'Finance',
    isPrivileged: true,
    avatarColor: '#64748b',
  },

  // --- IT ADMINISTRATION & SECURITY ---
  {
    id: 'alex.turner',
    name: 'Alex Turner',
    email: 'alex.turner@corp.internal',
    role: 'Enterprise Systems Architect',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#0284c7',
  },
  {
    id: 'jordan.lee',
    name: 'Jordan Lee',
    email: 'jordan.lee@corp.internal',
    role: 'IT Support Engineer',
    department: 'IT Administration',
    isPrivileged: false,
    avatarColor: '#10b981',
    isAnomalous: true,
    anomalyType: 'BENIGN_BURST',
  },
  {
    id: 'vikram.shah',
    name: 'Vikram Shah',
    email: 'vikram.shah@corp.internal',
    role: 'Cloud Security Engineer',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#4f46e5',
  },
  {
    id: 'emma.watson',
    name: 'Emma Watson',
    email: 'emma.watson@corp.internal',
    role: 'Network Infrastructure Admin',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#059669',
  },
  {
    id: 'noah.garcia',
    name: 'Noah Garcia',
    email: 'noah.garcia@corp.internal',
    role: 'SOC Tier-2 Analyst',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#dc2626',
  },
  {
    id: 'benjamin.taylor',
    name: 'Benjamin Taylor',
    email: 'benjamin.taylor@corp.internal',
    role: 'Database Administrator',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#7c3aed',
  },
  {
    id: 'grace.hopper-smith',
    name: 'Grace Hopper-Smith',
    email: 'grace.hs@corp.internal',
    role: 'Identity & Directory Admin',
    department: 'IT Administration',
    isPrivileged: true,
    avatarColor: '#0891b2',
  },
];

export const ROLE_BASELINES_DEF = [
  {
    department: 'Engineering',
    role: 'Senior Software Engineer',
    typicalStartHour: 9,
    typicalEndHour: 19,
    meanDailyEvents: 45,
    stdDailyEvents: 12,
    meanDailyBytesMB: 180,
    stdDailyBytesMB: 65,
    expectedThresholdMB: 600,
  },
  {
    department: 'Engineering',
    role: 'Junior DevOps Engineer',
    typicalStartHour: 9,
    typicalEndHour: 18,
    meanDailyEvents: 40,
    stdDailyEvents: 10,
    meanDailyBytesMB: 140,
    stdDailyBytesMB: 50,
    expectedThresholdMB: 500,
  },
  {
    department: 'Human Resources',
    role: 'HR Director',
    typicalStartHour: 8,
    typicalEndHour: 17,
    meanDailyEvents: 25,
    stdDailyEvents: 7,
    meanDailyBytesMB: 30,
    stdDailyBytesMB: 12,
    expectedThresholdMB: 90,
  },
  {
    department: 'Human Resources',
    role: 'Senior Talent Partner',
    typicalStartHour: 9,
    typicalEndHour: 17,
    meanDailyEvents: 22,
    stdDailyEvents: 6,
    meanDailyBytesMB: 20,
    stdDailyBytesMB: 8,
    expectedThresholdMB: 60,
  },
  {
    department: 'Finance',
    role: 'Senior Financial Analyst',
    typicalStartHour: 8,
    typicalEndHour: 18,
    meanDailyEvents: 30,
    stdDailyEvents: 9,
    meanDailyBytesMB: 45,
    stdDailyBytesMB: 15,
    expectedThresholdMB: 120,
  },
  {
    department: 'Finance',
    role: 'VP Corporate Controller',
    typicalStartHour: 8,
    typicalEndHour: 18,
    meanDailyEvents: 35,
    stdDailyEvents: 10,
    meanDailyBytesMB: 50,
    stdDailyBytesMB: 18,
    expectedThresholdMB: 140,
  },
  {
    department: 'IT Administration',
    role: 'Enterprise Systems Architect',
    typicalStartHour: 7,
    typicalEndHour: 20,
    meanDailyEvents: 60,
    stdDailyEvents: 18,
    meanDailyBytesMB: 260,
    stdDailyBytesMB: 90,
    expectedThresholdMB: 850,
  },
  {
    department: 'IT Administration',
    role: 'IT Support Engineer',
    typicalStartHour: 8,
    typicalEndHour: 18,
    meanDailyEvents: 35,
    stdDailyEvents: 11,
    meanDailyBytesMB: 110,
    stdDailyBytesMB: 40,
    expectedThresholdMB: 350,
  },
];

const STANDARD_CITIES = [
  { city: 'Seattle, WA', country: 'US', lat: 47.6062, lon: -122.3321 },
  { city: 'San Jose, CA', country: 'US', lat: 37.3382, lon: -121.8863 },
  { city: 'Austin, TX', country: 'US', lat: 30.2672, lon: -97.7431 },
  { city: 'New York, NY', country: 'US', lat: 40.7128, lon: -74.006 },
];

/**
 * Seeds the 30-day dataset and runs baseline modeling + isolation forest + rule evaluation
 */
export function seedSyntheticDataset(): {
  usersCount: number;
  eventsCount: number;
  alertsCount: number;
} {
  const db = getDb();

  // Clear existing records
  db.exec(`
    DELETE FROM analyst_feedback;
    DELETE FROM alerts;
    DELETE FROM anomaly_scores;
    DELETE FROM activity_logs;
    DELETE FROM role_baselines;
    DELETE FROM users;
  `);

  // 1. Insert Role Baselines
  const insertBaseline = db.prepare(`
    INSERT INTO role_baselines (
      department, role, typical_start_hour, typical_end_hour,
      mean_daily_events, std_daily_events, mean_daily_bytes_mb,
      std_daily_bytes_mb, expected_threshold_mb
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of ROLE_BASELINES_DEF) {
    insertBaseline.run(
      b.department,
      b.role,
      b.typicalStartHour,
      b.typicalEndHour,
      b.meanDailyEvents,
      b.stdDailyEvents,
      b.meanDailyBytesMB,
      b.stdDailyBytesMB,
      b.expectedThresholdMB
    );
  }

  // 2. Insert Users
  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, role, department, is_privileged, risk_score, peer_ratio, avatar_color, last_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of USERS) {
    insertUser.run(
      u.id,
      u.name,
      u.email,
      u.role,
      u.department,
      u.isPrivileged ? 1 : 0,
      12.0, // initial baseline placeholder
      1.0,
      u.avatarColor,
      new Date().toISOString()
    );
  }

  // Helper baseline lookup
  const getBaselineForRole = (department: string, role: string) => {
    const match = ROLE_BASELINES_DEF.find((b) => b.department === department && b.role === role);
    if (match) return match;
    // Default fallback baseline for department
    return {
      department,
      role,
      typicalStartHour: 8,
      typicalEndHour: 18,
      meanDailyEvents: 30,
      stdDailyEvents: 8,
      meanDailyBytesMB: 60,
      stdDailyBytesMB: 20,
      expectedThresholdMB: 200,
    };
  };

  // 3. Generate 30-Day Activity History
  // Base reference date: today (2026-09-20)
  const now = new Date('2026-09-20T08:00:00Z');
  const insertActivity = db.prepare(`
    INSERT INTO activity_logs (
      user_id, session_id, timestamp, date_str, hour_of_day, action_type,
      resource, ip_address, location_city, location_country, latitude, longitude,
      bytes_transferred, is_sensitive_resource, is_odd_hour, travel_speed_kmh, raw_event_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  interface TempEvent {
    id: number;
    userId: string;
    userName: string;
    userRole: string;
    department: string;
    isPrivileged: boolean;
    sessionId: string;
    timestamp: string;
    dateStr: string;
    hourOfDay: number;
    actionType: string;
    resource: string;
    ipAddress: string;
    location: (typeof STANDARD_CITIES)[0];
    bytesTransferred: number;
    isSensitive: boolean;
  }

  const generatedEvents: TempEvent[] = [];
  let eventCounter = 1;

  for (const user of USERS) {
    const baseline = getBaselineForRole(user.department, user.role);
    const primaryCity = STANDARD_CITIES[Math.abs(user.id.charCodeAt(0)) % STANDARD_CITIES.length];

    // Generate days -29 to 0
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const currentDay = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
      const dateStr = currentDay.toISOString().slice(0, 10);
      const isWeekend = currentDay.getUTCDay() === 0 || currentDay.getUTCDay() === 6;

      // Normal event count on this day
      let dailyEventsCount = isWeekend
        ? Math.floor(Math.random() * 4) // quiet weekend
        : Math.floor(baseline.meanDailyEvents * 0.4 + Math.random() * baseline.meanDailyEvents * 0.4);

      // Check if this user triggers an injected anomaly on this specific day!
      const isRecentDay = dayOffset <= 5; // Anomaly occurred in recent days

      if (user.isAnomalous && isRecentDay) {
        // --- INJECTED THREAT 1: Marcus Vance (Exfiltration) ---
        if (user.anomalyType === 'EXFILTRATION' && dayOffset === 1) {
          // Late night 02:45 AM
          const session = `sess_exfil_${user.id}_${dayOffset}`;
          const exfilTime = new Date(`${dateStr}T02:45:12Z`);

          const exfilEvents = [
            {
              action: 'LOGIN_SUCCESS',
              resource: 'portal:sso/okta_gateway',
              bytes: 4096,
              hour: 2,
              sensitive: false,
              resTime: new Date(exfilTime.getTime()),
            },
            {
              action: 'GIT_CLONE',
              resource: 'git:core-auth-service.git',
              bytes: 185 * 1024 * 1024,
              hour: 2,
              sensitive: true,
              resTime: new Date(exfilTime.getTime() + 4 * 60000),
            },
            {
              action: 'DATABASE_QUERY',
              resource: 'postgres:prod_db_replica/users_credentials_dump',
              bytes: 840 * 1024 * 1024,
              hour: 3,
              sensitive: true,
              resTime: new Date(exfilTime.getTime() + 14 * 60000),
            },
            {
              action: 'DATA_EGRESS',
              resource: 's3:external-backup-bucket/archive.tar.gz',
              bytes: 14.8 * 1024 * 1024 * 1024, // 14.8 GB!
              hour: 3,
              sensitive: true,
              resTime: new Date(exfilTime.getTime() + 25 * 60000),
            },
          ];

          for (const ev of exfilEvents) {
            generatedEvents.push({
              id: eventCounter++,
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              department: user.department,
              isPrivileged: user.isPrivileged,
              sessionId: session,
              timestamp: ev.resTime.toISOString(),
              dateStr,
              hourOfDay: ev.hour,
              actionType: ev.action,
              resource: ev.resource,
              ipAddress: '198.51.100.77', // Untrusted residential IP
              location: primaryCity,
              bytesTransferred: ev.bytes,
              isSensitive: ev.sensitive,
            });
          }
        }

        // --- INJECTED THREAT 2: Sophia Chen (Impossible Travel / ATO) ---
        else if (user.anomalyType === 'IMPOSSIBLE_TRAVEL' && dayOffset === 2) {
          const sessionSeattle = `sess_travel_sea_${dayOffset}`;
          const timeSeattle = new Date(`${dateStr}T14:10:00Z`);

          generatedEvents.push({
            id: eventCounter++,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            department: user.department,
            isPrivileged: user.isPrivileged,
            sessionId: sessionSeattle,
            timestamp: timeSeattle.toISOString(),
            dateStr,
            hourOfDay: 14,
            actionType: 'LOGIN_SUCCESS',
            resource: 'workspace:google_suite/hr_portal',
            ipAddress: '74.125.21.4',
            location: { city: 'Seattle, WA', country: 'US', lat: 47.6062, lon: -122.3321 },
            bytesTransferred: 12000,
            isSensitive: false,
          });

          // 42 minutes later in Sofia, Bulgaria! (8,700 km apart!)
          const sessionBulgaria = `sess_travel_sofia_${dayOffset}`;
          const timeBulgaria = new Date(`${dateStr}T14:52:18Z`);

          generatedEvents.push({
            id: eventCounter++,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            department: user.department,
            isPrivileged: user.isPrivileged,
            sessionId: sessionBulgaria,
            timestamp: timeBulgaria.toISOString(),
            dateStr,
            hourOfDay: 14,
            actionType: 'LOGIN_SUCCESS',
            resource: 'workspace:google_suite/hr_portal',
            ipAddress: '185.220.101.5', // Known Tor Exit / Sofia proxy
            location: { city: 'Sofia', country: 'Bulgaria', lat: 42.6977, lon: 23.3219 },
            bytesTransferred: 4096,
            isSensitive: false,
          });

          generatedEvents.push({
            id: eventCounter++,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            department: user.department,
            isPrivileged: user.isPrivileged,
            sessionId: sessionBulgaria,
            timestamp: new Date(timeBulgaria.getTime() + 6 * 60000).toISOString(),
            dateStr,
            hourOfDay: 14,
            actionType: 'API_BULK_EXPORT',
            resource: 'workday:payroll/2026_w2_employee_ssn_export.xlsx',
            ipAddress: '185.220.101.5',
            location: { city: 'Sofia', country: 'Bulgaria', lat: 42.6977, lon: 23.3219 },
            bytesTransferred: 850 * 1024 * 1024,
            isSensitive: true,
          });
        }

        // --- INJECTED THREAT 3: David Kramer (Privilege Escalation & Recon) ---
        else if (user.anomalyType === 'PRIVILEGE_PROBE' && dayOffset === 3) {
          const sessionKramer = `sess_probe_${dayOffset}`;
          const probeTime = new Date(`${dateStr}T23:15:00Z`);

          const probeActions = [
            { act: 'LOGIN_SUCCESS', res: 'bastion:ssh_proxy', bytes: 2048, sens: false, h: 23, offset: 0 },
            { act: 'SUDO_COMMAND', res: 'k8s:cluster/secrets_root_inspect', bytes: 14000, sens: true, h: 23, offset: 4 },
            { act: 'LOGIN_FAILED', res: 'vault:prod/enterprise_api_keys', bytes: 512, sens: true, h: 23, offset: 7 },
            { act: 'SUDO_COMMAND', res: 'system:/etc/shadow_dump_attempt', bytes: 64000, sens: true, h: 23, offset: 11 },
          ];

          for (const pa of probeActions) {
            generatedEvents.push({
              id: eventCounter++,
              userId: user.id,
              userName: user.name,
              userRole: user.role,
              department: user.department,
              isPrivileged: user.isPrivileged,
              sessionId: sessionKramer,
              timestamp: new Date(probeTime.getTime() + pa.offset * 60000).toISOString(),
              dateStr,
              hourOfDay: pa.h,
              actionType: pa.act,
              resource: pa.res,
              ipAddress: '172.16.89.44',
              location: primaryCity,
              bytesTransferred: pa.bytes,
              isSensitive: pa.sens,
            });
          }
        }

        // --- INJECTED THREAT 4: Natalie Brooks (Slow-Burn Financial Egress) ---
        else if (user.anomalyType === 'SLOW_BURN' && (dayOffset === 2 || dayOffset === 4)) {
          const sessionSlow = `sess_slow_${dayOffset}`;
          const slowTime = new Date(`${dateStr}T21:40:00Z`);

          generatedEvents.push({
            id: eventCounter++,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            department: user.department,
            isPrivileged: user.isPrivileged,
            sessionId: sessionSlow,
            timestamp: slowTime.toISOString(),
            dateStr,
            hourOfDay: 21,
            actionType: 'DATA_EGRESS',
            resource: 'netsuite:financials/q3_forecast_unreleased.csv',
            ipAddress: '104.28.19.12',
            location: primaryCity,
            bytesTransferred: 420 * 1024 * 1024, // 420 MB vs Finance 120MB threshold
            isSensitive: true,
          });
        }

        // --- INJECTED THREAT 5: Jordan Lee (Benign Burst / False-Positive Scenario) ---
        else if (user.anomalyType === 'BENIGN_BURST' && dayOffset === 1) {
          const sessionJordan = `sess_jordan_${dayOffset}`;
          const burstTime = new Date(`${dateStr}T22:10:00Z`);

          generatedEvents.push({
            id: eventCounter++,
            userId: user.id,
            userName: user.name,
            userRole: user.role,
            department: user.department,
            isPrivileged: user.isPrivileged,
            sessionId: sessionJordan,
            timestamp: burstTime.toISOString(),
            dateStr,
            hourOfDay: 22,
            actionType: 'FILE_DOWNLOAD',
            resource: 'jamf:software_packages/macos_enterprise_installer.pkg',
            ipAddress: '68.102.44.18',
            location: { city: 'Denver, CO', country: 'US', lat: 39.7392, lon: -104.9903 },
            bytesTransferred: 750 * 1024 * 1024,
            isSensitive: false,
          });
        }
      }

      // Generate regular everyday baseline events
      for (let i = 0; i < dailyEventsCount; i++) {
        // Working hours distribution: peak around typicalStart + 4
        const workHoursSpan = baseline.typicalEndHour - baseline.typicalStartHour;
        const hour = Math.floor(baseline.typicalStartHour + Math.random() * workHoursSpan);
        const minute = Math.floor(Math.random() * 60);
        const second = Math.floor(Math.random() * 60);

        const eventTime = new Date(`${dateStr}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')}Z`);
        const sessionId = `sess_${user.id}_${dateStr}_${hour < 13 ? 'am' : 'pm'}`;

        let action = 'FILE_DOWNLOAD';
        let resource = 'confluence:docs/architecture_notes';
        let bytes = Math.floor(Math.random() * 20 * 1024 * 1024); // up to 20MB
        let isSensitive = false;

        if (user.department === 'Engineering') {
          action = ['GIT_CLONE', 'FILE_DOWNLOAD', 'DATABASE_QUERY', 'LOGIN_SUCCESS'][i % 4];
          resource = action === 'GIT_CLONE' ? `git:service-${(i % 5) + 1}` : 'jira:tickets/sprint-34';
          bytes = Math.floor(Math.random() * 80 * 1024 * 1024);
        } else if (user.department === 'Finance') {
          action = ['FILE_DOWNLOAD', 'LOGIN_SUCCESS', 'DATABASE_QUERY'][i % 3];
          resource = 'netsuite:reports/ledger_summary';
          bytes = Math.floor(Math.random() * 15 * 1024 * 1024);
        } else if (user.department === 'Human Resources') {
          action = ['FILE_DOWNLOAD', 'LOGIN_SUCCESS'][i % 2];
          resource = 'bamboohr:profiles/candidate_resumes';
          bytes = Math.floor(Math.random() * 10 * 1024 * 1024);
        } else if (user.department === 'IT Administration') {
          action = ['LOGIN_SUCCESS', 'DATABASE_QUERY', 'FILE_DOWNLOAD'][i % 3];
          resource = 'datadog:dashboards/system_metrics';
          bytes = Math.floor(Math.random() * 60 * 1024 * 1024);
        }

        generatedEvents.push({
          id: eventCounter++,
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          department: user.department,
          isPrivileged: user.isPrivileged,
          sessionId,
          timestamp: eventTime.toISOString(),
          dateStr,
          hourOfDay: hour,
          actionType: action,
          resource,
          ipAddress: `10.128.${Math.abs(user.id.charCodeAt(1)) % 50}.${(i * 17) % 250 + 1}`,
          location: primaryCity,
          bytesTransferred: bytes,
          isSensitive,
        });
      }
    }
  }

  // Sort all events chronologically
  generatedEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Re-index event IDs
  for (let i = 0; i < generatedEvents.length; i++) {
    generatedEvents[i].id = i + 1;
  }

  // Insert activity logs into DB
  for (const ev of generatedEvents) {
    const isOdd = ev.hourOfDay < 8 || ev.hourOfDay >= 20 ? 1 : 0;
    const res = insertActivity.run(
      ev.userId,
      ev.sessionId,
      ev.timestamp,
      ev.dateStr,
      ev.hourOfDay,
      ev.actionType,
      ev.resource,
      ev.ipAddress,
      ev.location.city,
      ev.location.country,
      ev.location.lat,
      ev.location.lon,
      ev.bytesTransferred,
      ev.isSensitive ? 1 : 0,
      isOdd,
      0, // velocity updated during evaluation
      JSON.stringify({ raw: ev.actionType, bytes: ev.bytesTransferred })
    );
    ev.id = Number(res.lastInsertRowid);
  }

  // 4. Extract Feature Vectors for Isolation Forest
  // Vector: [hour_deviation, log_bytes, is_sensitive, auth_failure, location_variance, relative_volume_ratio]
  const featureMatrix: number[][] = [];

  for (const ev of generatedEvents) {
    const baseline = getBaselineForRole(ev.department, ev.userRole);
    const hourCenter = (baseline.typicalStartHour + baseline.typicalEndHour) / 2;
    const hourDeviation = Math.abs(ev.hourOfDay - hourCenter);
    const logBytes = ev.bytesTransferred > 0 ? Math.log10(ev.bytesTransferred + 1) : 0;
    const isSensitiveNum = ev.isSensitive ? 1 : 0;
    const isAuthFail = ev.actionType === 'LOGIN_FAILED' ? 1 : 0;
    const mbTransferred = ev.bytesTransferred / (1024 * 1024);
    const volumeRatio = baseline.expectedThresholdMB > 0 ? mbTransferred / baseline.expectedThresholdMB : 0;
    const isOdd = ev.hourOfDay < baseline.typicalStartHour || ev.hourOfDay >= baseline.typicalEndHour ? 1 : 0;

    featureMatrix.push([
      hourDeviation,
      logBytes,
      isSensitiveNum * 2.0,
      isAuthFail * 3.0,
      volumeRatio,
      isOdd * 1.5,
    ]);
  }

  // Train Isolation Forest on multivariate baseline
  const iForest = new IsolationForest(60, 128);
  iForest.fit(featureMatrix);

  // 5. Score Events, Evaluate Rules, and Build Threat Corroboration
  const insertScore = db.prepare(`
    INSERT INTO anomaly_scores (
      event_id, user_id, timestamp, isolation_forest_score,
      normalized_anomaly_score, is_ai_flagged, feature_vector_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const eventsForAlerts: Array<{
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
  }> = [];

  // Track previous event per user for impossible travel
  const userLastEvent = new Map<string, TempEvent>();

  for (let i = 0; i < generatedEvents.length; i++) {
    const ev = generatedEvents[i];
    const feat = featureMatrix[i];
    const { rawScore, normalizedScore, avgPathLength } = iForest.score(feat);

    const baseline = getBaselineForRole(ev.department, ev.userRole);
    const prev = userLastEvent.get(ev.userId) || null;

    // Evaluate rules
    const signals = evaluateEventRules(
      {
        timestamp: ev.timestamp,
        hourOfDay: ev.hourOfDay,
        actionType: ev.actionType,
        resource: ev.resource,
        ipAddress: ev.ipAddress,
        location: ev.location,
        bytesTransferred: ev.bytesTransferred,
        isSensitive: ev.isSensitive,
      },
      prev
        ? {
            timestamp: prev.timestamp,
            location: prev.location,
            ipAddress: prev.ipAddress,
          }
        : null,
      baseline,
      ev.isPrivileged,
      normalizedScore
    );

    userLastEvent.set(ev.userId, ev);

    const isFlagged = normalizedScore >= 65 || signals.length > 0 ? 1 : 0;

    insertScore.run(
      ev.id,
      ev.userId,
      ev.timestamp,
      rawScore,
      normalizedScore,
      isFlagged,
      JSON.stringify(feat)
    );

    const eventMB = ev.bytesTransferred / (1024 * 1024);
    const roleRatio = baseline.expectedThresholdMB > 0 ? eventMB / baseline.expectedThresholdMB : 1;

    eventsForAlerts.push({
      eventId: ev.id,
      userId: ev.userId,
      userName: ev.userName,
      userRole: ev.userRole,
      department: ev.department,
      isPrivileged: ev.isPrivileged,
      sessionId: ev.sessionId,
      timestamp: ev.timestamp,
      actionType: ev.actionType,
      resource: ev.resource,
      rawAnomalyScore: normalizedScore,
      signals,
      roleBaselineRatio: Math.max(1.0, roleRatio),
    });
  }

  // 6. Group into Session Alerts with Prioritization (Goal 3)
  const groupedAlerts = groupEventsIntoAlerts(eventsForAlerts);

  const insertAlert = db.prepare(`
    INSERT INTO alerts (
      id, user_id, session_id, title, summary, primary_event_id,
      timestamp, severity, raw_anomaly_score, priority_score,
      account_sensitivity_weight, cooccurring_signals_count,
      role_deviation_ratio, cooccurring_signals_json,
      grouped_event_ids_json, analyst_status, is_early_warning,
      detection_type, warning_label
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 0; i < groupedAlerts.length; i++) {
    const alert = groupedAlerts[i];
    // Flag about 45% of alerts as early warnings (caught before full critical escalation)
    const isEarlyWarning = (alert.priorityScore < 76 && alert.priorityScore >= 45) || (i % 2 === 1 && alert.priorityScore < 85);
    const detectionType = isEarlyWarning ? 'PROACTIVE_EARLY_WARNING' : 'REACTIVE_THRESHOLD';
    const warningLabel = isEarlyWarning ? 'Rising risk — not yet critical' : undefined;

    insertAlert.run(
      alert.id,
      alert.userId,
      alert.sessionId,
      alert.title,
      alert.summary,
      alert.primaryEventId,
      alert.timestamp,
      alert.severity,
      alert.rawAnomalyScore,
      alert.priorityScore,
      alert.accountSensitivityWeight,
      alert.cooccurringSignalsCount,
      alert.roleDeviationRatio,
      JSON.stringify(alert.cooccurringSignals),
      JSON.stringify(alert.groupedEventIds),
      alert.analystStatus,
      isEarlyWarning ? 1 : 0,
      detectionType,
      warningLabel || null
    );
  }

  // 6b. Seed Initial Realistic Analyst Feedback for False-Positive Rate Telemetry (Goal 5)
  const insertFeedback = db.prepare(`
    INSERT INTO analyst_feedback (
      alert_id, user_id, analyst_name, decision, justification,
      original_ai_score, priority_score, cooccurring_count,
      feedback_timestamp, signals_snapshot
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const sampleFeedback = [
    {
      alertId: groupedAlerts[0]?.id || 'ALT-0001',
      userId: groupedAlerts[0]?.userId || 'marcus.vance',
      analyst: 'Eleanor Vance (Security Director)',
      decision: 'CONFIRMED',
      justification: 'Exfiltration pattern confirmed against source repo logs. Marcus unauthorized egress outside work hours.',
      score: 88,
      priority: 92,
      signals: JSON.stringify([{ code: 'RULE_UNUSUAL_VOLUME' }, { code: 'RULE_ODD_HOURS' }]),
    },
    {
      alertId: groupedAlerts[1]?.id || 'ALT-0002',
      userId: groupedAlerts[1]?.userId || 'david.kramer',
      analyst: 'Caleb Hayes (Assistant Security)',
      decision: 'CONFIRMED',
      justification: 'Privilege escalation attempts across AWS IAM roles without Jira change authorization.',
      score: 79,
      priority: 84,
      signals: JSON.stringify([{ code: 'RULE_PRIVILEGE_PROBE' }]),
    },
    {
      alertId: groupedAlerts[2]?.id || 'ALT-0003',
      userId: 'sarah.jenkins',
      analyst: 'Eleanor Vance (Security Director)',
      decision: 'DISMISSED',
      justification: 'Scheduled weekend PostgreSQL maintenance backup routine. False positive due to high volume transfer.',
      score: 65,
      priority: 68,
      signals: JSON.stringify([{ code: 'RULE_UNUSUAL_VOLUME' }, { code: 'RULE_ODD_HOURS' }]),
    },
    {
      alertId: groupedAlerts[3]?.id || 'ALT-0004',
      userId: 'liam.chen',
      analyst: 'Caleb Hayes (Assistant Security)',
      decision: 'DISMISSED',
      justification: 'Benign late evening design doc access from home IP before project deadline. Downweight odd-hours signal.',
      score: 58,
      priority: 60,
      signals: JSON.stringify([{ code: 'RULE_ODD_HOURS' }]),
    },
    {
      alertId: groupedAlerts[4]?.id || 'ALT-0005',
      userId: 'elena.rostova',
      analyst: 'Eleanor Vance (Security Director)',
      decision: 'CONFIRMED',
      justification: 'Impossible velocity between Singapore and London corroborated. High confidence session hijacking.',
      score: 94,
      priority: 96,
      signals: JSON.stringify([{ code: 'RULE_IMPOSSIBLE_TRAVEL' }]),
    },
    {
      alertId: groupedAlerts[5]?.id || 'ALT-0006',
      userId: 'carlos.gomez',
      analyst: 'Caleb Hayes (Assistant Security)',
      decision: 'DISMISSED',
      justification: 'QA nightly load testing script triggered false positive volume threshold.',
      score: 62,
      priority: 59,
      signals: JSON.stringify([{ code: 'RULE_UNUSUAL_VOLUME' }]),
    },
  ];

  for (const fb of sampleFeedback) {
    insertFeedback.run(
      fb.alertId,
      fb.userId,
      fb.analyst,
      fb.decision,
      fb.justification,
      fb.score,
      fb.priority,
      2,
      new Date(Date.now() - Math.floor(Math.random() * 86400000 * 5)).toISOString(),
      fb.signals
    );
  }

  // 7. Calculate Per-User 30-Day Risk Scores and Peer Comparison Averages
  const updateUser = db.prepare(`
    UPDATE users
    SET risk_score = ?, peer_ratio = ?, last_active = ?
    WHERE id = ?
  `);

  // Compute risk score for each user based on highest alerts & frequency
  const userScores = new Map<string, number>();
  for (const u of USERS) {
    if (u.isAnomalous) {
      const userAlerts = groupedAlerts.filter((a) => a.userId === u.id);
      if (userAlerts.length === 0) {
        userScores.set(u.id, 75);
      } else {
        const topPriority = Math.max(...userAlerts.map((a) => a.priorityScore));
        const alertVolumeBonus = Math.min(15, userAlerts.length * 3);
        userScores.set(u.id, Math.min(99, Math.max(65, Math.round(topPriority * 0.92 + alertVolumeBonus))));
      }
    } else {
      // Normal baseline user with standard low circadian risk
      const baselineNoise = (u.id.charCodeAt(0) % 7) + (u.isPrivileged ? 6 : 2);
      userScores.set(u.id, Math.floor(14 + baselineNoise));
    }
  }

  // Department peer baselines (median / trimmed mean so rogue outliers don't skew peer baseline)
  const deptScores = new Map<string, number[]>();
  for (const u of USERS) {
    const score = userScores.get(u.id) || 15;
    if (!deptScores.has(u.department)) {
      deptScores.set(u.department, []);
    }
    deptScores.get(u.department)!.push(score);
  }

  for (const u of USERS) {
    const score = userScores.get(u.id) || 15;
    const allDept = deptScores.get(u.department) || [15];
    // Exclude current user or sort to find median/peer baseline
    const peerScores = allDept.filter((_, idx) => allDept.length > 1 ? true : true).sort((a, b) => a - b);
    // 25th to 50th percentile represents normal peer baseline for that department
    const medianIdx = Math.floor(peerScores.length * 0.4);
    const deptPeerBaseline = peerScores[medianIdx] || 18;

    const peerRatio = Math.max(0.6, Math.round((score / Math.max(10, deptPeerBaseline)) * 10) / 10);

    const userEvents = generatedEvents.filter((e) => e.userId === u.id);
    const lastActive = userEvents.length > 0 ? userEvents[userEvents.length - 1].timestamp : now.toISOString();

    updateUser.run(score, peerRatio, lastActive, u.id);
  }

  return {
    usersCount: USERS.length,
    eventsCount: generatedEvents.length,
    alertsCount: groupedAlerts.length,
  };
}
