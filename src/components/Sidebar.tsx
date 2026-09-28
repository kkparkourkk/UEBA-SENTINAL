import React from 'react';
import { AppView } from '../types';
import {
  Terminal,
  Activity,
  AlertTriangle,
  Bell,
  FileText,
  Sliders,
  Users,
} from 'lucide-react';

interface SidebarProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  pendingAlertsCount?: number;
}

interface NavCommand {
  id: AppView;
  label: string;
  command: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  pendingAlertsCount = 0,
}) => {
  // Normalize alias views to main retro terminal keys
  const normalizedActive = (() => {
    if (activeView === 'unified') return 'entities';
    if (activeView === 'priority') return 'alerts';
    if (activeView === 'oversight') return 'anomalies';
    if (activeView === 'live') return 'activity';
    if (activeView === 'posture' || activeView === 'landing') return 'overview';
    return activeView;
  })();

  const commands: NavCommand[] = [
    { id: 'overview', label: 'OVERVIEW', command: '01_OVERVIEW', icon: Terminal },
    { id: 'entities', label: 'ENTITIES', command: '02_ENTITIES', icon: Users },
    { id: 'activity', label: 'ACTIVITY', command: '03_ACTIVITY', icon: Activity },
    { id: 'anomalies', label: 'ANOMALIES', command: '04_ANOMALIES', icon: AlertTriangle },
    { id: 'alerts', label: 'ALERTS', command: '05_ALERTS', icon: Bell, badge: pendingAlertsCount },
    { id: 'audit', label: 'AUDIT LOG', command: '06_AUDIT_LOG', icon: FileText },
    { id: 'settings', label: 'SETTINGS', command: '07_SETTINGS', icon: Sliders },
  ];

  return (
    <aside className="w-48 flex-shrink-0 bg-[#0a0c10] border-r border-[#232b3b] flex flex-col justify-between select-none font-mono text-xs">
      {/* Top Section / Command List */}
      <div>
        {/* Terminal Header Bar */}
        <div className="px-3 py-2 bg-[#0e1218] border-b border-[#232b3b] text-[10px] text-[#64748b] tracking-wider flex items-center justify-between">
          <span>// NAVIGATION</span>
          <span className="text-amber-500/80">VT100</span>
        </div>

        {/* Navigation Items formatted like a UNIX console menu */}
        <nav className="p-1.5 space-y-0.5">
          {commands.map((cmd) => {
            const isActive = normalizedActive === cmd.id;
            const Icon = cmd.icon;

            return (
              <button
                key={cmd.id}
                onClick={() => setActiveView(cmd.id)}
                className={`w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-mono tracking-wide text-left transition-all border ${
                  isActive
                    ? 'bg-amber-500 text-black border-amber-400 font-bold shadow-sm'
                    : 'bg-transparent text-[#94a3b8] border-transparent hover:border-[#2a3449] hover:bg-[#121620] hover:text-[#e2e8f0]'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={isActive ? 'text-black font-extrabold' : 'text-amber-500'}>
                    {isActive ? '>' : ' '}
                  </span>
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{cmd.label}</span>
                </div>

                {cmd.badge !== undefined && cmd.badge > 0 && (
                  <span
                    className={`px-1 py-0.2 text-[9px] font-mono ${
                      isActive
                        ? 'bg-black text-amber-400'
                        : 'bg-[#1b2230] text-rose-400 border border-rose-900/60'
                    }`}
                  >
                    [{cmd.badge}]
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Retro ASCII System Status Box at bottom */}
      <div className="p-2.5 border-t border-[#232b3b] bg-[#0c0e14] text-[10px] text-[#64748b] space-y-1 font-mono">
        <div className="text-amber-500/80 font-bold border-b border-[#1b2230] pb-0.5 flex items-center justify-between">
          <span>[SYS MONITOR]</span>
          <span className="text-emerald-400">● LIVE</span>
        </div>
        <div className="flex justify-between text-[#8b95a5]">
          <span>BUFFER:</span>
          <span className="text-[#cbd5e1]">64 KB</span>
        </div>
        <div className="flex justify-between text-[#8b95a5]">
          <span>EWMA DRIFT:</span>
          <span className="text-amber-400">+28.4%</span>
        </div>
        <div className="flex justify-between text-[#8b95a5]">
          <span>SCORING:</span>
          <span className="text-emerald-400">SUB-50ms</span>
        </div>
        <div className="text-[9px] text-[#475569] pt-0.5 text-center">
          ───────────────────────
        </div>
        <div className="text-[9px] text-center text-[#475569]">
          TERM: /dev/pts/0
        </div>
      </div>
    </aside>
  );
};
