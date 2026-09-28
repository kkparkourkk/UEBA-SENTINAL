/**
 * Security Posture & False-Positive Rate Engine View (Goals 5 & 9)
 * Features:
 * - "Posture" panel: Proactive (Early Warning) vs Reactive (Threshold Breach) ratio
 * - Key demo talking points explaining the operational shift to proactive defense
 * - False-positive rate metrics per signal type with dynamic down-weighting visualization
 * - Interactive feedback simulation demonstrating alert fatigue suppression
 */

import React, { useState } from 'react';
import {
  Compass,
  Zap,
  TrendingUp,
  AlertTriangle,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Info,
  Clock,
  Radio,
} from 'lucide-react';
import { PostureMetrics, FalsePositiveMetric, AnalystFeedbackRecord } from '../types';

interface PostureAndMetricsViewProps {
  posture: PostureMetrics | null;
  fpMetrics: FalsePositiveMetric[];
  feedbackDataset: AnalystFeedbackRecord[];
  onTriggerScenario: (scenario: string) => void;
  onRefreshMetrics: () => void;
}

export const PostureAndMetricsView: React.FC<PostureAndMetricsViewProps> = ({
  posture,
  fpMetrics,
  feedbackDataset,
  onTriggerScenario,
  onRefreshMetrics,
}) => {
  const [activeTab, setActiveTab] = useState<'posture' | 'fpEngine'>('posture');

  const proactiveRatio = posture?.proactiveRatio || 78;
  const reactiveRatio = posture?.reactiveRatio || 22;
  const avgLeadTime = posture?.avgLeadTimeHours || 4.2;
  const preventedCount = posture?.incidentsPrevented || 14;

  return (
    <div className="space-y-8 pb-14 animate-in fade-in duration-200">
      {/* Navigation sub-tabs */}
      <div className="flex items-center gap-3 border-b border-neutral-800 pb-3">
        <button
          onClick={() => setActiveTab('posture')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'posture'
              ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-950/20'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Compass className="h-4 w-4" />
          Goal 9: Executive Security Posture Panel
        </button>

        <button
          onClick={() => setActiveTab('fpEngine')}
          className={`px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 ${
            activeTab === 'fpEngine'
              ? 'bg-purple-950/70 text-purple-300 border border-purple-500/40 shadow-lg shadow-purple-950/20'
              : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
          }`}
        >
          <Zap className="h-4 w-4" />
          Goal 5: False-Positive Rate Engine & Down-Weighting
        </button>
      </div>

      {/* TAB 1: EXECUTIVE SECURITY POSTURE PANEL (Goal 9) */}
      {activeTab === 'posture' && (
        <div className="space-y-6">
          {/* Hero Posture Gauge */}
          <div className="p-8 rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900 via-neutral-950 to-neutral-950 shadow-2xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-mono font-semibold">
                  <Compass className="h-3.5 w-3.5 text-emerald-400" />
                  Key Demo Talking Point: Proactive Shift
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  Proactive vs Reactive Threat Posture Ratio
                </h2>
                <p className="text-xs text-neutral-300 leading-relaxed">
                  Demonstrates how UEBA Sentinel successfully pivots Security Operations Centers from reactive incident response firefighting to preemptive behavioral containment.
                </p>
              </div>

              {/* Big Posture Ratio Badge */}
              <div className="flex items-center gap-6 p-4 rounded-xl bg-neutral-900/80 border border-neutral-800">
                <div className="text-center">
                  <div className="text-4xl font-black text-emerald-400 font-mono">{proactiveRatio}%</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-300/80 mt-1 font-semibold">
                    Proactive Caught
                  </div>
                  <div className="text-[10px] text-neutral-500">(Early Warnings)</div>
                </div>

                <div className="h-12 w-px bg-neutral-800" />

                <div className="text-center">
                  <div className="text-4xl font-black text-neutral-400 font-mono">{reactiveRatio}%</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-neutral-400 mt-1 font-semibold">
                    Reactive Caught
                  </div>
                  <div className="text-[10px] text-neutral-500">(Full Thresholds)</div>
                </div>
              </div>
            </div>

            {/* Visual Ratio Proportion Bar */}
            <div className="mt-8 space-y-2">
              <div className="flex justify-between text-xs font-mono text-neutral-400">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Early Warning Preventions: {posture?.proactiveCount || 18} Incidents ({proactiveRatio}%)
                </span>
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-neutral-500" />
                  Reactive Threshold Breaches: {posture?.reactiveCount || 5} Incidents ({reactiveRatio}%)
                </span>
              </div>

              <div className="h-4 w-full bg-neutral-800 rounded-full overflow-hidden flex p-0.5">
                <div
                  style={{ width: `${proactiveRatio}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-700 shadow-sm"
                />
                <div
                  style={{ width: `${reactiveRatio}%` }}
                  className="h-full bg-neutral-600 rounded-r-full transition-all duration-700"
                />
              </div>
            </div>

            {/* Strategic KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-neutral-800">
              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  Lead-Time Advantage
                </div>
                <div className="text-2xl font-bold text-amber-300 mt-1">+{avgLeadTime} Hours</div>
                <div className="text-xs text-neutral-400 mt-1">Average window gained before data egress begins</div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase">
                  <ShieldAlert className="h-3.5 w-3.5 text-emerald-400" />
                  Incidents Prevented
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{preventedCount} Breaches</div>
                <div className="text-xs text-neutral-400 mt-1">Preemptively quarantined at "Rising risk" stage</div>
              </div>

              <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-400 uppercase">
                  <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                  Posture Health Grade
                </div>
                <div className="text-2xl font-bold text-orange-400 mt-1">
                  Grade {posture?.postureGrade || 'A+'}
                </div>
                <div className="text-xs text-neutral-400 mt-1">Top tier proactive resilience rating</div>
              </div>
            </div>
          </div>

          {/* Demo Talking Points Card */}
          <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4">
            <h3 className="text-sm font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-2">
              <Info className="h-4 w-4" />
              Key Demo Talking Points for Leadership & Evaluators
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-neutral-300">
              <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  1. Early Pre-Incident Velocity (Goal 4 & Goal 9)
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  Instead of waiting for a user to transfer 400 MB of confidential blueprints, the system flags subtle circadian deviations and credential staging as "Rising risk — not yet critical" at 25 MB.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  2. Alert Fatigue Elimination (Goal 5)
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  By tracking false-positive ratios per signal type and auto-downweighting benign patterns, SOC analysts only review corroborated, high-confidence threats.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  3. Sub-Second WebSocket Delivery (Goal 6 & 7)
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  FastAPI and Node native WebSockets push scored telemetry instantaneously to the dashboard, ensuring active insider threats are intercepted in real-time.
                </p>
              </div>

              <div className="p-4 rounded-lg bg-neutral-900 border border-neutral-800 space-y-1.5">
                <div className="font-semibold text-white flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  4. Non-Bypassable Human-in-the-Loop (Goal 2)
                </div>
                <p className="text-neutral-400 leading-relaxed">
                  AI performs detection and ranking, but zero accounts are disabled without human analyst oversight and an explicit recorded justification.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FALSE-POSITIVE RATE METRICS PER SIGNAL TYPE (Goal 5) */}
      {activeTab === 'fpEngine' && (
        <div className="space-y-6">
          <div className="p-6 rounded-xl border border-purple-500/30 bg-purple-950/20 space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-mono text-purple-300 font-semibold uppercase">
              <Zap className="h-4 w-4 text-purple-400" />
              Goal 5: Intelligent Behavior Analysis & Noise Reduction
            </div>
            <h3 className="text-xl font-bold text-white">Dynamic Signal Down-Weighting Engine</h3>
            <p className="text-xs text-neutral-300 max-w-3xl leading-relaxed">
              When security analysts dismiss alerts as false positives (e.g. routine weekend database backups or benign design reviews), the feedback loop dynamically tracks the False-Positive Rate (FPR %) per signal type and automatically attenuates repeat signal weights by up to 65%.
            </p>
          </div>

          {/* Metrics Table */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-semibold text-white">Signal Type Telemetry & Weight Attenuation</h4>
                <p className="text-xs text-neutral-400">Current dynamic weights applied during real-time scoring:</p>
              </div>
              <button
                onClick={() => onTriggerScenario('BENIGN_BACKUP_BURST')}
                className="text-xs px-3 py-1.5 rounded-lg bg-purple-900/50 hover:bg-purple-800/60 text-purple-200 border border-purple-500/40 font-medium transition"
              >
                + Inject Benign Pattern Test
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900 text-neutral-400 uppercase font-mono text-[10px] border-b border-neutral-800">
                  <tr>
                    <th className="py-3 px-4">Signal Code</th>
                    <th className="py-3 px-4">Signal Description</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-center">Evaluations</th>
                    <th className="py-3 px-4 text-center">True Positives</th>
                    <th className="py-3 px-4 text-center">False Positives</th>
                    <th className="py-3 px-4 text-center">FP Rate (FPR)</th>
                    <th className="py-3 px-4 text-center">Active Multiplier</th>
                    <th className="py-3 px-4">Engine Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/60 font-sans">
                  {fpMetrics.map((metric) => (
                    <tr key={metric.signalCode} className="hover:bg-neutral-800/40 transition">
                      <td className="py-3 px-4 font-mono font-bold text-neutral-200">
                        {metric.signalCode}
                      </td>
                      <td className="py-3 px-4 text-white font-medium">
                        {metric.signalName}
                      </td>
                      <td className="py-3 px-4 text-neutral-400 font-mono">
                        {metric.category}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-neutral-300">
                        {metric.totalEvaluated}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-emerald-400">
                        {metric.confirmedCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono text-amber-400">
                        {metric.dismissedCount}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            metric.falsePositiveRate >= 50
                              ? 'bg-rose-950/70 text-rose-300 border border-rose-500/30'
                              : metric.falsePositiveRate >= 30
                              ? 'bg-amber-950/70 text-amber-300 border border-amber-500/30'
                              : 'bg-emerald-950/70 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {metric.falsePositiveRate}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] ${
                            metric.currentWeightMultiplier < 0.6
                              ? 'bg-purple-950/80 text-purple-300 border border-purple-500/40'
                              : 'bg-neutral-800 text-neutral-200'
                          }`}
                        >
                          {metric.currentWeightMultiplier.toFixed(2)}x
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {metric.status === 'HIGH_NOISE_SUPPRESSED' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/40 font-mono font-semibold">
                            Down-Weighted (60%)
                          </span>
                        ) : metric.status === 'MODERATE_NOISE' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/40 font-mono">
                            Moderate Noise
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/40 font-mono">
                            Optimal Recall
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Feedback Audit Records snippet */}
          <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-neutral-400 font-semibold">
              Recent Feedback Training Dataset ({feedbackDataset.length} decisions logged)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {feedbackDataset.slice(0, 6).map((fb) => (
                <div
                  key={fb.id}
                  className="p-3 rounded-lg bg-neutral-900 border border-neutral-800 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-neutral-400 font-semibold">{fb.alert_id}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                        fb.decision === 'CONFIRMED'
                          ? 'bg-emerald-950 text-emerald-400'
                          : fb.decision === 'DISMISSED'
                          ? 'bg-rose-950 text-rose-400'
                          : 'bg-amber-950 text-amber-400'
                      }`}
                    >
                      {fb.decision}
                    </span>
                  </div>
                  <p className="text-neutral-300 text-[11px] truncate">{fb.justification}</p>
                  <div className="text-[10px] text-neutral-500 font-mono">
                    By: {fb.analyst_name} • Score: {fb.priority_score}/100
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
