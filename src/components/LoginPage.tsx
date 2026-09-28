import React, { useState } from 'react';
import { Shield, Lock, Check, X, ArrowRight, UserCheck, AlertTriangle, KeyRound, Terminal } from 'lucide-react';
import { AuthUser, SecurityRole } from '../types';

interface LoginPageProps {
  onLogin: (user: AuthUser) => void;
  currentUser: AuthUser | null;
  onNavigateToDashboard: () => void;
}

const PRESET_USERS: AuthUser[] = [
  {
    id: 'sec-dir-01',
    username: 'director',
    name: 'Eleanor Vance',
    role: 'security_director',
    roleTitle: 'Security Director',
    email: 'eleanor.vance@sentinel.soc',
    clearance: 'Level 4 — Executive Threat Authority',
    avatarColor: '#f59e0b',
    canEscalate: true,
    canAddEntity: true,
  },
  {
    id: 'sec-asst-02',
    username: 'assistant',
    name: 'Caleb Hayes',
    role: 'assistant_security',
    roleTitle: 'Assistant Security Analyst',
    email: 'caleb.hayes@sentinel.soc',
    clearance: 'Level 2 — Security Operations & Triage',
    avatarColor: '#06b6d4',
    canEscalate: true,
    canAddEntity: false,
  },
];

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  currentUser,
  onNavigateToDashboard,
}) => {
  const [selectedRole, setSelectedRole] = useState<SecurityRole>(
    currentUser?.role || 'security_director'
  );
  const [username, setUsername] = useState(
    currentUser?.role === 'assistant_security' ? 'assistant' : 'director'
  );
  const [password, setPassword] = useState('sentinel2026');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSelectRolePreset = (role: SecurityRole) => {
    setSelectedRole(role);
    if (role === 'security_director') {
      setUsername('director');
    } else {
      setUsername('assistant');
    }
    setPassword('sentinel2026');
    setErrorMsg(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const matched = PRESET_USERS.find(
      (u) => u.username === username.trim().toLowerCase() || u.role === selectedRole
    );

    setTimeout(() => {
      setIsSubmitting(false);
      if (matched) {
        onLogin(matched);
      } else {
        setErrorMsg('Invalid operator credentials. Select Security Director or Assistant Security.');
      }
    }, 200);
  };

  const handleQuickLogin = (user: AuthUser) => {
    onLogin(user);
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-4 font-mono text-xs select-none">
      {/* Terminal Title Banner */}
      <section className="bg-[#0f1218] border border-[#232b3b] p-3 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2 text-amber-500 font-bold">
          <Terminal className="w-4 h-4 text-amber-500" />
          <span className="glow-amber">// OPERATOR AUTHENTICATION &amp; CLEARANCE CONSOLE</span>
        </div>
        <span className="text-[10px] text-[#64748b]">RBAC_MODULE: ACTIVE</span>
      </section>

      {/* Active User Status Banner */}
      {currentUser && (
        <div className="mb-4 p-3 bg-[#121620] border border-[#232b3b] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#181d27] border border-amber-500/50 flex items-center justify-center text-amber-400 font-bold">
              {currentUser.role === 'security_director' ? 'DIR' : 'AST'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-white text-sm">{currentUser.name}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.2 border ${
                    currentUser.role === 'security_director'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                  }`}
                >
                  {currentUser.roleTitle.toUpperCase()}
                </span>
              </div>
              <div className="text-[10px] text-[#8b95a5]">
                SESSION: <span className="text-[#cbd5e1]">{currentUser.clearance}</span>
                {currentUser.canAddEntity ? (
                  <span className="text-emerald-400 ml-2 font-bold">[CAN ONBOARD ENTITIES]</span>
                ) : (
                  <span className="text-rose-400 ml-2 font-bold">[ONBOARDING RESTRICTED]</span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={onNavigateToDashboard}
            className="retro-btn text-amber-300 border-amber-500 hover:bg-amber-500 hover:text-black flex items-center gap-1.5"
          >
            <span>&gt; ENTER OPERATIONS CONSOLE</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2-Card RBAC Role Switcher */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
        {PRESET_USERS.map((preset) => {
          const isSelected = selectedRole === preset.role;
          const isCurrentActive = currentUser?.id === preset.id;
          const isDirector = preset.role === 'security_director';

          return (
            <div
              key={preset.id}
              onClick={() => handleSelectRolePreset(preset.role)}
              className={`p-3.5 border transition-all cursor-pointer flex flex-col justify-between ${
                isSelected
                  ? 'bg-[#141924] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                  : 'bg-[#0f1218] border-[#232b3b] hover:border-[#38455e]'
              }`}
            >
              <div>
                {/* Header tag */}
                <div className="flex items-center justify-between border-b border-[#1f2737] pb-2 mb-2.5">
                  <div>
                    <div className="text-[10px] text-[#64748b]">ROLE CLASSIFICATION:</div>
                    <h3 className="text-sm font-bold text-white glow-amber">{preset.name}</h3>
                    <div className="text-[10px] text-[#94a3b8]">{preset.email}</div>
                  </div>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 font-bold border ${
                      isDirector
                        ? 'bg-amber-950 text-amber-300 border-amber-700'
                        : 'bg-cyan-950 text-cyan-300 border-cyan-700'
                    }`}
                  >
                    {preset.roleTitle.toUpperCase()}
                  </span>
                </div>

                <div className="text-[10px] text-[#8b95a5] mb-3">
                  CLEARANCE: <span className="text-[#cbd5e1]">{preset.clearance}</span>
                </div>

                {/* Permissions matrix */}
                <div className="space-y-1.5 text-[11px] bg-[#090b0f] p-2.5 border border-[#1b2230]">
                  <div className="text-[10px] text-[#64748b] border-b border-[#161c28] pb-1">
                    // PERMISSION CAPABILITIES:
                  </div>

                  {/* Add entity capability */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#cbd5e1]">ONBOARD NEW ENTITY:</span>
                    {preset.canAddEntity ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>[AUTHORIZED (EXCLUSIVE)]</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 font-bold flex items-center gap-1">
                        <X className="w-3 h-3 text-rose-400" />
                        <span>[ACCESS DENIED: DIRECTOR ONLY]</span>
                      </span>
                    )}
                  </div>

                  {/* Escalate Incidents */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#cbd5e1]">ESCALATE THREATS:</span>
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>[AUTHORIZED]</span>
                    </span>
                  </div>

                  {/* Model Recalibration */}
                  <div className="flex items-center justify-between">
                    <span className="text-[#cbd5e1]">RECALIBRATE BASELINE:</span>
                    {isDirector ? (
                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span>[AUTHORIZED]</span>
                      </span>
                    ) : (
                      <span className="text-[#64748b] font-bold">
                        <span>[READ-ONLY ACCESS]</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-2.5 border-t border-[#1f2737] flex items-center justify-between">
                <span className="text-[10px] text-[#64748b]">
                  {isDirector ? 'Executive L4 Clearance' : 'Analyst L2 Operations'}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleQuickLogin(preset);
                  }}
                  className={`retro-btn ${
                    isCurrentActive
                      ? 'bg-amber-500 text-black border-amber-400 font-bold'
                      : isDirector
                      ? 'text-amber-300 border-amber-800 hover:bg-amber-500 hover:text-black'
                      : 'text-cyan-300 border-cyan-800 hover:bg-cyan-500 hover:text-black'
                  }`}
                >
                  <UserCheck className="w-3 h-3 inline mr-1" />
                  <span>{isCurrentActive ? 'CURRENT SESSION' : `LOGIN AS ${preset.roleTitle.toUpperCase()}`}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Manual Terminal Auth Form */}
      <div className="bg-[#0f1218] border border-[#232b3b] p-4 max-w-xl mx-auto space-y-3">
        <div className="text-[10px] text-amber-500 font-bold border-b border-[#1f2737] pb-1 flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-amber-500" />
          <span>// TERMINAL CREDENTIALS VERIFICATION</span>
        </div>

        <div className="text-[11px] text-[#8b95a5]">
          SELECTED PROFILE: <strong className="text-amber-400">{selectedRole === 'security_director' ? 'SECURITY DIRECTOR (Eleanor Vance)' : 'ASSISTANT ANALYST (Caleb Hayes)'}</strong>
        </div>

        {errorMsg && (
          <div className="p-2 bg-[#201518] border border-rose-600/50 text-rose-300 text-[10px] flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-2.5">
          <div className="space-y-1">
            <label className="text-[10px] text-[#64748b]">OPERATOR USERNAME:</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] text-[#64748b]">SECURITY PASSPHRASE:</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-white outline-none focus:border-amber-500"
            />
          </div>

          <div className="pt-2 flex justify-between items-center">
            <span className="text-[9px] text-[#475569]">DEFAULT PWD: sentinel2026</span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="retro-btn text-amber-300 border-amber-500 hover:bg-amber-500 hover:text-black font-bold"
            >
              {isSubmitting ? 'AUTHENTICATING...' : '&gt; VERIFY CREDENTIALS &amp; LOGIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
