import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  Clock,
  HelpCircle,
  Send,
  Lock,
  Layers,
  FileText,
  TrendingUp,
  Cpu,
  User,
  Activity,
  History,
  AlertTriangle,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { AlertIncident, AnalystFeedbackRecord, AuthUser } from '../types';

interface HumanOversightViewProps {
  alerts: AlertIncident[];
  selectedAlertId: string | null;
  onSelectAlert: (id: string) => void;
  onSubmitFeedback: (
    alertId: string,
    decision: 'CONFIRMED' | 'DISMISSED' | 'MARK_FOR_REVIEW' | 'ESCALATED',
    justification: string
  ) => Promise<void>;
  feedbackDataset: AnalystFeedbackRecord[];
  onRefreshData: () => void;
  currentUser?: AuthUser | null;
}

export const HumanOversightView: React.FC<HumanOversightViewProps> = ({
  alerts,
  selectedAlertId,
  onSelectAlert,
  onSubmitFeedback,
  feedbackDataset,
  onRefreshData,
  currentUser,
}) => {
  const currentAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];
  const [justification, setJustification] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<'corroboration' | 'feedback_audit'>('corroboration');

  // Reset justification text when selected alert changes
  useEffect(() => {
    if (currentAlert) {
      setJustification(currentAlert.analystNotes || '');
    }
  }, [currentAlert?.id]);

  const handleAction = async (decision: 'CONFIRMED' | 'DISMISSED' | 'MARK_FOR_REVIEW' | 'ESCALATED') => {
    if (!currentAlert) return;
    setIsSubmitting(true);
    try {
      await onSubmitFeedback(currentAlert.id, decision, justification);
      onRefreshData();
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group signals by attack stage for threat corroboration
  const ingressSignals =
    currentAlert?.cooccurringSignals.filter((s) => s.stage === 'Ingress & Authentication') || [];
  const privilegeSignals =
    currentAlert?.cooccurringSignals.filter((s) => s.stage === 'Reconnaissance & Privilege') || [];
  const exfilSignals =
    currentAlert?.cooccurringSignals.filter((s) => s.stage === 'Action on Objectives & Exfiltration') || [];

  return (
    <div className="space-y-6 pb-12">
      {/* Overview Banner: Real-Time Human Oversight */}
      <section className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="text-[10px] font-mono uppercase tracking-widest text-orange-400 font-bold mb-3">
          Real-Time Incident Stream &bull; Human Analyst Sovereign Oversight
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500/20 to-rose-600/20 text-orange-400 border border-orange-500/30">
              <Cpu className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">
                  Human Analyst Sovereign Control (Zero Auto-Closing)
                </h2>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-orange-950 text-orange-400 border border-orange-800/60">
                  Strict Human Sovereign
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-1 max-w-3xl">
                The multivariate Isolation Forest algorithm calculates outlier probability and proposes candidate flags, but{' '}
                <strong className="text-neutral-200">never automatically escalates or closes an incident</strong>. Every detection requires explicit human corroboration, and all decisions are logged to train the analyst feedback dataset.
              </p>
            </div>
          </div>

          {/* Sub-view toggle */}
          <div className="flex items-center bg-[#171717] p-1 rounded-xl border border-white/10 text-xs self-end md:self-auto">
            <button
              onClick={() => setActiveTab('corroboration')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'corroboration'
                  ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Threat Corroboration</span>
            </button>
            <button
              onClick={() => setActiveTab('feedback_audit')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition font-medium ${
                activeTab === 'feedback_audit'
                  ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white shadow-sm'
                  : 'text-neutral-400 hover:text-white'
              }`}
            >
              <History className="h-3.5 w-3.5" />
              <span>Feedback Audit ({feedbackDataset.length})</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main 2-Column Working Layout */}
      {activeTab === 'corroboration' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT: Incident Alert Queue (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-center justify-between text-[10px] text-neutral-400 font-mono uppercase px-1">
              <span>Incident Queue ({alerts.length})</span>
              <span>Sorted by Priority</span>
            </div>

            <div className="space-y-2.5 max-h-[780px] overflow-y-auto pr-1">
              {alerts.map((alert) => {
                const isSelected = alert.id === currentAlert?.id;
                const isPending = alert.analystStatus === 'PENDING';
                const isHighPriority = alert.priorityScore >= 80;

                return (
                  <div
                    key={alert.id}
                    onClick={() => onSelectAlert(alert.id)}
                    className={`p-4 rounded-xl border cursor-pointer transition relative ${
                      isSelected
                        ? 'bg-[#1a1a1a] border-orange-500/60 shadow-lg'
                        : 'bg-[#111111] border-white/10 hover:border-white/20'
                    }`}
                  >
                    {/* Top Row: User & Severity Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 truncate">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                          style={{ backgroundColor: alert.avatarColor || '#ea580c' }}
                        >
                          {alert.userName[0]}
                        </div>
                        <span className="font-bold text-xs text-white truncate">{alert.userName}</span>
                        {alert.isPrivileged && (
                          <span title="Privileged User">
                            <Lock className="h-3 w-3 text-purple-400 flex-shrink-0" />
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span
                          className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            isHighPriority
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          P:{alert.priorityScore}
                        </span>
                      </div>
                    </div>

                    {/* Alert Title */}
                    <h4 className="text-xs font-semibold text-neutral-200 mt-2 line-clamp-1">
                      {alert.title}
                    </h4>

                    {/* Meta and Status */}
                    <div className="flex items-center justify-between text-[11px] text-neutral-400 mt-2 font-mono">
                      <span>{alert.cooccurringSignalsCount} Corroborated Signals</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                          alert.analystStatus === 'ESCALATED'
                            ? 'bg-rose-500/20 text-rose-300 border border-rose-500/50 animate-pulse'
                            : alert.analystStatus === 'CONFIRMED'
                            ? 'bg-rose-500/20 text-rose-400'
                            : alert.analystStatus === 'DISMISSED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-neutral-800 text-amber-300'
                        }`}
                      >
                        {alert.analystStatus}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Threat Corroboration Detail & Analyst Action Panel (8 cols) */}
          <div className="lg:col-span-8 space-y-6">
            {currentAlert ? (
              <>
                {/* 1. Incident Header Card */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-xl">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-orange-400">{currentAlert.id}</span>
                        <span className="text-xs text-neutral-500">&bull;</span>
                        <span className="text-xs text-neutral-400 font-mono">Session: {currentAlert.sessionId}</span>
                      </div>
                      <h3 className="text-lg font-bold text-white mt-1 tracking-tight">{currentAlert.title}</h3>
                      <p className="text-xs text-neutral-400 mt-1">{currentAlert.summary}</p>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto flex-shrink-0">
                      <div className="text-right">
                        <span className="text-[10px] uppercase font-mono text-neutral-400 block font-bold">
                          Priority Score
                        </span>
                        <span className="text-3xl font-extrabold font-mono text-orange-400">
                          {currentAlert.priorityScore}
                          <span className="text-xs text-neutral-500 font-bold">/100</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Multi-variable math breakdown pill */}
                  <div className="mt-4 p-3 rounded-xl bg-[#0a0a0a] border border-white/10 text-xs font-mono text-neutral-300 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      Raw AI Score: <strong className="text-white">{currentAlert.rawAnomalyScore}/100</strong>
                    </span>
                    <span>
                      Account Sensitivity:{' '}
                      <strong className="text-purple-300">{currentAlert.accountSensitivityWeight}x</strong>
                    </span>
                    <span>
                      Co-occurring Bonus:{' '}
                      <strong className="text-orange-400">+{Math.min(26, currentAlert.cooccurringSignalsCount * 8)} pts</strong>
                    </span>
                    <span>
                      Role Vol Ratio:{' '}
                      <strong className="text-amber-300">{currentAlert.roleDeviationRatio}x</strong>
                    </span>
                  </div>
                </div>

                {/* 2. THREAT CORROBORATION PANEL ("Why was this flagged?") */}
                <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Layers className="h-4 w-4 text-orange-400" />
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        Threat Corroboration — Multi-Stage Attack Chain Analysis
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0a0a0a] text-neutral-400 border border-white/10">
                      Why Was This Flagged?
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mb-6">
                    Individual anomalous events are corroboratively grouped into structured attack stages to eliminate false positive alert fatigue. Below is the multi-stage corroboration for this incident:
                  </p>

                  <div className="space-y-4">
                    {/* Stage 1: Ingress & Authentication */}
                    <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-400" />
                          <span className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                            Stage 1: Ingress & Authentication
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">{ingressSignals.length} signal(s)</span>
                      </div>

                      {ingressSignals.length > 0 ? (
                        <div className="space-y-2">
                          {ingressSignals.map((sig, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-[#141414] border border-white/5 text-xs">
                              <div className="flex items-center justify-between text-neutral-200 font-semibold mb-1">
                                <span className="font-mono text-orange-300">{sig.title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                  {sig.severity}
                                </span>
                              </div>
                              <p className="text-neutral-400 leading-relaxed text-[11px]">{sig.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 italic pl-4">No anomalous ingress signals in this session.</p>
                      )}
                    </div>

                    {/* Stage 2: Reconnaissance & Privilege */}
                    <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-400" />
                          <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider">
                            Stage 2: Reconnaissance & Privilege Escalation
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">{privilegeSignals.length} signal(s)</span>
                      </div>

                      {privilegeSignals.length > 0 ? (
                        <div className="space-y-2">
                          {privilegeSignals.map((sig, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-[#141414] border border-white/5 text-xs">
                              <div className="flex items-center justify-between text-neutral-200 font-semibold mb-1">
                                <span className="font-mono text-purple-300">{sig.title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/10 text-purple-300 border border-purple-500/30">
                                  {sig.severity}
                                </span>
                              </div>
                              <p className="text-neutral-400 leading-relaxed text-[11px]">{sig.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 italic pl-4">No privilege probing signals in this session.</p>
                      )}
                    </div>

                    {/* Stage 3: Action on Objectives & Exfiltration */}
                    <div className="p-4 rounded-xl bg-[#0a0a0a] border border-white/10">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-400" />
                          <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
                            Stage 3: Action on Objectives & Exfiltration
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-neutral-500">{exfilSignals.length} signal(s)</span>
                      </div>

                      {exfilSignals.length > 0 ? (
                        <div className="space-y-2">
                          {exfilSignals.map((sig, idx) => (
                            <div key={idx} className="p-3 rounded-lg bg-[#141414] border border-white/5 text-xs">
                              <div className="flex items-center justify-between text-neutral-200 font-semibold mb-1">
                                <span className="font-mono text-rose-300">{sig.title}</span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30">
                                  {sig.severity}
                                </span>
                              </div>
                              <p className="text-neutral-400 leading-relaxed text-[11px]">{sig.description}</p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-neutral-500 italic pl-4">No exfiltration signals observed in this session.</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* 3. SOVEREIGN HUMAN OVERSIGHT ACTION PANEL */}
                <div className="bg-[#111111] border border-orange-500/30 rounded-2xl p-6 shadow-xl">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-orange-400" />
                      <h4 className="text-sm font-bold text-white tracking-tight">
                        Analyst Sovereign Decision & Feedback Loop
                      </h4>
                    </div>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Current Status: <strong className="text-white">{currentAlert.analystStatus}</strong>
                    </span>
                  </div>

                  <p className="text-xs text-neutral-400 mb-4">
                    Record your investigative findings. This action updates the alert state and logs a structured training record to the feedback dataset.
                  </p>

                  <div className="space-y-3">
                    <textarea
                      value={justification}
                      onChange={(e) => setJustification(e.target.value)}
                      placeholder="Enter analyst justification notes (e.g., 'User confirmed travel was unauthorized; compromised MFA token revoked' or 'Verified scheduled database maintenance backup')..."
                      rows={3}
                      className="w-full bg-[#0a0a0a] border border-white/10 rounded-xl p-3 text-xs text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-orange-500/60 font-sans"
                    />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                      <div className="text-[11px] text-neutral-400 font-mono flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                        <span>
                          Clearance: <strong className="text-white">{currentUser?.roleTitle || 'Security Operator'}</strong> (Escalation Authorized)
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2.5">
                        {/* Escalate Action (Both Security Director & Assistant Security) */}
                        <button
                          id="action-escalate-btn"
                          onClick={() => handleAction('ESCALATED')}
                          disabled={isSubmitting}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-600 via-rose-600 to-purple-600 hover:opacity-95 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-lg shadow-rose-900/30 disabled:opacity-50"
                          title="Both Security Director & Assistant Security have authorization to escalate incidents."
                        >
                          <Flame className="h-4 w-4" />
                          <span>Escalate to Tier-2 SOC / Critical IR</span>
                        </button>

                        {/* Confirm Action */}
                        <button
                          onClick={() => handleAction('CONFIRMED')}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-500 text-white font-semibold text-xs transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>Confirm Incident</span>
                        </button>

                        {/* Dismiss Action */}
                        <button
                          onClick={() => handleAction('DISMISSED')}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-semibold text-xs border border-white/10 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="h-3.5 w-3.5 text-emerald-400" />
                          <span>Dismiss (Benign)</span>
                        </button>

                        {/* Review Action */}
                        <button
                          onClick={() => handleAction('MARK_FOR_REVIEW')}
                          disabled={isSubmitting}
                          className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-amber-300 font-medium text-xs border border-amber-500/30 transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Clock className="h-3.5 w-3.5 text-amber-400" />
                          <span>Review</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-neutral-500">No alert selected.</div>
            )}
          </div>
        </div>
      ) : (
        /* AUDIT DATASET VIEW */
        <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">
                Analyst Feedback Dataset — Model Retraining Audit Trail
              </h3>
              <p className="text-xs text-neutral-400 mt-1">
                Every human decision is permanently stored in SQLite to benchmark detection accuracy and adjust future baseline tolerances.
              </p>
            </div>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden bg-[#0a0a0a] max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#171717] text-neutral-400 text-[10px] font-mono uppercase tracking-wider sticky top-0 border-b border-white/10">
                <tr>
                  <th className="py-2.5 px-3">Decision Time</th>
                  <th className="py-2.5 px-3">Alert ID</th>
                  <th className="py-2.5 px-3">User Target</th>
                  <th className="py-2.5 px-3 text-center">Analyst Decision</th>
                  <th className="py-2.5 px-3 text-center">Original AI Score</th>
                  <th className="py-2.5 px-3">Analyst Justification</th>
                  <th className="py-2.5 px-3">Reviewer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {feedbackDataset.length > 0 ? (
                  feedbackDataset.map((fb) => (
                    <tr key={fb.id} className="hover:bg-white/[0.02] transition">
                      <td className="py-2.5 px-3 font-mono text-[11px] text-neutral-400 whitespace-nowrap">
                        {fb.feedback_timestamp.replace('T', ' ').slice(0, 19)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-orange-400 font-bold whitespace-nowrap">
                        {fb.alert_id}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap font-medium text-white">
                        {fb.user_name || fb.user_id}
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <span
                          className={`inline-block font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                            fb.decision === 'ESCALATED'
                              ? 'bg-purple-500/20 text-purple-300 border-purple-500/50'
                              : fb.decision === 'CONFIRMED'
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              : fb.decision === 'DISMISSED'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          }`}
                        >
                          {fb.decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono text-neutral-300 whitespace-nowrap">
                        {fb.original_ai_score}/100
                      </td>
                      <td className="py-2.5 px-3 text-neutral-300 text-xs max-w-sm">
                        {fb.justification}
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400 text-xs font-mono whitespace-nowrap">
                        {fb.analyst_name}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-500 italic">
                      No analyst decisions recorded yet. Confirm or dismiss an incident above to populate this dataset.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
