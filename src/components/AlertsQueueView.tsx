import React, { useState } from 'react';
import { AlertIncident } from '../types';
import { Bell, ShieldAlert, KeyRound, Ban, CheckCircle } from 'lucide-react';

interface AlertsQueueViewProps {
  alerts: AlertIncident[];
  onSelectAlert?: (alertId: string) => void;
  onSubmitFeedback?: (alertId: string, decision: string, justification: string) => Promise<boolean> | void;
}

export const AlertsQueueView: React.FC<AlertsQueueViewProps> = ({
  alerts,
  onSubmitFeedback,
}) => {
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredAlerts = alerts.filter((a) => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const handleAction = async (alertId: string, decision: string) => {
    const ok = onSubmitFeedback
      ? await onSubmitFeedback(alertId, decision, `Analyst action: ${decision}`)
      : undefined;
    setActionNotice(
      ok === false
        ? `[FAILED] Decision ${decision} was not recorded for incident ${alertId}`
        : `[COMMITTED] Decision ${decision} recorded for incident ${alertId}`
    );
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <div className="space-y-3 pb-12 font-mono text-xs select-none">
      {actionNotice && (
        <div className="p-2 bg-[#121c16] border border-emerald-500/60 text-emerald-300 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-[#8b95a5] hover:text-white">
            [X]
          </button>
        </div>
      )}

      {/* Control Strip */}
      <section className="bg-[#0f1218] border border-[#232b3b] p-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-amber-500 font-bold text-[10px]">// SEVERITY FILTER:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2 py-0.5 text-[10px] transition-colors border ${
                filterSeverity === sev
                  ? 'bg-amber-500 text-black border-amber-400 font-bold'
                  : 'bg-[#121620] text-[#94a3b8] border-[#252f43] hover:text-white'
              }`}
            >
              [{sev}]
            </button>
          ))}
        </div>

        <span className="text-[#64748b] text-[10px]">
          {filteredAlerts.length} FLAGGED INCIDENTS IN BUFFER
        </span>
      </section>

      {/* Incident List */}
      <section className="space-y-2">
        {filteredAlerts.map((alt) => {
          const isCrit = alt.priorityScore >= 80;
          return (
            <div
              key={alt.id}
              className="bg-[#0f1218] border border-[#232b3b] hover:border-amber-500/50 p-3 transition-colors"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1b2230] pb-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-[#64748b]">
                      {new Date(alt.timestamp).toLocaleDateString()} {new Date(alt.timestamp).toLocaleTimeString()}
                    </span>
                    <span className="text-[#475569]">&bull;</span>
                    <span className="text-[#94a3b8]">
                      PRINCIPAL: <strong className="text-white">{alt.userName}</strong> [{alt.department.slice(0, 3).toUpperCase()}]
                    </span>
                    {alt.isPrivileged && (
                      <span className="px-1 py-0.2 bg-[#1b2230] border border-[#2c374d] text-amber-300 text-[9px]">
                        PRIVILEGED
                      </span>
                    )}
                  </div>
                  <h3 className="text-xs font-bold text-white glow-amber">{alt.title}</h3>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-[9px] text-[#64748b]">PRIORITY SCORE</div>
                    <div className="text-base font-bold text-rose-400 glow-red">
                      {alt.priorityScore} <span className="text-[10px] text-[#64748b]">/ 100</span>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[9px] font-bold border ${
                      isCrit
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {alt.severity}
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col md:flex-row md:items-center justify-between gap-2 text-[11px]">
                <p className="text-[#8b95a5] leading-relaxed max-w-2xl text-[10px]">
                  {alt.summary || "Multivariate deviation detected across circadian baselines corroborating multiple anomalous attributes."}
                </p>

                {/* 1-Click Retro Action Buttons */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleAction(alt.id, 'VERIFY_THREAT')}
                    className="retro-btn text-rose-300 border-rose-800 hover:bg-rose-600 hover:text-white text-[9px]"
                  >
                    &gt; VERIFY
                  </button>
                  <button
                    onClick={() => handleAction(alt.id, 'STEP_UP_MFA')}
                    className="retro-btn text-amber-300 border-amber-800 hover:bg-amber-600 hover:text-black text-[9px]"
                  >
                    &gt; MFA CHALLENGE
                  </button>
                  <button
                    onClick={() => handleAction(alt.id, 'FLAG_FALSE_POSITIVE')}
                    className="retro-btn text-[#8b95a5] text-[9px]"
                  >
                    &gt; DISMISS
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
};
