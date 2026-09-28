import React from 'react';
import {
  Shield,
  Users,
  AlertTriangle,
  SlidersHorizontal,
  RefreshCw,
  UserPlus,
  Lock,
  LogIn,
  Activity,
  Radio,
  Compass,
  Zap,
} from 'lucide-react';
import { User, AuthUser } from '../types';

export type AppView = 'landing' | 'unified' | 'oversight' | 'priority' | 'live' | 'posture' | 'login';

interface HeaderProps {
  activeView: AppView;
  setActiveView: (view: AppView) => void;
  users: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  onResetSeed: () => void;
  isSeeding: boolean;
  pendingAlertsCount: number;
  currentUser: AuthUser | null;
  onOpenAddEntity: () => void;
  isWsConnected?: boolean;
  onToggleLive?: () => void;
  feedbackCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeView,
  setActiveView,
  users,
  selectedUserId,
  onSelectUser,
  onResetSeed,
  isSeeding,
  pendingAlertsCount,
  currentUser,
  onOpenAddEntity,
  isWsConnected = true,
  onToggleLive,
  feedbackCount = 0,
}) => {
  const selectedUser = users.find((u) => u.id === selectedUserId);
  const isDirector = currentUser?.role === 'security_director';

  return (
    <header className="bg-[#0e0e0e] border-b border-white/10 sticky top-0 z-40 px-3 lg:px-6 py-2 shadow-xl backdrop-blur-md">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row items-start xl:items-center justify-between gap-2.5">
        {/* Brand & Project Metadata */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveView('unified')}
            className="flex items-center gap-2.5 group text-left"
          >
            <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-orange-500 to-rose-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20 group-hover:scale-105 transition">
              <Shield className="h-4 w-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white tracking-tight group-hover:text-orange-300 transition">
                  UEBA Sentinel
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-[10px] font-mono">
                  <span className={`w-1.5 h-1.5 rounded-full ${isWsConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                  <span>{isWsConnected ? 'WS LIVE' : 'CONNECTING'}</span>
                </div>
              </div>
              <p className="text-[10px] text-neutral-400 hidden sm:block">
                Sub-Second Scoring &bull; Early Warning &bull; Dynamic FP Downweighting
              </p>
            </div>
          </button>
        </div>

        {/* Navigation Tabs (All Core & Team Feature Views) */}
        <nav className="flex items-center flex-wrap bg-[#151515] p-1 rounded-xl border border-white/10 text-xs font-medium gap-0.5">
          <button
            onClick={() => setActiveView('unified')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              activeView === 'unified'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Goal 1: Unified Dossier & Circadian Trend"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Unified View</span>
          </button>

          <button
            onClick={() => setActiveView('priority')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              activeView === 'priority'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Goal 3: Smarter Alert Prioritization Queue"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Priority Queue</span>
          </button>

          <button
            onClick={() => setActiveView('live')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all relative ${
              activeView === 'live'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Goals 4, 6, 7, 8: Live WebSocket Stream & Pre-Incident Early Warning"
          >
            <Radio className="h-3.5 w-3.5 text-orange-400 animate-pulse" />
            <span>Live & Early Warning</span>
          </button>

          <button
            onClick={() => setActiveView('oversight')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all relative ${
              activeView === 'oversight'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Goal 2: AI Detection & Human Oversight"
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            <span>Oversight</span>
            {pendingAlertsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500 text-[10px] text-white font-bold animate-pulse">
                {pendingAlertsCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveView('posture')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              activeView === 'posture'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Goals 5 & 9: Security Posture Panel & False-Positive Down-weighting"
          >
            <Compass className="h-3.5 w-3.5 text-emerald-400" />
            <span>Posture & FP</span>
          </button>

          <button
            onClick={() => setActiveView('login')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all ${
              activeView === 'login'
                ? 'bg-gradient-to-r from-orange-500 to-rose-600 text-white font-semibold shadow-sm'
                : 'text-neutral-400 hover:text-white hover:bg-neutral-800/80'
            }`}
            title="Role-Based Access Control"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">RBAC</span>
          </button>
        </nav>

        {/* Global Controls: User Switcher, Add Entity, Operator Badge, Reset */}
        <div className="flex items-center flex-wrap gap-2 self-stretch xl:self-auto justify-between xl:justify-end">
          {/* Add Entity Button (Restricted to Security Director) */}
          <button
            onClick={onOpenAddEntity}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              isDirector
                ? 'bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 shadow-sm'
                : 'bg-neutral-800/70 hover:bg-neutral-800 text-neutral-400 border border-white/10'
            }`}
            title={
              isDirector
                ? 'Onboard New Monitored Entity (Authorized for Security Director)'
                : 'Onboard New Entity (Restricted: Security Director authorization required)'
            }
          >
            {isDirector ? (
              <UserPlus className="h-3.5 w-3.5 text-orange-400" />
            ) : (
              <Lock className="h-3.5 w-3.5 text-rose-400" />
            )}
            <span className="hidden sm:inline">
              {isDirector ? '+ Add Entity' : 'Add Entity'}
            </span>
          </button>

          {/* Monitored Entity selector */}
          <div className="flex items-center gap-1.5 bg-[#171717] border border-white/10 rounded-lg px-2.5 py-1.5">
            <span className="text-[11px] text-neutral-400 hidden sm:inline">Entity:</span>
            <select
              value={selectedUserId}
              onChange={(e) => onSelectUser(e.target.value)}
              className="bg-transparent text-xs text-neutral-100 font-medium focus:outline-none cursor-pointer pr-1 max-w-[130px] sm:max-w-[170px] truncate"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id} className="bg-[#171717] text-neutral-200">
                  {u.name} ({u.risk_score >= 80 ? 'CRITICAL' : u.risk_score >= 60 ? 'HIGH' : 'Normal'} &bull; {u.department})
                </option>
              ))}
            </select>
            {selectedUser && (
              <div
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{
                  backgroundColor:
                    selectedUser.risk_score >= 80
                      ? '#ef4444'
                      : selectedUser.risk_score >= 60
                      ? '#f59e0b'
                      : '#10b981',
                }}
                title={`Risk Score: ${selectedUser.risk_score}/100`}
              />
            )}
          </div>

          {/* Current Operator Profile Pill */}
          {currentUser && (
            <button
              onClick={() => setActiveView('login')}
              className="flex items-center gap-1.5 bg-[#171717] hover:bg-neutral-800 border border-white/10 rounded-lg px-2.5 py-1.5 transition text-left"
              title={`Logged in as ${currentUser.name} (${currentUser.roleTitle}). Click to switch operator.`}
            >
              <div
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] text-white font-bold"
                style={{ backgroundColor: currentUser.avatarColor }}
              >
                {currentUser.name[0]}
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="text-[11px] font-bold text-white leading-none flex items-center gap-1">
                  <span>{currentUser.name.split(' ')[0]}</span>
                  <span
                    className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded border leading-none ${
                      isDirector
                        ? 'bg-orange-950/80 text-orange-400 border-orange-700/50'
                        : 'bg-sky-950/80 text-sky-400 border-sky-700/50'
                    }`}
                  >
                    {isDirector ? 'Director' : 'Assistant'}
                  </span>
                </span>
              </div>
            </button>
          )}

          {/* Synthetic Data Reset / Re-seed */}
          <button
            onClick={onResetSeed}
            disabled={isSeeding}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#171717] hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs border border-white/10 transition disabled:opacity-50"
            title="Reset 30-day synthetic dataset with simulated anomalies"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSeeding ? 'animate-spin text-orange-400' : ''}`} />
          </button>
        </div>
      </div>
    </header>
  );
};
