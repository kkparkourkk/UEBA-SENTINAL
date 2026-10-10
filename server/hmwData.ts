/**
 * Pre-seeded HMW (How Might We) Questions Matrix
 * Directly mapping design thinking questions from team contributors:
 * - Shriram
 * - Arshinth
 * - Keshav
 * - Alfred
 *
 * Each question links to a concrete architecture pillar & functional view in UEBA Sentinel.
 */

import { getDb } from './db.js';

export interface HMWQuestion {
  id: string;
  question: string;
  contributor: 'Shriram' | 'Arshinth' | 'Keshav' | 'Alfred';
  theme: string;
  status: 'IMPLEMENTED' | 'IN_PRODUCTION' | 'ACTIVE_MONITORING';
  target_goal: string;
  solution_summary: string;
  votes: number;
  created_at: string;
}

export const SEEDED_HMW_QUESTIONS: HMWQuestion[] = [
  {
    id: 'HMW-01',
    question: 'How might we unify risk scores, behavior trends, and account activity into one cohesive view so analysts don\'t have to pivot across disparate tools?',
    contributor: 'Keshav',
    theme: 'Unified Telemetry & Correlation',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 1: Unified View',
    solution_summary: 'Created single-pane user dossier combining 30-day circadian baselines, peer department baseline ratios (e.g. 2.4x peer risk), and time-correlated raw activity logs in one synchronized view.',
    votes: 24,
    created_at: '2026-09-15T09:30:00Z',
  },
  {
    id: 'HMW-02',
    question: 'How might we use AI-driven anomaly detection to uncover subtle deviations while keeping the human analyst firmly in control of all containment decisions?',
    contributor: 'Alfred',
    theme: 'Explainable AI & Human Oversight',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 2: AI Detection + Human Control',
    solution_summary: 'Built "Why Was This Flagged?" threat corroboration panel with MITRE attack stage breakdown, Isolation Forest feature attribution, and non-bypassable analyst review & feedback loop dataset.',
    votes: 31,
    created_at: '2026-09-15T10:15:00Z',
  },
  {
    id: 'HMW-03',
    question: 'How might we make alert prioritization smarter and more automatic by factoring in account blast radius, co-occurring signals, and role deviations?',
    contributor: 'Keshav',
    theme: 'Risk-Based Prioritization',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 3: Smarter Alert Prioritization',
    solution_summary: 'Developed multi-factor prioritization engine weighing account blast radius (privileged multipliers 1.35x), signal co-occurrence confidence (+10 to +26 pts), and role volume deviations.',
    votes: 28,
    created_at: '2026-09-15T11:00:00Z',
  },
  {
    id: 'HMW-04',
    question: 'How might we detect unusual user behavior before it becomes a security incident through early risk-trend velocity and lead indicators?',
    contributor: 'Shriram',
    theme: 'Early Warning & Velocity',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 4: Early Pre-Incident Warning',
    solution_summary: 'Engineered real-time Early Warning indicator flagging "Rising risk — not yet critical" when users exhibit rising behavioral drift (scores 45-74) before crossing full critical thresholds, yielding up to 4.2 hours lead time.',
    votes: 37,
    created_at: '2026-09-20T14:20:00Z',
  },
  {
    id: 'HMW-05',
    question: 'How might we reduce false positives using intelligent behavior analysis and an analyst feedback loop that auto-downweights benign patterns?',
    contributor: 'Arshinth',
    theme: 'Noise Reduction & Dynamic ML',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 5: False Positive Reduction',
    solution_summary: 'Created per-signal false-positive rate metrics (FPR %) powered by analyst dismissals. The engine dynamically penalizes repeat false-positive signal weights (down to 0.35x), suppressing alert fatigue.',
    votes: 42,
    created_at: '2026-09-20T14:45:00Z',
  },
  {
    id: 'HMW-06',
    question: 'How might we provide security teams with sub-second real-time threat detection instead of waiting for delayed batch log processing?',
    contributor: 'Shriram',
    theme: 'Real-Time Architecture',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 6: Real-Time Detection',
    solution_summary: 'Implemented native WebSocket event layer (`/ws`) with immediate per-event scoring that pushes live evaluated telemetry and escalated alerts directly to analyst consoles in <50ms.',
    votes: 35,
    created_at: '2026-09-22T08:10:00Z',
  },
  {
    id: 'HMW-07',
    question: 'How might we detect insider threats in real time as privileges are abused, credential anomalies occur, or exfiltration begins?',
    contributor: 'Arshinth',
    theme: 'Insider Threat Defense',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 7: Real-Time Insider Threats',
    solution_summary: 'Integrated real-time behavioral correlation for impossible geographic travel (>900 km/h), off-hours sensitive data staging, and privilege probes across active user sessions.',
    votes: 39,
    created_at: '2026-09-22T09:00:00Z',
  },
  {
    id: 'HMW-08',
    question: 'How might we identify unusual user behavior automatically across high-dimensional telemetry without brittle hardcoded rules?',
    contributor: 'Shriram',
    theme: 'Unsupervised Behavioral AI',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 8: Automatic Anomaly Identification',
    solution_summary: 'Coupled scikit-learn compatible Multivariate Isolation Forest scoring (hour deviation, bytes, sensitive resource, auth failure, peer deviation) with continuous unsupervised model calibration.',
    votes: 29,
    created_at: '2026-09-22T10:30:00Z',
  },
  {
    id: 'HMW-09',
    question: 'How might we shift security operations from reactive firefighting to proactive threat posture tracking and pre-emptive remediation?',
    contributor: 'Arshinth',
    theme: 'Proactive Security Posture',
    status: 'IMPLEMENTED',
    target_goal: 'Goal 9: Reactive to Proactive Shift',
    solution_summary: 'Built executive Security Posture panel calculating the Proactive-to-Reactive ratio (e.g. 78% caught via early warning vs 22% reactive thresholds), serving as the central demo talking point.',
    votes: 45,
    created_at: '2026-09-24T16:00:00Z',
  },
];

export function ensureHmwQuestionsSeeded(): void {
  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(*) as count FROM hmw_questions').get() as { count: number };
  if (!countRow || countRow.count === 0) {
    const insertHmw = db.prepare(`
      INSERT INTO hmw_questions (
        id, question, contributor, theme, status, target_goal, solution_summary, votes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (const q of SEEDED_HMW_QUESTIONS) {
      insertHmw.run(
        q.id,
        q.question,
        q.contributor,
        q.theme,
        q.status,
        q.target_goal,
        q.solution_summary,
        q.votes,
        q.created_at
      );
    }
  }
}
