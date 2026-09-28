import React, { useState } from 'react';
import { Terminal, UserPlus, X, Lock, CheckCircle, AlertTriangle, Clock, HardDrive, UserCheck } from 'lucide-react';
import { AuthUser, User } from '../types';

interface AddEntityModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AuthUser | null;
  onEntityCreated: (user: User) => void;
  onOpenLogin?: () => void;
}

const DEPARTMENTS = [
  'Engineering',
  'Human Resources',
  'Finance',
  'IT Support',
  'Executive Operations',
  'Legal & Compliance',
];

export const AddEntityModal: React.FC<AddEntityModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onEntityCreated,
  onOpenLogin,
}) => {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('Engineering');
  const [roleTitle, setRoleTitle] = useState('DevOps Security Engineer');
  const [isPrivileged, setIsPrivileged] = useState(false);
  const [typicalStartHour, setTypicalStartHour] = useState(9);
  const [typicalEndHour, setTypicalEndHour] = useState(18);
  const [baselineBytesMB, setBaselineBytesMB] = useState(50);
  const [customId, setCustomId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const isDirector = currentUser?.role === 'security_director';

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setName(val);
    if (!customId) {
      setCustomId(val.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isDirector) {
      setErrorMsg('Access Denied: Only Security Director has clearance to onboard entities.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const generatedId = customId.trim() || name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.');
      const res = await fetch('/api/entities', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-role': currentUser?.role || '',
        },
        body: JSON.stringify({
          callerRole: currentUser?.role,
          name: name.trim(),
          id: generatedId,
          department,
          role: roleTitle.trim(),
          isPrivileged,
          typicalStartHour: Number(typicalStartHour),
          typicalEndHour: Number(typicalEndHour),
          baselineDailyBytesMB: Number(baselineBytesMB),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to onboard entity');
      }

      setSuccessMsg(data.message || 'Entity successfully onboarded into UEBA Sentinel!');
      setTimeout(() => {
        onEntityCreated(data.user);
        onClose();
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while onboarding entity.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-3 font-mono text-xs select-none">
      <div className="bg-[#0c0e14] border border-[#263145] max-w-xl w-full p-4 relative shadow-2xl space-y-3">
        {/* Terminal Header */}
        <div className="flex items-center justify-between border-b border-[#232b3b] pb-2 text-amber-500 font-bold">
          <div className="flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5 text-amber-500" />
            <span className="glow-amber">// ONBOARD MONITORED PRINCIPAL</span>
          </div>
          <button
            onClick={onClose}
            className="text-[#64748b] hover:text-white"
          >
            [X]
          </button>
        </div>

        {/* Security Clearance Status Banner */}
        <div className="flex items-center justify-between p-2 bg-[#121620] border border-[#1f2737] text-[10px]">
          <div>
            <span>ACTIVE OPERATOR: </span>
            <strong className="text-white">{currentUser?.name.toUpperCase() || 'UNAUTHENTICATED'}</strong>
            <span className="text-[#8b95a5] ml-1">[{currentUser?.roleTitle.toUpperCase() || 'GUEST'}]</span>
          </div>
          <div>
            {isDirector ? (
              <span className="text-emerald-400 font-bold">[DIRECTOR CLEARANCE: AUTHORIZED]</span>
            ) : (
              <span className="text-rose-400 font-bold">[ACCESS RESTRICTED: REQUIRES DIRECTOR]</span>
            )}
          </div>
        </div>

        {/* =========================================================================
            IF NOT SECURITY DIRECTOR -> DISPLAY RBAC CLEARANCE LOCKOUT
           ========================================================================= */}
        {!isDirector ? (
          <div className="space-y-3 py-2">
            <div className="p-3 bg-[#1e1418] border border-rose-800 text-rose-200 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-400 font-bold">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>ERROR 403: EXECUTIVE AUTHORIZATION REQUIRED</span>
              </div>
              <p className="text-[11px] text-rose-200/90 leading-relaxed">
                Registering a new monitored principal into the 30-day circadian UEBA baseline engine is strictly restricted to the <strong>Security Director (Level 4 Authority)</strong>.
              </p>
              <div className="text-[10px] text-rose-300/70 pt-1">
                Current Operator: {currentUser?.name} holds Level 2 Assistant Operations clearance.
              </div>
            </div>

            <div className="p-3 bg-[#0f1218] border border-[#232b3b] space-y-1 text-[#8b95a5]">
              <div className="text-white font-bold text-[10px]">// ASSISTANT ANALYST DUTIES:</div>
              <div>• Triage prioritized anomaly feeds</div>
              <div>• Corroborate high-risk entity activity logs</div>
              <div>• Dispatch Step-Up MFA challenges</div>
              <div>• Submit heuristic false-positive feedback</div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#1f2737]">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn text-[#8b95a5]"
              >
                [CANCEL / CLOSE]
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  if (onOpenLogin) onOpenLogin();
                }}
                className="retro-btn text-amber-300 border-amber-600 hover:bg-amber-500 hover:text-black font-bold flex items-center gap-1.5"
              >
                <UserCheck className="w-3.5 h-3.5" />
                <span>&gt; SWITCH TO SECURITY DIRECTOR (ELEANOR VANCE)</span>
              </button>
            </div>
          </div>
        ) : (
          /* =========================================================================
              IF SECURITY DIRECTOR -> PRESENT FULL ONBOARDING CONSOLE
             ========================================================================= */
          <form onSubmit={handleSubmit} className="space-y-3">
            {errorMsg && (
              <div className="p-2 bg-[#201518] border border-rose-600/60 text-rose-300 text-[10px] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-2 bg-[#121c16] border border-emerald-500/60 text-emerald-300 text-[10px] flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* Principal Name & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-[#64748b]">PRINCIPAL FULL NAME:</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={handleNameChange}
                  placeholder="e.g. David Zhao"
                  className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-white outline-none focus:border-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#64748b]">CANONICAL IDENTIFIER:</label>
                <input
                  type="text"
                  value={customId}
                  onChange={(e) => setCustomId(e.target.value)}
                  placeholder="e.g. david.zhao"
                  className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-amber-300 outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Department & Role */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[10px] text-[#64748b]">DEPARTMENT BASELINE:</label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-white outline-none focus:border-amber-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept} className="bg-[#0c0e14]">
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-[#64748b]">ROLE TITLE:</label>
                <input
                  type="text"
                  required
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                  placeholder="e.g. Senior Security Architect"
                  className="w-full bg-[#090b0f] border border-[#232b3b] p-1.5 text-white outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* Account Privilege Toggle */}
            <div className="p-2.5 bg-[#121620] border border-[#1f2737] flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-[11px]">PRIVILEGED ACCOUNT (TIER-1 ACCESS)</div>
                <div className="text-[10px] text-[#64748b]">
                  Applies privilege sensitivity multiplier (1.35x blast radius).
                </div>
              </div>
              <input
                type="checkbox"
                checked={isPrivileged}
                onChange={(e) => setIsPrivileged(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Circadian Hours & Expected Volume Envelope */}
            <div className="grid grid-cols-3 gap-2 p-2 bg-[#090b0f] border border-[#1b2230]">
              <div className="space-y-1">
                <label className="text-[9px] text-[#64748b]">TYPICAL START (HR):</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={typicalStartHour}
                  onChange={(e) => setTypicalStartHour(Number(e.target.value))}
                  className="w-full bg-[#121620] border border-[#232b3b] p-1 text-white text-center outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#64748b]">TYPICAL END (HR):</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={typicalEndHour}
                  onChange={(e) => setTypicalEndHour(Number(e.target.value))}
                  className="w-full bg-[#121620] border border-[#232b3b] p-1 text-white text-center outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] text-[#64748b]">DAILY BYTES (MB):</label>
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={baselineBytesMB}
                  onChange={(e) => setBaselineBytesMB(Number(e.target.value))}
                  className="w-full bg-[#121620] border border-[#232b3b] p-1 text-white text-center outline-none"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-[#1f2737]">
              <button
                type="button"
                onClick={onClose}
                className="retro-btn text-[#8b95a5]"
              >
                [CANCEL]
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="retro-btn text-emerald-300 border-emerald-600 hover:bg-emerald-500 hover:text-black font-bold flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'INITIALIZING BASELINE...' : '&gt; ONBOARD PRINCIPAL & SEED BASELINE'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
