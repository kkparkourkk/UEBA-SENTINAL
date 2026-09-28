import React from 'react';
import { User, PostureMetrics, FalsePositiveMetric, AlertIncident } from '../types';
import { ArrowRight, Terminal } from 'lucide-react';

interface OverviewViewProps {
  users: User[];
  alerts: AlertIncident[];
  posture: PostureMetrics | null;
  fpMetrics: FalsePositiveMetric[];
  onSelectUser: (id: string) => void;
  onNavigateToView: (view: any) => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  users,
  alerts,
  posture,
  onSelectUser,
  onNavigateToView,
}) => {
  const criticalUsers = users.filter((u) => u.risk_score >= 80);
  const elevatedUsers = users.filter((u) => u.risk_score >= 50 && u.risk_score < 80);

  const proactiveRatio = posture?.proactiveRatio || 78;
  const leadTimeHours = posture?.avgLeadTimeHours || 4.2;

  // Department baseline summary
  const deptMap = users.reduce((acc, u) => {
    if (!acc[u.department]) acc[u.department] = { count: 0, sumRisk: 0, highest: 0 };
    acc[u.department].count += 1;
    acc[u.department].sumRisk += u.risk_score;
    if (u.risk_score > acc[u.department].highest) acc[u.department].highest = u.risk_score;
    return acc;
  }, {} as Record<string, { count: number; sumRisk: number; highest: number }>);

  return (
    <div className="space-y-3 pb-12 font-mono text-xs select-none">
      {/* Top Section Header */}
      <div className="text-[10px] text-amber-500 font-bold border-b border-[#232b3b] pb-1 flex items-center justify-between">
        <span>// SYSTEM LANDSCAPE TELEMETRY</span>
        <span className="text-[#64748b]">[STATUS: NORMAL_MONITORING]</span>
      </div>

      {/* Top Metric Strip - Restrained Terminal Telemetry */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        <div className="bg-[#0f1218] border border-[#232b3b] p-2.5 space-y-1">
          <div className="text-[10px] text-[#64748b]">// MONITORED ENTITIES</div>
          <div className="text-xl font-bold text-white glow-amber">{users.length} PRINCIPALS</div>
          <div className="text-[10px] text-[#8b95a5]">
            <span className="text-rose-400 font-bold">{criticalUsers.length} CRITICAL</span>, {elevatedUsers.length} ELEVATED
          </div>
        </div>

        <div className="bg-[#0f1218] border border-[#232b3b] p-2.5 space-y-1">
          <div className="text-[10px] text-[#64748b]">// ACTIVE INCIDENTS</div>
          <div className="text-xl font-bold text-amber-400 glow-amber">{alerts.length} FLAGGED</div>
          <div className="text-[10px] text-[#8b95a5]">SORTED BY EWMA PRIORITY</div>
        </div>

        <div className="bg-[#0f1218] border border-[#232b3b] p-2.5 space-y-1">
          <div className="text-[10px] text-[#64748b]">// PROACTIVE PREEMPTION</div>
          <div className="text-xl font-bold text-emerald-400 glow-green">{proactiveRatio}% RATIO</div>
          <div className="text-[10px] text-[#8b95a5]">PRE-INCIDENT INTERCEPTIONS</div>
        </div>

        <div className="bg-[#0f1218] border border-[#232b3b] p-2.5 space-y-1">
          <div className="text-[10px] text-[#64748b]">// DETECTION BUFFER</div>
          <div className="text-xl font-bold text-cyan-400 glow-cyan">{leadTimeHours} HRS LEAD</div>
          <div className="text-[10px] text-[#8b95a5]">EARLY WARNING HEAD START</div>
        </div>
      </section>

      {/* Main Grid: Priority Attention Entities & Department Baselines */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* High Risk Entities (Left 7 cols) */}
        <section className="lg:col-span-7 bg-[#0f1218] border border-[#232b3b] p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-[#1f2737] pb-1">
            <span className="text-[10px] text-amber-500 font-bold">// HIGH RISK PRINCIPALS</span>
            <button
              onClick={() => onNavigateToView('entities')}
              className="text-amber-400 hover:underline text-[10px] flex items-center gap-1"
            >
              <span>[OPEN ENTITY DOSSIER]</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="border border-[#1f2737] bg-[#090b0f] overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px] border-collapse">
              <thead className="bg-[#0d1016] border-b border-[#1f2737] text-[#64748b] text-[10px]">
                <tr>
                  <th className="py-1.5 px-2.5">PRINCIPAL</th>
                  <th className="py-1.5 px-2.5">DEPARTMENT</th>
                  <th className="py-1.5 px-2.5 text-center">RISK</th>
                  <th className="py-1.5 px-2.5">SEVERITY</th>
                  <th className="py-1.5 px-2.5 text-right">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#171e2c]">
                {users.slice(0, 6).map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-[#121620] cursor-pointer transition-colors"
                    onClick={() => {
                      onSelectUser(u.id);
                      onNavigateToView('entities');
                    }}
                  >
                    <td className="py-1.5 px-2.5 font-medium text-white">
                      {u.name}
                      {u.is_privileged && (
                        <span className="ml-1.5 text-[9px] px-1 py-0.2 bg-[#1b2230] text-amber-300 border border-[#2c374d]">
                          PRIV
                        </span>
                      )}
                    </td>
                    <td className="py-1.5 px-2.5 text-[#94a3b8]">{u.department}</td>
                    <td className="py-1.5 px-2.5 text-center font-bold text-rose-400">{u.risk_score}</td>
                    <td className="py-1.5 px-2.5">
                      <span
                        className={`text-[9px] px-1 py-0.2 font-bold ${
                          u.risk_score >= 80
                            ? 'bg-rose-950 text-rose-300 border border-rose-800'
                            : u.risk_score >= 50
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}
                      >
                        {u.risk_score >= 80 ? 'CRITICAL' : u.risk_score >= 50 ? 'ELEVATED' : 'NOMINAL'}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 text-right text-amber-400 hover:text-white">
                      [INSPECT &gt;]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Department Baselines & Signal Attenuation (Right 5 cols) */}
        <section className="lg:col-span-5 space-y-3">
          {/* Department Baselines */}
          <div className="bg-[#0f1218] border border-[#232b3b] p-3 space-y-2">
            <div className="text-[10px] text-amber-500 font-bold border-b border-[#1f2737] pb-1">
              // DEPARTMENT BASELINE SUMMARY
            </div>

            <div className="space-y-1.5 text-[11px]">
              {Object.entries(deptMap).map(([dept, stats]) => {
                const avg = Math.round(stats.sumRisk / stats.count);
                return (
                  <div key={dept} className="p-2 bg-[#121620] border border-[#1f2737]">
                    <div className="flex justify-between text-white font-medium">
                      <span>{dept.toUpperCase()}</span>
                      <span className="text-[#64748b] text-[10px]">{stats.count} PRINCIPALS</span>
                    </div>
                    <div className="flex justify-between text-[#8b95a5] pt-0.5 text-[10px]">
                      <span>BASELINE MEAN: <strong className="text-[#cbd5e1]">{avg}</strong></span>
                      <span>MAX RECORDED: <strong className={stats.highest >= 80 ? 'text-rose-400' : 'text-amber-400'}>{stats.highest}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dynamic Signal Weighting Status */}
          <div className="bg-[#0f1218] border border-[#232b3b] p-3 space-y-1.5">
            <div className="text-[10px] text-cyan-400 font-bold border-b border-[#1f2737] pb-1">
              // SIGNAL NOISE ATTENUATION (CLOSED-LOOP)
            </div>
            <div className="space-y-1 text-[10px] text-[#cbd5e1]">
              <div className="flex justify-between p-1 bg-[#121620] border border-[#1b2230]">
                <span>RULE_ODD_HOURS:</span>
                <span className="text-emerald-400 font-bold">0.65x (-35% noise down-weight)</span>
              </div>
              <div className="flex justify-between p-1 bg-[#121620] border border-[#1b2230]">
                <span>RULE_IMPOSSIBLE_TRAVEL:</span>
                <span className="text-emerald-400 font-bold">0.85x (-15% down-weight)</span>
              </div>
              <div className="flex justify-between p-1 bg-[#121620] border border-[#1b2230]">
                <span>RULE_VOLUME_SPIKE:</span>
                <span className="text-[#94a3b8]">1.00x (Standard weight)</span>
              </div>
              <div className="flex justify-between p-1 bg-[#121620] border border-[#1b2230]">
                <span>RULE_EWMA_DRIFT:</span>
                <span className="text-rose-400 font-bold">1.20x (+20% boosted)</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};
