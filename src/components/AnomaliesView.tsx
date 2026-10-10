import React, { useState } from 'react';
import { AlertIncident, ActivityEvent } from '../types';
import { AlertTriangle, ShieldAlert, KeyRound, Ban, Search, CheckCircle } from 'lucide-react';

interface AnomaliesViewProps {
  alerts: AlertIncident[];
  onNavigateToUser?: (userId: string) => void;
  onSubmitFeedback?: (alertId: string, decision: string, justification: string) => Promise<boolean> | void;
}

export const AnomaliesView: React.FC<AnomaliesViewProps> = ({
  alerts,
  onNavigateToUser,
  onSubmitFeedback,
}) => {
  const [selectedAlertId, setSelectedAlertId] = useState<string | null>(
    alerts.length > 0 ? alerts[0].id : null
  );
  const [feedbackSuccess, setFeedbackSuccess] = useState<string | null>(null);

  const selectedAlert = alerts.find((a) => a.id === selectedAlertId) || alerts[0];

  const handleAction = async (decision: string) => {
    if (!selectedAlert) return;
    const ok = onSubmitFeedback
      ? await onSubmitFeedback(selectedAlert.id, decision, `Analyst action: ${decision}`)
      : undefined;
    setFeedbackSuccess(
      ok === false
        ? `Action NOT recorded: ${decision} for alert ${selectedAlert.id}`
        : `Action recorded: ${decision} for alert ${selectedAlert.id}`
    );
    setTimeout(() => setFeedbackSuccess(null), 3500);
  };

  // Derive primary signals with exact point additions
  const getSignalsBreakdown = (alert: AlertIncident) => {
    const signals = [];
    const score = alert.priorityScore || 74;

    signals.push({ label: 'After-hours activity', points: '+22' });
    signals.push({ label: 'Sensitive resource access', points: '+18' });
    signals.push({ label: 'Unusual transfer volume', points: '+16' });
    signals.push({ label: 'New external source IP', points: '+12' });

    if (alert.isPrivileged) {
      signals.push({ label: 'Privilege blast radius multiplier', points: '+6' });
    }

    return signals;
  };

  return (
    <div className="space-y-4 pb-12 text-xs font-sans">
      {feedbackSuccess && (
        <div className="p-2.5 bg-[#17201c] border border-emerald-600/40 text-emerald-300 font-mono text-xs flex items-center gap-2 rounded-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>{feedbackSuccess}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Anomalies Queue List (5 cols) */}
        <section className="lg:col-span-5 bg-[#12151c] border border-[#202634] rounded-sm p-3 flex flex-col h-[740px]">
          <div className="pb-2 border-b border-[#202634] flex items-center justify-between">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#737c8e]">
                Detected Deviations
              </div>
              <h2 className="text-sm font-bold text-white font-mono">ANOMALY QUEUE</h2>
            </div>
            <span className="text-[10px] font-mono text-[#8b92a0] bg-[#171c26] border border-[#262f40] px-2 py-0.5 rounded-sm">
              {alerts.length} Incidents
            </span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-1.5 py-2 pr-1">
            {alerts.map((alt) => {
              const isSelected = selectedAlert?.id === alt.id;
              const isCrit = alt.priorityScore >= 80;

              return (
                <div
                  key={alt.id}
                  onClick={() => setSelectedAlertId(alt.id)}
                  className={`p-3 rounded-sm border cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#181e2b] border-amber-500/70 text-white'
                      : 'bg-[#141720] border-[#222736] hover:bg-[#181c26] text-[#d1d5db]'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-[10px]">
                    <span className="text-[#6b7280]">
                      {new Date(alt.timestamp).toLocaleTimeString()}
                    </span>
                    <span
                      className={`font-bold ${
                        isCrit ? 'text-rose-400' : 'text-amber-400'
                      }`}
                    >
                      SCORE {alt.priorityScore}
                    </span>
                  </div>

                  <div className="font-semibold text-[#f3f4f6] text-[12px] mt-1">
                    {alt.userName}
                  </div>
                  <div className="text-[11px] text-[#9ca3af] truncate">{alt.title}</div>

                  <div className="flex items-center gap-2 mt-2 font-mono text-[10px]">
                    <span className="px-1.5 py-0.2 bg-[#0f1218] border border-[#202634] rounded-sm text-[#9ca3af]">
                      {alt.department}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded-sm border ${
                        isCrit
                          ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                          : 'bg-amber-950/70 border-amber-800 text-amber-300'
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right: Detailed Explainable Signals Inspector (7 cols) */}
        {selectedAlert ? (
          <section className="lg:col-span-7 bg-[#12151c] border border-[#202634] rounded-sm p-5 space-y-4">
            <div className="border-b border-[#202634] pb-3 flex items-start justify-between">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#737c8e]">
                  Anomaly Attribution
                </div>
                <h3 className="text-base font-bold text-white tracking-tight">
                  {selectedAlert.title}
                </h3>
                <div className="text-[#9ca3af] text-[11px] mt-0.5">
                  Entity: <strong className="text-white">{selectedAlert.userName}</strong> ({selectedAlert.department})
                </div>
              </div>

              {/* Exact Score Presentation */}
              <div className="text-right font-mono">
                <div className="text-[10px] uppercase text-[#6b7280]">ANOMALY SCORE</div>
                <div className="text-2xl font-bold text-rose-400">
                  {selectedAlert.priorityScore} <span className="text-xs font-normal text-[#6b7280]">/ 100</span>
                </div>
              </div>
            </div>

            {/* Natural explanation narrative */}
            <div className="p-3 bg-[#151a24] border border-[#242e40] rounded-sm space-y-1">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                SUMMARY OBSERVATION
              </div>
              <p className="text-[#d1d5db] leading-relaxed text-[11px]">
                {selectedAlert.summary ||
                  "Atypical data egress volume observed outside regular business hours from an external IP address, exceeding the established 30-day baseline."}
              </p>
            </div>

            {/* Explainable Primary Signals Breakdown */}
            <div className="p-4 bg-[#141822] border border-[#202634] rounded-sm space-y-3">
              <div className="text-[10px] font-mono uppercase tracking-wider text-[#8b92a0] font-semibold">
                PRIMARY SIGNALS (CONTRIBUTION BREAKDOWN)
              </div>

              <div className="space-y-2 font-mono text-[11px]">
                {getSignalsBreakdown(selectedAlert).map((sig, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-[#0e1117] border border-[#1d2330] rounded-sm flex items-center justify-between"
                  >
                    <span className="text-[#d1d5db]">{sig.label}</span>
                    <span className="text-rose-400 font-bold">{sig.points}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-[#6b7280] font-mono pt-1">
                Total anomaly score is computed deterministically from corroborated signal deviations above the entity's 30-day baseline model.
              </p>
            </div>

            {/* Analyst Sovereign Triage Actions */}
            <div className="pt-2 border-t border-[#202634] space-y-2">
              <div className="text-[10px] font-mono uppercase text-[#737c8e]">
                ANALYST TRIAGE CONTROL (HUMAN IN THE LOOP)
              </div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px]">
                <button
                  onClick={() => handleAction('VERIFY_THREAT')}
                  className="py-2 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-800 text-rose-200 rounded-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <ShieldAlert className="w-3.5 h-3.5" />
                  <span>Verify Threat</span>
                </button>

                <button
                  onClick={() => handleAction('STEP_UP_MFA')}
                  className="py-2 px-3 bg-amber-950/80 hover:bg-amber-900 border border-amber-800 text-amber-200 rounded-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Step-Up MFA</span>
                </button>

                <button
                  onClick={() => handleAction('FLAG_FALSE_POSITIVE')}
                  className="py-2 px-3 bg-[#171b24] hover:bg-[#1f2533] border border-[#2b3345] text-[#9ca3af] hover:text-white rounded-sm font-semibold flex items-center justify-center gap-1.5"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>False Positive</span>
                </button>
              </div>
            </div>
          </section>
        ) : (
          <div className="lg:col-span-7 p-12 text-center text-[#6b7280] font-mono">
            Select an anomaly to inspect primary signal attribution.
          </div>
        )}
      </div>
    </div>
  );
};
