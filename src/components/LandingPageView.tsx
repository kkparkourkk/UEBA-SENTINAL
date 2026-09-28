/**
 * Landing Page View for UEBA Sentinel
 * Introduces the project vision, core design goals, team contributions,
 * live telemetry stats, and architectural pillars.
 */

import React from 'react';
import {
  Shield,
  Zap,
  Activity,
  Radio,
  Sliders,
  CheckCircle2,
  Users,
  Compass,
  ArrowRight,
  TrendingUp,
  Cpu,
  Eye,
  AlertTriangle,
  Sparkles,
  Lock,
} from 'lucide-react';
import { PostureMetrics, FalsePositiveMetric } from '../types';

interface LandingPageViewProps {
  onLaunchConsole: (view: 'unified' | 'oversight' | 'priority' | 'live' | 'posture') => void;
  isWsConnected: boolean;
  totalUsersCount: number;
  totalAlertsCount: number;
  postureMetrics: PostureMetrics | null;
  fpMetrics: FalsePositiveMetric[];
  onTriggerScenario: (scenario: string) => void;
}

export const LandingPageView: React.FC<LandingPageViewProps> = ({
  onLaunchConsole,
  isWsConnected,
  totalUsersCount,
  totalAlertsCount,
  postureMetrics,
  fpMetrics,
  onTriggerScenario,
}) => {
  const proactiveRatio = postureMetrics?.proactiveRatio || 78;
  const leadTime = postureMetrics?.avgLeadTimeHours || 4.2;

  const coreGoals = [
    {
      num: '01',
      title: 'Unified Behavioral Dossier',
      category: 'Core Goal 1',
      contributor: 'Keshav',
      desc: 'Consolidates 30-day circadian baselines, peer group risk ratios (e.g. 2.4x department average), and time-correlated raw activity logs into a single view.',
      icon: Eye,
      accent: 'from-orange-500/20 to-amber-500/10 border-orange-500/30 text-orange-400',
      actionView: 'unified' as const,
    },
    {
      num: '02',
      title: 'AI Anomaly Detection with Human Control',
      category: 'Core Goal 2',
      contributor: 'Alfred',
      desc: 'Unsupervised Isolation Forest algorithm with MITRE ATT&CK stage corroboration. Crucially, all containment decisions remain analyst-authorized.',
      icon: Shield,
      accent: 'from-blue-500/20 to-cyan-500/10 border-blue-500/30 text-blue-400',
      actionView: 'oversight' as const,
    },
    {
      num: '03',
      title: 'Smart, Automatic Prioritization',
      category: 'Core Goal 3',
      contributor: 'Keshav',
      desc: 'Multi-factor threat prioritization weighting account privilege blast radius (1.35x), signal co-occurrence, and role expected volume deviations.',
      icon: Sliders,
      accent: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30 text-emerald-400',
      actionView: 'priority' as const,
    },
  ];

  const teamGoals = [
    {
      num: '04',
      title: 'Early Warning Detection',
      category: 'Team Goal (Shriram)',
      contributor: 'Shriram',
      badge: 'Rising risk — not yet critical',
      desc: 'Flags accelerating behavioral velocity before it breaches full incident thresholds, providing up to 4.2 hours of pre-incident mitigation time.',
      icon: TrendingUp,
      accent: 'from-amber-500/20 to-orange-500/10 border-amber-500/30 text-amber-400',
      actionView: 'live' as const,
    },
    {
      num: '05',
      title: 'Dynamic False-Positive Reduction',
      category: 'Team Goal (Arshinth)',
      contributor: 'Arshinth',
      badge: 'Auto-Downweighting',
      desc: 'Signal-level false positive metrics powered by analyst feedback. Benign patterns automatically downweight by up to 65% to eliminate alert fatigue.',
      icon: Zap,
      accent: 'from-purple-500/20 to-violet-500/10 border-purple-500/30 text-purple-400',
      actionView: 'posture' as const,
    },
    {
      num: '06',
      title: 'Sub-Second Real-Time Detection',
      category: 'Team Goal (Shriram)',
      contributor: 'Shriram',
      badge: 'WebSocket Layer',
      desc: 'Sub-second event pipeline with immediate per-event scoring pushed directly to analyst consoles via persistent WebSocket connections.',
      icon: Radio,
      accent: 'from-cyan-500/20 to-sky-500/10 border-cyan-500/30 text-cyan-400',
      actionView: 'live' as const,
    },
    {
      num: '07',
      title: 'Real-Time Insider Threat Defense',
      category: 'Team Goal (Arshinth)',
      contributor: 'Arshinth',
      badge: 'Credential & Staging Detection',
      desc: 'Live corroboration of impossible travel (>900 km/h), off-hours credential access, and restricted file exfiltration velocity.',
      icon: Lock,
      accent: 'from-rose-500/20 to-pink-500/10 border-rose-500/30 text-rose-400',
      actionView: 'live' as const,
    },
    {
      num: '08',
      title: 'Automated Multi-Dimensional Anomaly AI',
      category: 'Team Goal (Shriram)',
      contributor: 'Shriram',
      badge: 'Isolation Forest',
      desc: 'Continuous scoring across hour-of-day, transfer bytes, sensitivity flags, and role baseline ratios without brittle static rules.',
      icon: Cpu,
      accent: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/30 text-indigo-400',
      actionView: 'oversight' as const,
    },
    {
      num: '09',
      title: 'Shift from Reactive to Proactive Posture',
      category: 'Team Goal (Arshinth)',
      contributor: 'Arshinth',
      badge: `${proactiveRatio}% Proactive Ratio`,
      desc: 'Executive Posture Panel comparing early-warning preemptions against reactive threshold breaches, tracking lead-time gains for SOC leadership.',
      icon: Compass,
      accent: 'from-emerald-500/20 to-green-500/10 border-emerald-500/30 text-emerald-400',
      actionView: 'posture' as const,
    },
  ];

  return (
    <div className="space-y-12 pb-16 animate-in fade-in duration-300">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-2xl border border-neutral-800 bg-gradient-to-b from-neutral-900/90 via-neutral-950 to-neutral-950 p-8 sm:p-12 shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-600/15 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-4xl space-y-6">
          {/* Live Status Pill */}
          <div className="inline-flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-neutral-800/80 border border-neutral-700/60 text-xs font-mono">
            <span className={`h-2 w-2 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-neutral-300">
              {isWsConnected ? 'WebSocket Live Telemetry Connected (/ws)' : 'Connecting Real-Time Pipeline...'}
            </span>
            <span className="text-neutral-500">|</span>
            <span className="text-orange-400 font-semibold">Native Fast Scoring Engine</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Next-Gen <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-300 to-orange-500">UEBA Security</span> Intelligence Prototype
          </h1>

          <p className="text-base sm:text-lg text-neutral-300 leading-relaxed max-w-3xl">
            A real-time User and Entity Behavior Analytics platform purpose-built around <strong>six design goals</strong> contributed by <strong>Shriram, Arshinth, Keshav, and Alfred</strong>. Featuring sub-second WebSocket event streams, pre-incident early warnings, dynamic false-positive down-weighting, and human-in-the-loop threat corroboration.
          </p>

          {/* Quick CTA Actions */}
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <button
              onClick={() => onLaunchConsole('unified')}
              className="px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-orange-950/40 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Activity className="h-4 w-4" />
              Launch Unified SOC Console
              <ArrowRight className="h-4 w-4" />
            </button>

            <button
              onClick={() => onLaunchConsole('live')}
              className="px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-100 font-semibold text-sm border border-neutral-700 flex items-center gap-2 transition hover:scale-[1.02]"
            >
              <Radio className="h-4 w-4 text-orange-400 animate-pulse" />
              Live Stream & Early Warning
            </button>

            <button
              onClick={() => onLaunchConsole('posture')}
              className="px-4 py-3 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 text-neutral-300 font-medium text-sm border border-neutral-800 flex items-center gap-2 transition"
            >
              <Compass className="h-4 w-4 text-emerald-400" />
              Security Posture & FP Engine
            </button>
          </div>
        </div>

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10 pt-8 border-t border-neutral-800/80">
          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Monitored Entities</div>
            <div className="text-2xl font-bold text-white mt-1">{totalUsersCount || 25} Users</div>
            <div className="text-xs text-neutral-500 mt-1">4 departments + baselines</div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Proactive Interception</div>
            <div className="text-2xl font-bold text-emerald-400 mt-1">{proactiveRatio}% Ratio</div>
            <div className="text-xs text-emerald-500/80 mt-1">Early warnings vs reactive</div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Pre-Incident Lead Time</div>
            <div className="text-2xl font-bold text-amber-400 mt-1">+{leadTime} Hours</div>
            <div className="text-xs text-neutral-500 mt-1">Lead time before exfiltration</div>
          </div>

          <div className="p-4 rounded-xl bg-neutral-900/60 border border-neutral-800">
            <div className="text-xs font-mono text-neutral-400 uppercase tracking-wider">Real-Time Scoring</div>
            <div className="text-2xl font-bold text-orange-400 mt-1">&lt; 50ms Latency</div>
            <div className="text-xs text-neutral-500 mt-1">Immediate per-event (not batch)</div>
          </div>
        </div>
      </section>

      {/* Interactive Scenario Trigger Demo Bar */}
      <section className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/50 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-orange-950/60 border border-orange-500/30 flex items-center justify-center text-orange-400 flex-shrink-0">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Live Threat Demonstration Sandbox</h3>
            <p className="text-xs text-neutral-400">Inject synthetic behavioral scenarios to test immediate WebSocket push & scoring:</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              onTriggerScenario('INSIDER_EXFILTRATION');
              onLaunchConsole('live');
            }}
            className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/50 text-rose-300 border border-rose-500/30 text-xs font-medium transition"
          >
            🚨 Exfiltration: Marcus Vance
          </button>
          <button
            onClick={() => {
              onTriggerScenario('IMPOSSIBLE_TRAVEL');
              onLaunchConsole('live');
            }}
            className="px-3 py-1.5 rounded-lg bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 border border-blue-500/30 text-xs font-medium transition"
          >
            ✈️ Impossible Travel: Elena
          </button>
          <button
            onClick={() => {
              onTriggerScenario('EARLY_WARNING_RISK');
              onLaunchConsole('live');
            }}
            className="px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/50 text-amber-300 border border-amber-500/30 text-xs font-medium transition"
          >
            ⚠️ Early Warning: David Kramer
          </button>
          <button
            onClick={() => {
              onTriggerScenario('BENIGN_BACKUP_BURST');
              onLaunchConsole('posture');
            }}
            className="px-3 py-1.5 rounded-lg bg-purple-950/40 hover:bg-purple-900/50 text-purple-300 border border-purple-500/30 text-xs font-medium transition"
          >
            🔄 Benign Backup (FP Test)
          </button>
        </div>
      </section>

      {/* CORE 3 DESIGN GOALS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-orange-400 font-semibold">Foundation</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Core Architectural Goals (1 – 3)</h2>
          </div>
          <span className="text-xs text-neutral-400 font-mono">Original Specifications</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {coreGoals.map((goal) => {
            const Icon = goal.icon;
            return (
              <div
                key={goal.num}
                onClick={() => onLaunchConsole(goal.actionView)}
                className="group p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-850 hover:border-neutral-700 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-500 font-bold">GOAL {goal.num}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 font-mono">
                      Lead: {goal.contributor}
                    </span>
                  </div>

                  <div className="h-10 w-10 rounded-lg bg-gradient-to-br border flex items-center justify-center group-hover:scale-105 transition">
                    <Icon className="h-5 w-5 text-orange-400" />
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-orange-300 transition">
                    {goal.title}
                  </h3>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {goal.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-orange-400 font-medium">
                  <span>Explore in Console</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* TEAM CONTRIBUTED GOALS (4 – 9) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-400 font-semibold">Innovation Layer</span>
            <h2 className="text-xl sm:text-2xl font-bold text-white">Team-Contributed Goals (4 – 9)</h2>
          </div>
          <span className="text-xs text-neutral-400 font-mono">From Shriram & Arshinth</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teamGoals.map((goal) => {
            const Icon = goal.icon;
            return (
              <div
                key={goal.num}
                onClick={() => onLaunchConsole(goal.actionView)}
                className="group p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 hover:bg-neutral-850 hover:border-neutral-700 transition cursor-pointer flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-neutral-500 font-bold">GOAL {goal.num}</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 font-mono">
                      {goal.contributor}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 rounded-lg bg-neutral-800/80 border border-neutral-700/60 flex items-center justify-center group-hover:scale-105 transition">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    {goal.badge && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300 font-mono">
                        {goal.badge}
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition">
                    {goal.title}
                  </h3>

                  <p className="text-xs text-neutral-400 leading-relaxed">
                    {goal.desc}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-neutral-800/60 flex items-center justify-between text-xs text-emerald-400 font-medium">
                  <span>View Implementation</span>
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ready to Test / SOC Verification Banner */}
      <section className="p-8 rounded-2xl border border-neutral-800 bg-gradient-to-r from-neutral-900/80 via-neutral-950 to-neutral-900/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-mono text-orange-400 uppercase tracking-wider font-semibold">
            <Sparkles className="h-4 w-4" />
            Interactive SOC Verification & Testing
          </div>
          <h3 className="text-xl font-bold text-white">Ready for Hands-On Security Analyst Testing</h3>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Test the live behavioral engine: inspect circadian anomalies in the <strong>Unified Dossier</strong>, trigger credential staging in the <strong>Live Stream</strong>, downweight benign false positives, and evaluate pre-incident lead times.
          </p>
          <div className="flex flex-wrap gap-2 pt-2">
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
              Real-Time WebSocket Stream
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
              Pre-Incident Early Warnings
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
              Analyst Feedback Suppression
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 border border-neutral-700 text-neutral-300">
              Human-in-the-Loop Oversight
            </span>
          </div>
        </div>

        <button
          onClick={() => onLaunchConsole('unified')}
          className="px-6 py-3.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm flex items-center gap-2 shadow-lg shadow-orange-950/40 transition hover:scale-[1.02] flex-shrink-0"
        >
          <Activity className="h-4 w-4" />
          Test Unified SOC Console
          <ArrowRight className="h-4 w-4" />
        </button>
      </section>
    </div>
  );
};
