import React, { useState, useEffect } from 'react';
import { User, AuthUser } from '../types';
import { RefreshCw, Terminal, LogOut, Lock, UserPlus } from 'lucide-react';

interface TopBarProps {
  users: User[];
  selectedUserId: string;
  onSelectUser: (id: string) => void;
  currentUser: AuthUser | null;
  onResetSeed: () => void;
  isSeeding: boolean;
  isWsConnected?: boolean;
  onOpenLogin?: () => void;
  onOpenAddEntity?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  users,
  selectedUserId,
  onSelectUser,
  currentUser,
  onResetSeed,
  isSeeding,
  isWsConnected = true,
  onOpenLogin,
  onOpenAddEntity,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const isDirector = currentUser?.role === 'security_director';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const h = String(now.getUTCHours()).padStart(2, '0');
      const m = String(now.getUTCMinutes()).padStart(2, '0');
      const s = String(now.getUTCSeconds()).padStart(2, '0');
      setTimeStr(`${h}:${m}:${s} UTC`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-10 bg-[#0c0e14] border-b border-[#232b3b] px-3 flex items-center justify-between font-mono text-[11px] select-none sticky top-0 z-40">
      {/* Left: Terminal system banner & status telemetry */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-amber-500 font-bold tracking-wider">
          <Terminal className="w-3.5 h-3.5 text-amber-500" />
          <span className="glow-amber">UEBA SENTINEL</span>
          <span className="text-[#64748b] font-normal text-[10px]">// UNIX/SOC-88</span>
        </div>

        <span className="text-[#2b3548]">|</span>

        {/* Connection status with retro blinking phosphor */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-none inline-block ${
              isWsConnected ? 'bg-emerald-400 glow-green' : 'bg-amber-400 glow-amber'
            } cursor-blink`}
          />
          <span className={isWsConnected ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
            {isWsConnected ? 'ONLINE' : 'RECONNECTING'}
          </span>
        </div>

        <span className="text-[#2b3548] hidden sm:inline">|</span>

        {/* Clock & Environment */}
        <div className="hidden sm:flex items-center gap-3 text-[#8b95a5]">
          <span>
            TIME: <span className="text-[#e2e8f0] font-semibold">{timeStr || '20:42:18 UTC'}</span>
          </span>
          <span className="text-[#2b3548]">|</span>
          <span>
            ENV: <span className="text-amber-300">PRODUCTION</span>
          </span>
        </div>
      </div>

      {/* Right: Retro entity selector & workstation controls */}
      <div className="flex items-center gap-2">
        {/* Onboard Entity button */}
        {onOpenAddEntity && (
          <button
            onClick={onOpenAddEntity}
            className={`retro-btn flex items-center gap-1 text-[10px] ${
              isDirector
                ? 'text-emerald-300 border-emerald-700/80 hover:bg-emerald-500 hover:text-black font-bold'
                : 'text-[#8b95a5] border-[#283244] hover:border-rose-600 hover:text-rose-400'
            }`}
            title={
              isDirector
                ? 'Onboard a new monitored entity (Director Clearance Verified)'
                : 'Onboarding is restricted to Security Director only'
            }
          >
            {isDirector ? (
              <>
                <UserPlus className="w-3 h-3 text-emerald-400" />
                <span>+ ONBOARD ENTITY</span>
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 text-rose-400" />
                <span>+ ONBOARD (DIR ONLY)</span>
              </>
            )}
          </button>
        )}

        {/* Retro Entity Selector */}
        <div className="flex items-center gap-1 bg-[#121620] border border-[#263145] px-2 py-0.5 text-[10px]">
          <span className="text-amber-500 font-bold">&gt; ENTITY:</span>
          <select
            value={selectedUserId}
            onChange={(e) => onSelectUser(e.target.value)}
            className="bg-transparent text-[#e2e8f0] font-mono outline-none cursor-pointer text-[10px]"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id} className="bg-[#0f121a] text-[#e2e8f0]">
                {u.name} [{u.department.slice(0, 3).toUpperCase()}] R:{u.risk_score}
              </option>
            ))}
          </select>
        </div>

        {/* Recalibrate button */}
        <button
          onClick={onResetSeed}
          disabled={isSeeding}
          className="retro-btn hidden md:flex items-center gap-1 text-[10px] disabled:opacity-50"
          title="Recalibrate 30-day baseline model"
        >
          <RefreshCw className={`w-3 h-3 text-amber-400 ${isSeeding ? 'animate-spin' : ''}`} />
          <span>&gt; RECALIBRATE</span>
        </button>

        {/* Operator Tag & Logout / Switch User Button */}
        <div className="flex items-center gap-2 border-l border-[#232b3b] pl-2.5 text-[10px]">
          <div className="hidden lg:flex items-center gap-1 text-[#8b95a5]">
            <span>OP:</span>
            <span className={`font-bold ${isDirector ? 'text-amber-400' : 'text-cyan-400'}`}>
              {currentUser?.name.toUpperCase() || 'E. VANCE'}
            </span>
            <span className="text-[#64748b]">
              [{isDirector ? 'DIR-L4' : 'ASST-L2'}]
            </span>
          </div>

          {onOpenLogin && (
            <button
              onClick={onOpenLogin}
              className="retro-btn text-[10px] flex items-center gap-1.5 text-rose-300 border-rose-800/80 hover:bg-rose-600 hover:text-white hover:border-rose-500 font-bold transition-all shadow-sm"
              title="Logout current operator session and switch between Security Director and Assistant Security Analyst"
            >
              <LogOut className="w-3 h-3 text-rose-400" />
              <span>[LOGOUT / SWITCH USER]</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
