import React, { useState, useMemo } from 'react';
import { ActivityEvent, LiveEventItem } from '../types';
import { Search, Filter, X, ShieldAlert, KeyRound, Ban } from 'lucide-react';

interface ActivityLogViewProps {
  events: ActivityEvent[];
  liveEvents?: LiveEventItem[];
  isWsConnected?: boolean;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({
  events,
  liveEvents = [],
  isWsConnected = true,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [onlyFlagged, setOnlyFlagged] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    if (bytes >= 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${bytes} B`;
  };

  const formatTimeOnly = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toTimeString().split(' ')[0];
    } catch {
      return isoString;
    }
  };

  // Distinct action types
  const distinctActions = useMemo(() => {
    const s = new Set<string>();
    events.forEach((e) => s.add(e.action_type));
    return Array.from(s);
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchesSearch =
        !searchTerm ||
        e.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.ip_address.includes(searchTerm) ||
        e.action_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.location_city.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesAction = actionFilter === 'ALL' || e.action_type === actionFilter;
      const matchesFlagged = !onlyFlagged || e.is_ai_flagged || e.normalized_anomaly_score >= 60;

      return matchesSearch && matchesAction && matchesFlagged;
    });
  }, [events, searchTerm, actionFilter, onlyFlagged]);

  return (
    <div className="space-y-4 pb-12 text-xs">
      {/* Search & Filter Toolbar */}
      <section className="bg-[#12151c] border border-[#202634] p-3 rounded-sm flex flex-wrap items-center justify-between gap-3 font-mono">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-[#6b7280]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by resource, IP address, action or location..."
              className="w-full bg-[#0e1117] border border-[#222836] pl-8 pr-3 py-1.5 text-xs text-[#e5e7eb] placeholder-[#6b7280] rounded-sm outline-none focus:border-amber-500"
            />
          </div>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="bg-[#0e1117] border border-[#222836] px-2 py-1.5 text-xs text-[#e5e7eb] rounded-sm outline-none"
          >
            <option value="ALL">All Actions</option>
            {distinctActions.map((act) => (
              <option key={act} value={act}>
                {act}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-1.5 cursor-pointer text-[#d1d5db]">
            <input
              type="checkbox"
              checked={onlyFlagged}
              onChange={(e) => setOnlyFlagged(e.target.checked)}
              className="accent-amber-500 rounded-sm"
            />
            <span>Show Only Flagged (Score &ge; 60)</span>
          </label>

          <span className="text-[#6b7280] text-[11px]">
            {filtered.length} of {events.length} events
          </span>
        </div>
      </section>

      {/* Security Log Table */}
      <section className="bg-[#12151c] border border-[#202634] rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#0f1218] border-b border-[#202634] text-[#788294] text-[10px] uppercase">
                <th className="py-2 px-3 font-semibold">TIME</th>
                <th className="py-2 px-3 font-semibold">ACTION</th>
                <th className="py-2 px-3 font-semibold">RESOURCE</th>
                <th className="py-2 px-3 font-semibold">SOURCE IP</th>
                <th className="py-2 px-3 font-semibold">LOCATION</th>
                <th className="py-2 px-3 font-semibold">DATA</th>
                <th className="py-2 px-3 font-semibold text-center">ANOMALY</th>
                <th className="py-2 px-3 font-semibold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1b202c]">
              {filtered.map((evt) => {
                const isFlagged = evt.is_ai_flagged || evt.normalized_anomaly_score >= 60;
                const isSelected = selectedEvent?.id === evt.id;

                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#1e2533] text-white'
                        : isFlagged
                        ? 'bg-[#181a22] hover:bg-[#1f2430] text-[#f3f4f6]'
                        : 'bg-[#12151c] hover:bg-[#161a23] text-[#d1d5db]'
                    }`}
                  >
                    <td className="py-2 px-3 whitespace-nowrap text-[#9ca3af]">
                      {formatTimeOnly(evt.timestamp)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap font-medium text-[#e5e7eb]">
                      {evt.action_type}
                    </td>
                    <td className="py-2 px-3 max-w-[240px] truncate text-[#9ca3af]" title={evt.resource}>
                      {evt.resource}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[#9ca3af]">
                      {evt.ip_address}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[#9ca3af]">
                      {evt.location_city}, {evt.location_country}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-[#9ca3af]">
                      {formatBytes(evt.bytes_transferred)}
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap text-center">
                      <span
                        className={`font-mono font-bold ${
                          evt.normalized_anomaly_score >= 70
                            ? 'text-rose-400'
                            : evt.normalized_anomaly_score >= 40
                            ? 'text-amber-400'
                            : 'text-[#6b7280]'
                        }`}
                      >
                        {evt.normalized_anomaly_score}
                      </span>
                    </td>
                    <td className="py-2 px-3 whitespace-nowrap">
                      {isFlagged ? (
                        <span className="px-1.5 py-0.5 rounded-sm bg-rose-950/70 border border-rose-800/80 text-rose-300 font-bold text-[9px] tracking-wider">
                          FLAGGED
                        </span>
                      ) : (
                        <span className="text-[#6b7280] text-[10px]">NORMAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Side Inspector Drawer */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0f1218] border-l border-[#242b3b] shadow-2xl z-50 flex flex-col justify-between p-5 text-xs font-sans animate-in slide-in-from-right duration-200">
          <div className="space-y-4 overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b border-[#202634] pb-3">
              <div>
                <div className="text-[10px] font-mono uppercase tracking-wider text-[#737c8e]">
                  Log Inspector
                </div>
                <h3 className="text-sm font-bold text-white font-mono">EVENT #{selectedEvent.id}</h3>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 rounded-sm text-[#8b92a0] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-[#131720] border border-[#202634] rounded-sm space-y-2 font-mono text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Timestamp:</span>
                <span className="text-white font-bold">{selectedEvent.timestamp}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Action:</span>
                <span className="text-amber-300 font-semibold">{selectedEvent.action_type}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Resource:</span>
                <span className="text-[#d1d5db] truncate max-w-[200px]" title={selectedEvent.resource}>
                  {selectedEvent.resource}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Source IP:</span>
                <span className="text-[#d1d5db]">{selectedEvent.ip_address}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Location:</span>
                <span className="text-[#d1d5db]">
                  {selectedEvent.location_city}, {selectedEvent.location_country}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6b7280]">Anomaly Score:</span>
                <span className="text-rose-400 font-bold">{selectedEvent.normalized_anomaly_score} / 100</span>
              </div>
            </div>

            <div className="p-3 bg-[#151a24] border border-[#242d3e] rounded-sm space-y-1">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-semibold">
                ANOMALY EXPLANATION
              </div>
              <p className="text-[#d1d5db] leading-relaxed text-[11px]">
                {selectedEvent.is_sensitive_resource
                  ? "Operation touched sensitive enterprise object outside regular maintenance window."
                  : selectedEvent.is_odd_hour
                  ? "Event initiated during non-working circadian schedule for this role."
                  : "Behavior consistent with normal baseline telemetry."}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#202634] flex gap-2 font-mono text-[11px]">
            <button
              onClick={() => setSelectedEvent(null)}
              className="flex-1 py-1.5 bg-[#171b24] hover:bg-[#1f2533] border border-[#2b3345] text-[#9ca3af] rounded-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
