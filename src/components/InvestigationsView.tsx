import React, { useState } from 'react';
import { User } from '../types';
import { Search, FolderKanban, ShieldCheck, Clock, FileText } from 'lucide-react';

interface InvestigationsViewProps {
  users: User[];
  onSelectUser: (id: string) => void;
  onNavigateToView: (view: any) => void;
}

export const InvestigationsView: React.FC<InvestigationsViewProps> = ({
  users,
  onSelectUser,
  onNavigateToView,
}) => {
  const [activeTab, setActiveTab] = useState<'OPEN' | 'CLOSED'>('OPEN');

  const cases = [
    {
      id: 'INV-2026-0924-01',
      entityId: 'sophia.chen',
      entityName: 'Sophia Chen',
      department: 'Human Resources',
      title: 'Bulk resume download & unauthorized off-hours staging',
      openedAt: '2026-09-24 20:22:10 UTC',
      status: 'UNDER_ANALYSIS',
      leadAnalyst: 'E. Vance [SecOps L4]',
      findingsCount: 4,
      riskScore: 99,
      notes: 'User downloaded 45.2 MB candidate resume archive from Munich origin IP. Step-Up MFA challenged.'
    },
    {
      id: 'INV-2026-0923-04',
      entityId: 'marcus.vance',
      entityName: 'Marcus Vance',
      department: 'Finance',
      title: 'Off-hours database dump from Tor exit node',
      openedAt: '2026-09-23 03:14:00 UTC',
      status: 'CONTAINED',
      leadAnalyst: 'E. Vance [SecOps L4]',
      findingsCount: 6,
      riskScore: 79,
      notes: 'Credentials isolated. API session keys revoked after payroll database query anomaly.'
    }
  ];

  return (
    <div className="space-y-4 pb-12 text-xs font-sans">
      <section className="bg-[#12151c] border border-[#202634] p-3 rounded-sm flex items-center justify-between font-mono">
        <div className="flex items-center gap-2">
          <span className="text-[#737c8e] uppercase text-[10px]">Case Status:</span>
          {(['OPEN', 'CLOSED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-1 rounded-sm text-[10px] transition-colors ${
                activeTab === tab
                  ? 'bg-[#1b2230] text-amber-300 border border-amber-500/40 font-bold'
                  : 'bg-[#0f1218] text-[#8b92a0] border border-[#202634]'
              }`}
            >
              {tab === 'OPEN' ? 'Active Inquiries' : 'Resolved Archives'}
            </button>
          ))}
        </div>

        <span className="text-[#6b7280] text-[11px]">
          2 Active Case Dossiers
        </span>
      </section>

      <section className="space-y-3">
        {cases.map((cs) => (
          <div
            key={cs.id}
            className="bg-[#12151c] border border-[#202634] p-4 rounded-sm space-y-3"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-[#1b202c] pb-3">
              <div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-[#6b7280]">
                  <span>{cs.id}</span>
                  <span>&bull;</span>
                  <span>Opened: {cs.openedAt}</span>
                  <span>&bull;</span>
                  <span>Lead: {cs.leadAnalyst}</span>
                </div>
                <h3 className="text-sm font-bold text-white mt-1">{cs.title}</h3>
              </div>

              <div className="flex items-center gap-3 font-mono">
                <span className="px-2 py-0.5 rounded-sm bg-amber-950/70 border border-amber-800 text-amber-300 font-bold text-[10px]">
                  {cs.status}
                </span>
                <button
                  onClick={() => {
                    onSelectUser(cs.entityId);
                    onNavigateToView('entities');
                  }}
                  className="px-2.5 py-1 bg-[#181d27] hover:bg-[#202736] border border-[#2d374d] text-amber-300 text-[10px] rounded-sm transition-colors"
                >
                  Open Entity Dossier &rarr;
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 font-mono text-[11px] text-[#9ca3af]">
              <div className="p-2.5 bg-[#0f1218] border border-[#1d2330] rounded-sm">
                <div className="text-[10px] text-[#6b7280]">Target Entity:</div>
                <div className="text-white font-medium">{cs.entityName} ({cs.department})</div>
              </div>
              <div className="p-2.5 bg-[#0f1218] border border-[#1d2330] rounded-sm">
                <div className="text-[10px] text-[#6b7280]">Current Risk Level:</div>
                <div className="text-rose-400 font-bold">{cs.riskScore} / 100 (CRITICAL)</div>
              </div>
              <div className="p-2.5 bg-[#0f1218] border border-[#1d2330] rounded-sm">
                <div className="text-[10px] text-[#6b7280]">Corroborated Findings:</div>
                <div className="text-white font-medium">{cs.findingsCount} behavioral signals</div>
              </div>
            </div>

            <div className="p-3 bg-[#151922] border border-[#202634] rounded-sm text-[11px] text-[#d1d5db]">
              <div className="text-[10px] font-mono text-[#6b7280] uppercase mb-1">Analyst Case Notes:</div>
              <p>{cs.notes}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
};
