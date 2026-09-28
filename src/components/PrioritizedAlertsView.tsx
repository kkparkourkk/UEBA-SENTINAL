import React, { useState, useMemo } from 'react';
import {
  SlidersHorizontal,
  ArrowUpDown,
  Filter,
  Lock,
  Layers,
  ArrowUpRight,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Info,
  Calendar,
  Eye,
} from 'lucide-react';
import { AlertIncident } from '../types';

interface PrioritizedAlertsViewProps {
  alerts: AlertIncident[];
  onSelectAlertForCorroboration: (alertId: string) => void;
  onNavigateToUserUnified: (userId: string) => void;
}

export const PrioritizedAlertsView: React.FC<PrioritizedAlertsViewProps> = ({
  alerts,
  onSelectAlertForCorroboration,
  onNavigateToUserUnified,
}) => {
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [minPriority, setMinPriority] = useState<number>(40);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'priority' | 'raw_anomaly' | 'timestamp' | 'signals'>('priority');

  // Filter and sort the alerts
  const processedAlerts = useMemo(() => {
    return alerts
      .filter((alert) => {
        if (selectedDepartment !== 'ALL' && alert.department !== selectedDepartment) return false;
        if (selectedStatus !== 'ALL' && alert.analystStatus !== selectedStatus) return false;
        if (alert.priorityScore < minPriority) return false;
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          const matchName = alert.userName.toLowerCase().includes(q);
          const matchTitle = alert.title.toLowerCase().includes(q);
          const matchId = alert.id.toLowerCase().includes(q);
          const matchDept = alert.department.toLowerCase().includes(q);
          if (!matchName && !matchTitle && !matchId && !matchDept) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'priority') return b.priorityScore - a.priorityScore;
        if (sortBy === 'raw_anomaly') return b.rawAnomalyScore - a.rawAnomalyScore;
        if (sortBy === 'signals') return b.cooccurringSignalsCount - a.cooccurringSignalsCount;
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });
  }, [alerts, selectedDepartment, selectedStatus, minPriority, searchQuery, sortBy]);

  return (
    <div className="space-y-6 pb-12">
      {/* =========================================================================
          PRIORITY FORMULA & ROLE BASELINE ARCHITECTURE CALLOUT
         ========================================================================= */}
      <section className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-3">
          Dynamic Priority Engine &bull; Multi-Factor Threat Queue
        </div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-600/20 text-orange-400 border border-orange-500/30">
                <SlidersHorizontal className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Dynamic Multi-Factor Priority Scoring Engine
                </h2>
                <p className="text-xs text-neutral-400">
                  Combines multivariate Isolation Forest outlier scoring with heuristic signals, account privilege multipliers, and session auto-grouping.
                </p>
              </div>
            </div>

            {/* Formula Visualization Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs text-neutral-300 font-mono flex flex-wrap items-center gap-2">
              <span className="text-orange-400 font-bold">Priority Score =</span>
              <span className="bg-neutral-900 px-2 py-0.5 rounded border border-white/10">
                (50% AI Anomaly + 50% Rule Severity)
              </span>
              <span className="text-neutral-500">&times;</span>
              <span className="bg-purple-950/60 text-purple-300 px-2 py-0.5 rounded border border-purple-800/50">
                Account Sensitivity (1.35x Privileged)
              </span>
              <span className="text-neutral-500">+</span>
              <span className="bg-amber-950/60 text-amber-300 px-2 py-0.5 rounded border border-amber-800/50">
                Co-occurring Signals Bonus (+6 to +26)
              </span>
              <span className="text-neutral-500">&times;</span>
              <span className="bg-neutral-900 text-neutral-300 px-2 py-0.5 rounded border border-white/10">
                Role Baseline Deviation
              </span>
            </div>
          </div>

          {/* Role-Based Threshold Callout */}
          <div className="bg-[#0a0a0a] p-4 rounded-xl border border-white/10 lg:max-w-md w-full text-xs">
            <div className="flex items-center gap-2 text-orange-300 font-bold mb-1">
              <Sparkles className="h-4 w-4 text-orange-400" />
              <span>Role-Based vs Global Baseline Thresholds</span>
            </div>
            <p className="text-neutral-400 text-[11px] leading-relaxed">
              Effective detection avoids false positives by eliminating static global thresholds. A 500 MB egress is normal for an Engineering DevOps role (baseline limit 1.2 GB), but represents an extreme <strong className="text-rose-400">33x anomaly</strong> for an HR Specialist (baseline limit 15 MB).
            </p>
          </div>
        </div>
      </section>

      {/* =========================================================================
          INTERACTIVE CONTROLS & FILTER TOOLBAR
         ========================================================================= */}
      <section className="bg-[#111111] border border-white/10 rounded-2xl p-5 shadow-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 items-center">
          {/* Search bar */}
          <div className="lg:col-span-4 relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by user name, alert title, or ID..."
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl pl-9 pr-3 py-2 text-xs text-neutral-200 placeholder-neutral-500 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          {/* Department Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Finance">Finance</option>
              <option value="Human Resources">Human Resources</option>
              <option value="IT Administration">IT Administration</option>
            </select>
          </div>

          {/* Analyst Status Filter */}
          <div className="lg:col-span-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending Review</option>
              <option value="CONFIRMED">Confirmed Incident</option>
              <option value="DISMISSED">Dismissed / FP</option>
              <option value="MARK_FOR_REVIEW">Marked for Review</option>
            </select>
          </div>

          {/* Sort By Selector */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-orange-500/50 cursor-pointer"
            >
              <option value="priority">Sort: Priority Score (Desc)</option>
              <option value="raw_anomaly">Sort: AI Anomaly Score</option>
              <option value="signals">Sort: Signal Count</option>
              <option value="timestamp">Sort: Most Recent</option>
            </select>
          </div>

          {/* Min Priority Slider */}
          <div className="lg:col-span-2 flex flex-col justify-center">
            <div className="flex items-center justify-between text-[11px] font-mono text-neutral-400 mb-1">
              <span>Min Priority:</span>
              <span className="font-bold text-orange-400">{minPriority}</span>
            </div>
            <input
              type="range"
              min="0"
              max="95"
              step="5"
              value={minPriority}
              onChange={(e) => setMinPriority(Number(e.target.value))}
              className="w-full accent-orange-500 cursor-pointer h-1.5 bg-neutral-800 rounded-lg"
            />
          </div>
        </div>
      </section>

      {/* =========================================================================
          PRIORITIZED ALERT INCIDENT WORKLIST
         ========================================================================= */}
      <section className="space-y-3">
        <div className="flex items-center justify-between text-xs text-neutral-400 font-mono uppercase px-1">
          <span>
            Displaying {processedAlerts.length} Prioritized Incidents (Default Sorted by Risk Severity)
          </span>
          <span>Goal 3 Mandate: Auto-Grouped Session Incidents</span>
        </div>

        {processedAlerts.length > 0 ? (
          <div className="space-y-3">
            {processedAlerts.map((alert) => {
              const isUrgent = alert.priorityScore >= 85;
              const isHigh = alert.priorityScore >= 65 && alert.priorityScore < 85;

              return (
                <div
                  key={alert.id}
                  className={`p-5 rounded-2xl border transition relative ${
                    isUrgent
                      ? 'bg-[#111111] border-rose-500/40 shadow-lg shadow-rose-950/20'
                      : 'bg-[#111111] border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                    {/* Left: Priority Badge & User Identity */}
                    <div className="flex items-start gap-4">
                      {/* Big Priority Score Pill */}
                      <div className="flex flex-col items-center justify-center w-16 h-16 rounded-2xl bg-[#0a0a0a] border border-white/10 flex-shrink-0">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500">PRIORITY</span>
                        <span
                          className={`text-2xl font-extrabold font-mono ${
                            isUrgent
                              ? 'text-rose-500'
                              : isHigh
                              ? 'text-orange-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {alert.priorityScore}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs text-orange-400 font-bold">{alert.id}</span>
                          <span className="text-neutral-500">&bull;</span>
                          <span className="font-bold text-sm text-white">{alert.userName}</span>
                          {alert.isPrivileged && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.2 rounded-full bg-purple-950 text-purple-300 border border-purple-800">
                              <Lock className="h-2.5 w-2.5" />
                              Privileged 1.35x
                            </span>
                          )}
                          <span className="text-xs text-neutral-400 font-mono">({alert.department})</span>
                          {alert.isEarlyWarning ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 border border-amber-500/40">
                              <Sparkles className="h-2.5 w-2.5 text-amber-400" />
                              Rising risk — not yet critical (Early Warning)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                              Reactive Threshold
                            </span>
                          )}
                        </div>

                        <h3 className="text-sm font-bold text-neutral-100 mt-1">{alert.title}</h3>
                        <p className="text-xs text-neutral-400 mt-0.5 line-clamp-1">{alert.summary}</p>

                        {/* Co-occurring signals tags */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <span className="text-[10px] font-mono text-neutral-500">Corroborated Signals:</span>
                          {alert.cooccurringSignals.map((sig, sIdx) => (
                            <span
                              key={sIdx}
                              className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#171717] text-neutral-300 border border-white/5"
                            >
                              {sig.title}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions & Status */}
                    <div className="flex items-center gap-3 self-end lg:self-auto flex-shrink-0">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-lg font-mono font-semibold ${
                          alert.analystStatus === 'ESCALATED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                            : alert.analystStatus === 'CONFIRMED'
                            ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                            : alert.analystStatus === 'DISMISSED'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        }`}
                      >
                        {alert.analystStatus}
                      </span>

                      {/* Goal 2 link: Corroborate */}
                      <button
                        onClick={() => onSelectAlertForCorroboration(alert.id)}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-rose-600 hover:opacity-90 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                      >
                        <Layers className="h-3.5 w-3.5" />
                        <span>Corroborate & Decide</span>
                        <ArrowUpRight className="h-3 w-3" />
                      </button>

                      {/* Goal 1 link: Unified User View */}
                      <button
                        onClick={() => onNavigateToUserUnified(alert.userId)}
                        className="p-2 rounded-xl bg-[#0a0a0a] hover:bg-neutral-800 text-neutral-300 border border-white/10 transition"
                        title="Open User Unified Context View (Goal 1)"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-16 rounded-2xl bg-[#111111] border border-white/10 text-center text-neutral-500">
            No incidents matched your current priority threshold or filter criteria.
          </div>
        )}
      </section>
    </div>
  );
};
