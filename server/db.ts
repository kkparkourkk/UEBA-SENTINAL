/**
 * SQLite Database initialization & repository using Node 22 native DatabaseSync
 */

import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';

const DB_PATH = path.join(process.cwd(), 'ueba.sqlite');

let dbInstance: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!dbInstance) {
    dbInstance = new DatabaseSync(DB_PATH);
    initSchema(dbInstance);
  }
  return dbInstance;
}

function initSchema(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT NOT NULL,
      is_privileged INTEGER NOT NULL DEFAULT 0,
      risk_score REAL NOT NULL DEFAULT 10,
      peer_ratio REAL NOT NULL DEFAULT 1.0,
      avatar_color TEXT,
      last_active TEXT
    );

    CREATE TABLE IF NOT EXISTS role_baselines (
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      typical_start_hour INTEGER NOT NULL,
      typical_end_hour INTEGER NOT NULL,
      mean_daily_events REAL NOT NULL,
      std_daily_events REAL NOT NULL,
      mean_daily_bytes_mb REAL NOT NULL,
      std_daily_bytes_mb REAL NOT NULL,
      expected_threshold_mb REAL NOT NULL,
      PRIMARY KEY (department, role)
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      date_str TEXT NOT NULL,
      hour_of_day INTEGER NOT NULL,
      action_type TEXT NOT NULL,
      resource TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      location_city TEXT NOT NULL,
      location_country TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      bytes_transferred INTEGER NOT NULL DEFAULT 0,
      is_sensitive_resource INTEGER NOT NULL DEFAULT 0,
      is_odd_hour INTEGER NOT NULL DEFAULT 0,
      travel_speed_kmh REAL NOT NULL DEFAULT 0,
      raw_event_json TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS anomaly_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      isolation_forest_score REAL NOT NULL,
      normalized_anomaly_score REAL NOT NULL,
      is_ai_flagged INTEGER NOT NULL DEFAULT 0,
      feature_vector_json TEXT,
      FOREIGN KEY (event_id) REFERENCES activity_logs(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      session_id TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      primary_event_id INTEGER NOT NULL,
      timestamp TEXT NOT NULL,
      severity TEXT NOT NULL,
      raw_anomaly_score REAL NOT NULL,
      priority_score REAL NOT NULL,
      account_sensitivity_weight REAL NOT NULL,
      cooccurring_signals_count INTEGER NOT NULL,
      role_deviation_ratio REAL NOT NULL,
      cooccurring_signals_json TEXT NOT NULL,
      grouped_event_ids_json TEXT NOT NULL,
      analyst_status TEXT NOT NULL DEFAULT 'PENDING',
      analyst_notes TEXT,
      analyst_decision_time TEXT,
      is_early_warning INTEGER NOT NULL DEFAULT 0,
      detection_type TEXT NOT NULL DEFAULT 'REACTIVE',
      warning_label TEXT,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS analyst_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      analyst_name TEXT NOT NULL,
      decision TEXT NOT NULL,
      justification TEXT NOT NULL,
      original_ai_score REAL NOT NULL,
      priority_score REAL NOT NULL,
      cooccurring_count INTEGER NOT NULL,
      feedback_timestamp TEXT NOT NULL,
      signals_snapshot TEXT,
      FOREIGN KEY (alert_id) REFERENCES alerts(id)
    );

    CREATE TABLE IF NOT EXISTS hmw_questions (
      id TEXT PRIMARY KEY,
      question TEXT NOT NULL,
      contributor TEXT NOT NULL,
      theme TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'IMPLEMENTED',
      target_goal TEXT NOT NULL,
      solution_summary TEXT NOT NULL,
      votes INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS live_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_role TEXT NOT NULL,
      department TEXT NOT NULL,
      action_type TEXT NOT NULL,
      resource TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      bytes_transferred INTEGER NOT NULL,
      anomaly_score REAL NOT NULL,
      priority_score REAL NOT NULL,
      is_early_warning INTEGER NOT NULL DEFAULT 0,
      is_threat INTEGER NOT NULL DEFAULT 0,
      warning_label TEXT,
      signals_json TEXT,
      scenario_tag TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_activity_user_time ON activity_logs (user_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_activity_date ON activity_logs (date_str);
    CREATE INDEX IF NOT EXISTS idx_alerts_priority ON alerts (priority_score DESC);
    CREATE INDEX IF NOT EXISTS idx_live_events_time ON live_events (timestamp DESC);
  `);

  // Safely ensure migration columns exist if db was created earlier
  try { db.exec("ALTER TABLE alerts ADD COLUMN is_early_warning INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE alerts ADD COLUMN detection_type TEXT NOT NULL DEFAULT 'REACTIVE'"); } catch (_) {}
  try { db.exec("ALTER TABLE alerts ADD COLUMN warning_label TEXT"); } catch (_) {}
}

export function resetDatabaseFile(): void {
  if (dbInstance) {
    try {
      dbInstance.close();
    } catch (e) {
      // ignore
    }
    dbInstance = null;
  }
  if (fs.existsSync(DB_PATH)) {
    try {
      fs.unlinkSync(DB_PATH);
    } catch (e) {
      // ignore
    }
  }
  getDb();
}
