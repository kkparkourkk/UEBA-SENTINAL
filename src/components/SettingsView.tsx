import React, { useState } from 'react';
import { Sliders, Shield, Save, CheckCircle } from 'lucide-react';

export const SettingsView: React.FC = () => {
  const [windowDays, setWindowDays] = useState('30');
  const [anomalyThreshold, setAnomalyThreshold] = useState('65');
  const [privilegeMultiplier, setPrivilegeMultiplier] = useState('1.35');
  const [feedbackDamping, setFeedbackDamping] = useState('0.20');
  const [savedNotice, setSavedNotice] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 3000);
  };

  return (
    <div className="space-y-4 pb-12 text-xs font-sans max-w-4xl">
      {savedNotice && (
        <div className="p-2.5 bg-[#17201c] border border-emerald-600/40 text-emerald-300 font-mono text-xs flex items-center gap-2 rounded-sm">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>Detection configuration parameters saved and pushed to active scoring pipeline.</span>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {/* Baseline Model Configuration */}
        <section className="bg-[#12151c] border border-[#202634] p-4 rounded-sm space-y-4">
          <div className="border-b border-[#202634] pb-2">
            <div className="text-[10px] font-mono uppercase text-[#737c8e]">Model Calibration</div>
            <h2 className="text-sm font-bold text-white">Circadian Baseline Parameters</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-[11px]">
            <div className="space-y-1">
              <label className="text-[#d1d5db]">Rolling Baseline Window (Days)</label>
              <input
                type="number"
                value={windowDays}
                onChange={(e) => setWindowDays(e.target.value)}
                className="w-full bg-[#0e1117] border border-[#222836] p-2 text-white rounded-sm outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-[#6b7280]">Historical period used to establish expected hour and volume bounds.</span>
            </div>

            <div className="space-y-1">
              <label className="text-[#d1d5db]">Anomaly Threshold Cutoff (0-100)</label>
              <input
                type="number"
                value={anomalyThreshold}
                onChange={(e) => setAnomalyThreshold(e.target.value)}
                className="w-full bg-[#0e1117] border border-[#222836] p-2 text-white rounded-sm outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-[#6b7280]">Events with composite scores above this value are marked FLAGGED.</span>
            </div>

            <div className="space-y-1">
              <label className="text-[#d1d5db]">Privileged Account Blast Radius Multiplier</label>
              <input
                type="text"
                value={privilegeMultiplier}
                onChange={(e) => setPrivilegeMultiplier(e.target.value)}
                className="w-full bg-[#0e1117] border border-[#222836] p-2 text-white rounded-sm outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-[#6b7280]">Weight applied to high-privilege credentials (Tier-1 Admins, Root).</span>
            </div>

            <div className="space-y-1">
              <label className="text-[#d1d5db]">Analyst Feedback Attenuation Step</label>
              <input
                type="text"
                value={feedbackDamping}
                onChange={(e) => setFeedbackDamping(e.target.value)}
                className="w-full bg-[#0e1117] border border-[#222836] p-2 text-white rounded-sm outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-[#6b7280]">Percentage down-weight applied per dismissed false positive.</span>
            </div>
          </div>
        </section>

        {/* Telemetry Ingestion Status */}
        <section className="bg-[#12151c] border border-[#202634] p-4 rounded-sm space-y-3">
          <div className="border-b border-[#202634] pb-2">
            <div className="text-[10px] font-mono uppercase text-[#737c8e]">Pipeline Connectors</div>
            <h2 className="text-sm font-bold text-white">Log Forwarder Ingestion Adapters</h2>
          </div>

          <div className="space-y-2 font-mono text-[11px]">
            <div className="p-2.5 bg-[#0e1117] border border-[#1f2533] rounded-sm flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">Universal Normalizer API</span>
                <span className="text-[#6b7280] ml-2 text-[10px]">POST /api/v1/telemetry/universal</span>
              </div>
              <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
            </div>

            <div className="p-2.5 bg-[#0e1117] border border-[#1f2533] rounded-sm flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">CEF Parser (ArcSight / Syslog)</span>
                <span className="text-[#6b7280] ml-2 text-[10px]">RFC-5424 key-value extractor</span>
              </div>
              <span className="text-emerald-400 font-bold text-[10px]">ACTIVE</span>
            </div>

            <div className="p-2.5 bg-[#0e1117] border border-[#1f2533] rounded-sm flex items-center justify-between">
              <div>
                <span className="text-white font-semibold">WebSocket Sub-Second Stream</span>
                <span className="text-[#6b7280] ml-2 text-[10px]">ws://localhost:3000/ws</span>
              </div>
              <span className="text-emerald-400 font-bold text-[10px]">CONNECTED</span>
            </div>
          </div>
        </section>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold rounded-sm flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};
