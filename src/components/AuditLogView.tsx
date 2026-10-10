import React from 'react';
import { AnalystFeedbackRecord } from '../types';
import { FileText, Shield } from 'lucide-react';

interface AuditLogViewProps {
  feedbackDataset: AnalystFeedbackRecord[];
}

export const AuditLogView: React.FC<AuditLogViewProps> = ({ feedbackDataset }) => {
  const defaultEntries = [
    {
      id: 1,
      alert_id: 104,
      analyst_name: 'E. Vance [SecOps L4]',
      decision: 'CONFIRMED',
      justification: 'Threat verified. Sophia Chen external Munich access corroborated with sensitive file transfer.',
      signals_snapshot: 'RULE_ODD_HOURS, RULE_VOLUME_SPIKE, RULE_IMPOSSIBLE_TRAVEL',
      created_at: '2026-09-24T20:25:00Z',
    },
    {
      id: 2,
      alert_id: 102,
      analyst_name: 'E. Vance [SecOps L4]',
      decision: 'DISMISSED',
      justification: 'Routine scheduled maintenance backup flagged as unusual volume. Down-weighted signal.',
      signals_snapshot: 'RULE_UNUSUAL_VOLUME',
      created_at: '2026-09-24T19:10:00Z',
    },
    {
      id: 3,
      alert_id: 99,
      analyst_name: 'E. Vance [SecOps L4]',
      decision: 'MARK_FOR_REVIEW',
      justification: 'Off-hours API key generation requires secondary review with DevOps lead.',
      signals_snapshot: 'RULE_PRIVILEGE_PROBE',
      created_at: '2026-09-23T23:44:00Z',
    },
  ];

  // signals_snapshot is stored as a JSON array of signal objects; show just the rule codes
  const formatSignals = (raw: any): string => {
    if (!raw) return '—';
    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (Array.isArray(parsed)) {
        return parsed.map((s: any) => (typeof s === 'string' ? s : s?.code)).filter(Boolean).join(', ') || '—';
      }
    } catch {
      /* plain text such as "RULE_ODD_HOURS, RULE_VOLUME_SPIKE" */
    }
    return String(raw);
  };

  const records = feedbackDataset && feedbackDataset.length > 0 ? feedbackDataset : defaultEntries;

  return (
    <div className="space-y-4 pb-12 text-xs font-sans">
      <section className="bg-[#12151c] border border-[#202634] p-3 rounded-sm flex items-center justify-between font-mono">
        <div>
          <div className="text-[10px] font-mono uppercase text-[#737c8e]">Compliance & Chain of Custody</div>
          <h2 className="text-sm font-bold text-white">Analyst Audit & Feedback Log</h2>
        </div>
        <span className="text-[#6b7280] text-[11px]">{records.length} Recorded Actions</span>
      </section>

      <section className="bg-[#12151c] border border-[#202634] rounded-sm overflow-hidden">
        <table className="w-full text-left font-mono text-[11px]">
          <thead className="bg-[#0f1218] border-b border-[#202634] text-[#788294] text-[10px] uppercase">
            <tr>
              <th className="py-2.5 px-3">TIMESTAMP</th>
              <th className="py-2.5 px-3">OPERATOR</th>
              <th className="py-2.5 px-3">ACTION / DECISION</th>
              <th className="py-2.5 px-3">TARGET ALERT</th>
              <th className="py-2.5 px-3">SIGNALS ATTESTED</th>
              <th className="py-2.5 px-3">JUSTIFICATION / AUDIT NOTE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1b202c]">
            {records.map((r: any, i: number) => {
              const isConfirmed = r.decision === 'CONFIRMED';
              const isDismissed = r.decision === 'DISMISSED';
              const timeVal = r.created_at || r.feedback_timestamp;

              return (
                <tr key={r.id || i} className="hover:bg-[#161a23] transition-colors">
                  <td className="py-2.5 px-3 whitespace-nowrap text-[#9ca3af]">
                    {timeVal ? new Date(timeVal).toLocaleString() : 'Recent'}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-white font-medium">
                    {r.analyst_name}
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap">
                    <span
                      className={`px-1.5 py-0.5 rounded-sm font-bold text-[9px] border ${
                        isConfirmed
                          ? 'bg-rose-950/70 border-rose-800 text-rose-300'
                          : isDismissed
                          ? 'bg-emerald-950/70 border-emerald-800 text-emerald-300'
                          : 'bg-amber-950/70 border-amber-800 text-amber-300'
                      }`}
                    >
                      {r.decision}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 whitespace-nowrap text-[#9ca3af]">
                    #{r.alert_id}
                  </td>
                  <td className="py-2.5 px-3 text-[#d1d5db] max-w-[200px] truncate" title={formatSignals(r.signals_snapshot)}>
                    {formatSignals(r.signals_snapshot)}
                  </td>
                  <td className="py-2.5 px-3 text-[#9ca3af] max-w-sm truncate" title={r.justification}>
                    {r.justification}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
};
