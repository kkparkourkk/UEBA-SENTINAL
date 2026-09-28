import React, { useState, useMemo } from 'react';
import { UnifiedUserPayload, ActivityEvent, AuthUser } from '../types';
import {
  X,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  KeyRound,
  Ban,
  FileSearch,
  Filter,
  CheckCircle,
  UserPlus,
  Lock,
} from 'lucide-react';

interface UnifiedDashboardViewProps {
  data: UnifiedUserPayload;
  onNavigateToAlert?: (alertId: string) => void;
  currentUser?: AuthUser | null;
  onOpenAddEntity?: () => void;
}

export const UnifiedDashboardView: React.FC<UnifiedDashboardViewProps> = ({
  data,
  onNavigateToAlert,
  currentUser,
  onOpenAddEntity,
}) => {
  const { user, peerComparison, trendData, activityFeed } = data;
  const isDirector = currentUser?.role === 'security_director';

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedReasonFilter, setSelectedReasonFilter] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<ActivityEvent | null>(null);
  const [hoveredPoint, setHoveredPoint] = useState<{
    date: string;
    riskScore: number;
    baselineDev: number;
    eventsCount: number;
    flaggedCount: number;
    x: number;
    y: number;
  } | null>(null);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Department baseline metrics
  const deptAvg = peerComparison?.departmentAverage ?? 18;
  const deptDiff = user.risk_score - deptAvg;
  const diffSign = deptDiff >= 0 ? `+${deptDiff}` : `${deptDiff}`;

  // Format bytes
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

  // Clickable risk explanation reasons
  const riskReasonsList = useMemo(() => {
    return [
      {
        id: 'downloads',
        label: '+ Unusual file downloads',
        detail: '4 bulk file transfers exceeding 95th percentile volume envelope',
        filterFn: (e: ActivityEvent) =>
          e.action_type.toLowerCase().includes('download') ||
          e.action_type.toLowerCase().includes('sync') ||
          e.bytes_transferred > 50000,
      },
      {
        id: 'privileged',
        label: '+ Privileged account activity',
        detail: 'Tier-1 administrative credential used on non-standard target endpoints',
        filterFn: (e: ActivityEvent) => Boolean(e.is_sensitive_resource || user.is_privileged),
      },
      {
        id: 'location',
        label: '+ Abnormal login location',
        detail: 'Origin IP displacement from Munich, DE & Amsterdam Tor exit nodes',
        filterFn: (e: ActivityEvent) =>
          !e.ip_address.startsWith('10.') && !e.ip_address.startsWith('192.168.'),
      },
      {
        id: 'volume',
        label: '+ Increased data transfer',
        detail: 'Cumulative egress rate +28.4% above established 30-day baseline',
        filterFn: (e: ActivityEvent) => e.bytes_transferred > 100000,
      },
    ];
  }, [user.is_privileged]);

  // Filtered activity feed based on date or clicked reason
  const displayedEvents = useMemo(() => {
    let result = activityFeed;
    if (selectedDate) {
      result = result.filter((ev) => ev.date_str === selectedDate);
    }
    if (selectedReasonFilter) {
      const activeReason = riskReasonsList.find((r) => r.id === selectedReasonFilter);
      if (activeReason) {
        result = result.filter(activeReason.filterFn);
      }
    }
    return result;
  }, [activityFeed, selectedDate, selectedReasonFilter, riskReasonsList]);

  // Risk categorization
  const isCritical = user.risk_score >= 80;
  const isElevated = user.risk_score >= 50 && user.risk_score < 80;
  const riskClassification = isCritical ? 'CRITICAL' : isElevated ? 'ELEVATED' : 'NOMINAL';

  // SVG Chart Calculations for 30-Day Trend
  const chartWidth = 900;
  const chartHeight = 160;
  const padLeft = 45;
  const padRight = 25;
  const padTop = 20;
  const padBottom = 28;

  const innerW = chartWidth - padLeft - padRight;
  const innerH = chartHeight - padTop - padBottom;

  const trendPoints = useMemo(() => {
    if (!trendData || trendData.length === 0) return [];
    return trendData.map((pt, idx) => {
      const x = padLeft + (idx / Math.max(1, trendData.length - 1)) * innerW;
      const y = padTop + innerH - (Math.min(100, Math.max(0, pt.riskScore)) / 100) * innerH;
      return { x, y, pt, idx };
    });
  }, [trendData, innerW, innerH]);

  const linePathD = useMemo(() => {
    return trendPoints.reduce((acc, p, idx) => {
      return idx === 0 ? `M ${p.x},${p.y}` : `${acc} L ${p.x},${p.y}`;
    }, '');
  }, [trendPoints]);

  const baselineY = padTop + innerH - (Math.min(100, deptAvg) / 100) * innerH;

  const anomalyPoints = useMemo(() => {
    return trendPoints.filter((p) => p.pt.hasFlaggedEvents || p.pt.riskScore >= 70);
  }, [trendPoints]);

  // Primary signals breakdown for the currently selected event in side panel
  const eventSignals = useMemo(() => {
    if (!selectedEvent) return [];
    const signals = [];

    if (selectedEvent.is_odd_hour) {
      signals.push({ label: 'After-hours circadian breach', points: '+22' });
    }
    if (selectedEvent.is_sensitive_resource) {
      signals.push({ label: 'Sensitive target object', points: '+18' });
    }
    if (selectedEvent.bytes_transferred > 50000) {
      signals.push({ label: 'Unusual transfer volume envelope', points: '+16' });
    }
    if (!selectedEvent.ip_address.startsWith('10.')) {
      signals.push({ label: 'Atypical external origin IP', points: '+12' });
    }
    if (signals.length === 0) {
      signals.push({ label: 'Multivariate baseline divergence', points: `+${selectedEvent.normalized_anomaly_score}` });
    }
    return signals;
  }, [selectedEvent]);

  // Nearby events chronologically
  const relatedEvents = useMemo(() => {
    if (!selectedEvent) return [];
    const idx = activityFeed.findIndex((e) => e.id === selectedEvent.id);
    if (idx === -1) return [];
    const start = Math.max(0, idx - 2);
    const end = Math.min(activityFeed.length, idx + 3);
    return activityFeed.slice(start, end);
  }, [selectedEvent, activityFeed]);

  const handleTriageAction = (action: string) => {
    setActionNotice(`[COMMITTED] ${action} -> EVENT #${selectedEvent?.id}`);
    setTimeout(() => setActionNotice(null), 4000);
  };

  return (
    <div className="space-y-3 pb-12 font-mono text-xs select-none">
      {/* Triage Notice */}
      {actionNotice && (
        <div className="p-2 bg-[#121c16] border border-emerald-500/60 text-emerald-300 text-[11px] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
            <span>{actionNotice}</span>
          </div>
          <button onClick={() => setActionNotice(null)} className="text-[#8b95a5] hover:text-white">
            [X]
          </button>
        </div>
      )}

      {/* =========================================================================
          PANEL 01: ENTITY HEADER & RISK EXPLANATION
         ========================================================================= */}
      <section className="bg-[#0f1218] border border-[#232b3b] p-3.5">
        {/* Section title banner with Onboard Entity Action */}
        <div className="text-[10px] text-amber-500/90 font-bold border-b border-[#1f2737] pb-1.5 mb-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span>// ENTITY RECORD : {user.id.toUpperCase()}</span>
            <span className="text-[#64748b] hidden sm:inline">CLASS: MONITORED_PRINCIPAL</span>
          </div>

          <div className="flex items-center gap-2">
            {onOpenAddEntity && (
              <button
                onClick={onOpenAddEntity}
                className={`retro-btn flex items-center gap-1.5 text-[10px] ${
                  isDirector
                    ? 'text-emerald-300 border-emerald-700 hover:bg-emerald-500 hover:text-black font-bold'
                    : 'text-[#8b95a5] border-[#252f43] hover:border-rose-600 hover:text-rose-400'
                }`}
                title={
                  isDirector
                    ? 'Security Director verified: Onboard new monitored entity'
                    : 'Access restricted: Only Security Director has authority to onboard entities'
                }
              >
                {isDirector ? (
                  <>
                    <UserPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>+ ONBOARD NEW ENTITY [DIRECTOR CLEARANCE]</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5 text-rose-400" />
                    <span>+ ONBOARD NEW ENTITY [DIRECTOR ONLY]</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          
          {/* Col 1: Identity & Credentials */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-[#1f2737] pb-3 lg:pb-0 lg:pr-4 space-y-2">
            <div>
              <div className="text-[10px] text-[#64748b]">PRINCIPAL NAME:</div>
              <h1 className="text-base font-bold text-white glow-amber tracking-tight">{user.name}</h1>
              <div className="text-[#94a3b8] text-[11px]">{user.role}</div>
            </div>

            <div className="space-y-1 text-[11px] text-[#8b95a5] pt-1">
              <div className="flex justify-between">
                <span>DEPARTMENT:</span>
                <span className="text-white font-semibold">{user.department}</span>
              </div>
              <div className="flex justify-between">
                <span>ACCOUNT TYPE:</span>
                <span className="text-amber-400 font-bold">
                  {user.is_privileged ? '[PRIVILEGED ACCOUNT]' : '[STANDARD USER]'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>SECURITY CLEARANCE:</span>
                <span className="text-cyan-400">RESTRICTED_L3</span>
              </div>
              <div className="flex justify-between">
                <span>LAST OBSERVED:</span>
                <span className="text-[#cbd5e1]">{formatTimeOnly(user.last_active)}</span>
              </div>
            </div>
          </div>

          {/* Col 2: Risk Score & Clickable Explanations */}
          <div className="lg:col-span-5 border-b lg:border-b-0 lg:border-r border-[#1f2737] pb-3 lg:pb-0 lg:pr-4 space-y-2.5">
            <div>
              <div className="text-[10px] text-[#64748b]">RISK SCORE</div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-bold glow-amber">[ {user.risk_score} / 100 ]</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 border ${
                    isCritical
                      ? 'bg-rose-950/80 border-rose-700 text-rose-300 font-bold glow-red'
                      : isElevated
                      ? 'bg-amber-950/80 border-amber-700 text-amber-300 font-bold glow-amber'
                      : 'bg-emerald-950/80 border-emerald-700 text-emerald-300 font-bold'
                  }`}
                >
                  {riskClassification}
                </span>
              </div>

              {/* Small horizontal risk bar */}
              <div className="h-1.5 w-full bg-[#1b2230] mt-1.5">
                <div
                  className={`h-full ${
                    isCritical ? 'bg-rose-500' : isElevated ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, user.risk_score)}%` }}
                />
              </div>
            </div>

            {/* Clickable concise evidence reasons */}
            <div className="space-y-1 pt-1">
              <div className="text-[10px] text-[#8b95a5]">
                REASONS CONTRIBUTING TO SCORE (CLICK TO FILTER LOGS):
              </div>
              <div className="space-y-1">
                {riskReasonsList.map((reason) => {
                  const isFiltered = selectedReasonFilter === reason.id;
                  return (
                    <button
                      key={reason.id}
                      onClick={() =>
                        setSelectedReasonFilter(isFiltered ? null : reason.id)
                      }
                      className={`w-full text-left p-1 text-[11px] transition-colors flex items-center justify-between border ${
                        isFiltered
                          ? 'bg-amber-500 text-black border-amber-400 font-bold'
                          : 'bg-[#121620] border-[#222a3a] text-[#e2e8f0] hover:border-amber-500/60 hover:text-amber-300'
                      }`}
                      title={reason.detail}
                    >
                      <span>{reason.label}</span>
                      <span className="text-[9px] opacity-75 font-mono">
                        {isFiltered ? '[FILTERED]' : '&gt;'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Col 3: Department Baseline & Anomaly Panel */}
          <div className="lg:col-span-3 space-y-3">
            {/* Department Baseline Box */}
            <div className="p-2.5 bg-[#121620] border border-[#232b3b] space-y-1.5">
              <div className="text-[10px] text-amber-500/90 font-bold">
                DEPARTMENT BASELINE
              </div>
              <div className="text-[11px] text-[#94a3b8]">{user.department}</div>

              <div className="grid grid-cols-3 gap-1 text-center py-1 border-t border-[#1b2230]">
                <div>
                  <div className="text-[9px] text-[#64748b]">AVG RISK</div>
                  <div className="text-xs font-bold text-[#cbd5e1]">{deptAvg}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#64748b]">USER</div>
                  <div className="text-xs font-bold text-amber-400">{user.risk_score}</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#64748b]">DEVIATION</div>
                  <div className="text-xs font-bold text-rose-400">{diffSign}</div>
                </div>
              </div>

              <div className="text-[10px] text-[#8b95a5] border-t border-[#1b2230] pt-1">
                Calculated against 30-day circadian mean of peer accounts in {user.department}.
              </div>
            </div>

            {/* Anomaly Detection Section */}
            <div className="p-2.5 bg-[#121620] border border-[#232b3b] space-y-1.5">
              <div className="text-[10px] text-cyan-400 font-bold">
                ANOMALY DETECTION
              </div>
              <div className="grid grid-cols-3 gap-1 text-center py-1">
                <div>
                  <div className="text-[9px] text-[#64748b]">SCORE</div>
                  <div className="text-xs font-bold text-rose-400">74</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#64748b]">BASELINE</div>
                  <div className="text-xs font-bold text-[#cbd5e1]">28</div>
                </div>
                <div>
                  <div className="text-[9px] text-[#64748b]">DEVIATION</div>
                  <div className="text-xs font-bold text-amber-400">+46</div>
                </div>
              </div>
              <div className="text-[10px] text-[#8b95a5] leading-snug">
                Excessive volume and off-hours access shifted vector outside 2.8-sigma envelope.
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          PANEL 02: RETRO TERMINAL 30-DAY RISK TREND CHART
         ========================================================================= */}
      <section className="bg-[#0f1218] border border-[#232b3b] p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-[#1f2737] pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-500/90 font-bold">// 30-DAY RISK TRAJECTORY</span>
            <span className="text-[#64748b] text-[10px]">[MODEL: EWMA_SMOOTH_0.20]</span>
          </div>

          <div className="flex items-center gap-4 text-[10px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 bg-amber-400 inline-block" />
              <span className="text-amber-400">ENTITY RISK</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-0.5 border-t border-dashed border-[#64748b] inline-block" />
              <span className="text-[#64748b]">PEER BASELINE ({deptAvg})</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 inline-block text-[8px] text-black text-center font-bold">!</span>
              <span className="text-rose-400">ANOMALY SPIKE</span>
            </div>
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="px-1.5 py-0.2 bg-[#1f2838] hover:bg-amber-500 hover:text-black text-amber-300 border border-amber-500/50 text-[9px]"
              >
                FILTER: {selectedDate} [X]
              </button>
            )}
          </div>
        </div>

        {/* SVG Plotting Area */}
        <div className="relative w-full overflow-x-auto bg-[#090b0f] border border-[#1b2230]">
          <svg
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full h-36 select-none"
          >
            {/* Subtle Terminal Grid Lines */}
            {[0, 25, 50, 75, 100].map((val) => {
              const y = padTop + innerH - (val / 100) * innerH;
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={chartWidth - padRight}
                    y2={y}
                    stroke="#161c28"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fill="#475569"
                    fontSize="9"
                    fontFamily="monospace"
                  >
                    {val}
                  </text>
                </g>
              );
            })}

            {/* Department Baseline dashed line */}
            <line
              x1={padLeft}
              y1={baselineY}
              x2={chartWidth - padRight}
              y2={baselineY}
              stroke="#475569"
              strokeWidth="1"
              strokeDasharray="4 3"
            />

            {/* Main Risk Trajectory line */}
            <path d={linePathD} fill="none" stroke="#f59e0b" strokeWidth="1.5" />

            {/* Normal circular data points */}
            {trendPoints.map((p) => (
              <circle
                key={p.idx}
                cx={p.x}
                cy={p.y}
                r="2"
                fill="#f59e0b"
                className="cursor-pointer"
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: p.pt.date,
                    riskScore: p.pt.riskScore,
                    baselineDev: p.pt.riskScore - deptAvg,
                    eventsCount: p.pt.eventCount,
                    flaggedCount: p.pt.flaggedCount,
                    x: p.x,
                    y: p.y,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
                onClick={() => setSelectedDate(p.pt.date)}
              />
            ))}

            {/* Anomaly markers with red square/tags */}
            {anomalyPoints.map((ap) => (
              <g
                key={ap.idx}
                className="cursor-pointer"
                onClick={() => setSelectedDate(ap.pt.date)}
                onMouseEnter={() =>
                  setHoveredPoint({
                    date: ap.pt.date,
                    riskScore: ap.pt.riskScore,
                    baselineDev: ap.pt.riskScore - deptAvg,
                    eventsCount: ap.pt.eventCount,
                    flaggedCount: ap.pt.flaggedCount,
                    x: ap.x,
                    y: ap.y,
                  })
                }
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <rect
                  x={ap.x - 3}
                  y={ap.y - 3}
                  width="6"
                  height="6"
                  fill="#ef4444"
                />
                <text
                  x={ap.x}
                  y={ap.y - 6}
                  textAnchor="middle"
                  fill="#ef4444"
                  fontSize="8"
                  fontWeight="bold"
                >
                  !
                </text>
              </g>
            ))}

            {/* X-axis date labels */}
            {trendPoints
              .filter((_, i) => i % 5 === 0 || i === trendPoints.length - 1)
              .map((p) => (
                <text
                  key={p.idx}
                  x={p.x}
                  y={chartHeight - 8}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="9"
                >
                  {p.pt.date.slice(5)}
                </text>
              ))}
          </svg>

          {/* Interactive Hover HUD Overlay */}
          {hoveredPoint && (
            <div
              className="absolute z-20 bg-[#0c0e14] border border-amber-500/80 p-2 text-[10px] font-mono text-[#e2e8f0] shadow-md pointer-events-none"
              style={{
                left: Math.min(hoveredPoint.x + 10, chartWidth - 160),
                top: Math.max(10, hoveredPoint.y - 50),
              }}
            >
              <div className="text-amber-400 font-bold">&gt; DATE: {hoveredPoint.date}</div>
              <div>SCORE: <strong className="text-white">{hoveredPoint.riskScore}</strong></div>
              <div>DEVIATION: <strong className="text-rose-400">{hoveredPoint.baselineDev >= 0 ? `+${hoveredPoint.baselineDev}` : hoveredPoint.baselineDev}</strong></div>
              <div>EVENTS: {hoveredPoint.eventsCount} ({hoveredPoint.flaggedCount} FLAGGED)</div>
              <div className="text-[9px] text-[#64748b] pt-0.5">Click to isolate date</div>
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          PANEL 03: DENSE TERMINAL EVENT STREAM (ACTIVITY FEED)
         ========================================================================= */}
      <section className="bg-[#0f1218] border border-[#232b3b] p-3 space-y-2">
        <div className="flex items-center justify-between border-b border-[#1f2737] pb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-amber-500/90 font-bold">// TELEMETRY AUDIT STREAM</span>
            {selectedReasonFilter && (
              <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1 text-[9px]">
                REASON: {selectedReasonFilter.toUpperCase()}
              </span>
            )}
            {selectedDate && (
              <span className="bg-cyan-950/60 text-cyan-300 border border-cyan-700 px-1 text-[9px]">
                DATE: {selectedDate}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-[10px] text-[#8b95a5]">
            <span>{displayedEvents.length} RECORDS DISPLAYED</span>
            {(selectedDate || selectedReasonFilter) && (
              <button
                onClick={() => {
                  setSelectedDate(null);
                  setSelectedReasonFilter(null);
                }}
                className="text-amber-400 hover:underline"
              >
                [RESET ALL FILTERS]
              </button>
            )}
          </div>
        </div>

        {/* Compact Terminal Event Table */}
        <div className="border border-[#1f2737] bg-[#090b0f] overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] border-collapse">
            <thead>
              <tr className="bg-[#0d1016] border-b border-[#1f2737] text-[#64748b] text-[10px]">
                <th className="py-1.5 px-2.5">TIMESTAMP</th>
                <th className="py-1.5 px-2.5">USER</th>
                <th className="py-1.5 px-2.5">ACTION</th>
                <th className="py-1.5 px-2.5">RESOURCE</th>
                <th className="py-1.5 px-2.5">IP / LOCATION</th>
                <th className="py-1.5 px-2.5">DATA VOLUME</th>
                <th className="py-1.5 px-2.5 text-center">ANOMALY SCORE</th>
                <th className="py-1.5 px-2.5">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171e2c]">
              {displayedEvents.map((evt) => {
                const isFlagged = evt.is_ai_flagged || evt.normalized_anomaly_score >= 60;
                const isSelected = selectedEvent?.id === evt.id;

                return (
                  <tr
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-amber-500/20 border-l-2 border-amber-500 text-white'
                        : isFlagged
                        ? 'bg-[#151216] hover:bg-[#1f1a20] text-[#f8fafc]'
                        : 'bg-[#090b0f] hover:bg-[#121620] text-[#cbd5e1]'
                    }`}
                  >
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-[#8b95a5]">
                      {formatTimeOnly(evt.timestamp)}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-white font-medium">
                      {user.name}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-amber-300">
                      {evt.action_type}
                    </td>
                    <td className="py-1.5 px-2.5 max-w-[200px] truncate text-[#94a3b8]" title={evt.resource}>
                      {evt.resource}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-[#8b95a5]">
                      {evt.ip_address} ({evt.location_city})
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-[#94a3b8]">
                      {formatBytes(evt.bytes_transferred)}
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-center">
                      <span
                        className={`font-bold ${
                          evt.normalized_anomaly_score >= 70
                            ? 'text-rose-400 glow-red'
                            : evt.normalized_anomaly_score >= 40
                            ? 'text-amber-400'
                            : 'text-[#64748b]'
                        }`}
                      >
                        {evt.normalized_anomaly_score}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      {isFlagged ? (
                        <span className="px-1 py-0.2 bg-rose-950 text-rose-300 border border-rose-800 text-[9px] font-bold">
                          FLAGGED
                        </span>
                      ) : (
                        <span className="text-[#64748b] text-[9px]">NORMAL</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          PANEL 04: RIGHT-SIDE DETAIL DRAWER (RETRO INVESTIGATION CONSOLE)
         ========================================================================= */}
      {selectedEvent && (
        <div className="fixed inset-y-0 right-0 w-full max-w-md bg-[#0a0c10] border-l border-[#263145] shadow-2xl z-50 flex flex-col justify-between p-4 text-xs font-mono animate-in slide-in-from-right duration-150">
          <div className="space-y-3 overflow-y-auto pr-1">
            {/* Drawer Terminal Title */}
            <div className="flex items-center justify-between border-b border-[#232b3b] pb-2 text-amber-500 font-bold">
              <span>&gt; FORENSIC_EVENT_INSPECTOR</span>
              <button
                onClick={() => setSelectedEvent(null)}
                className="text-[#64748b] hover:text-white"
              >
                [X]
              </button>
            </div>

            {/* Full Event Information */}
            <div className="p-2.5 bg-[#0f1218] border border-[#232b3b] space-y-1.5 text-[11px]">
              <div className="text-[10px] text-amber-500 font-bold border-b border-[#1b2230] pb-0.5">
                // FULL EVENT PARAMETERS
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">TIMESTAMP:</span>
                <span className="text-white">{selectedEvent.timestamp}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">ACTION:</span>
                <span className="text-amber-300 font-bold">{selectedEvent.action_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">RESOURCE:</span>
                <span className="text-white truncate max-w-[200px]" title={selectedEvent.resource}>
                  {selectedEvent.resource}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">SOURCE IP:</span>
                <span className="text-[#cbd5e1]">{selectedEvent.ip_address}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">LOCATION:</span>
                <span className="text-[#cbd5e1]">
                  {selectedEvent.location_city}, {selectedEvent.location_country}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748b]">DATA VOLUME:</span>
                <span className="text-white">{formatBytes(selectedEvent.bytes_transferred)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-[#1b2230]">
                <span className="text-[#64748b]">ANOMALY SCORE:</span>
                <span className="text-rose-400 font-bold">
                  {selectedEvent.normalized_anomaly_score} / 100
                </span>
              </div>
            </div>

            {/* Why it was flagged */}
            <div className="p-2.5 bg-[#121620] border border-[#232b3b] space-y-1">
              <div className="text-[10px] text-amber-500 font-bold">
                // WHY IT WAS FLAGGED
              </div>
              <p className="text-[#d1d5db] text-[11px] leading-relaxed">
                {selectedEvent.is_sensitive_resource
                  ? "Operation touched privileged enterprise object outside regular work schedule, violating baseline circadian envelope."
                  : selectedEvent.is_odd_hour
                  ? "Circadian breach: Activity executed at 03:14 AM from external non-corporate IP address."
                  : "Outlier detection algorithm recorded +46 points deviation from 30-day department expected threshold."}
              </p>
            </div>

            {/* Risk Contribution Breakdown */}
            <div className="p-2.5 bg-[#0f1218] border border-[#232b3b] space-y-1.5">
              <div className="text-[10px] text-cyan-400 font-bold">
                // RISK CONTRIBUTION BREAKDOWN
              </div>
              <div className="space-y-1 text-[11px]">
                {eventSignals.map((sig, i) => (
                  <div key={i} className="flex justify-between text-[#cbd5e1]">
                    <span>{sig.label}</span>
                    <span className="text-rose-400 font-bold">{sig.points}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Chronologically Nearby Related Events */}
            <div className="space-y-1">
              <div className="text-[10px] text-[#64748b]">// RELATED SESSION EVENTS</div>
              <div className="space-y-1 text-[10px]">
                {relatedEvents.map((rel) => (
                  <div
                    key={rel.id}
                    onClick={() => setSelectedEvent(rel)}
                    className={`p-1.5 border cursor-pointer flex justify-between ${
                      rel.id === selectedEvent.id
                        ? 'bg-amber-500 text-black border-amber-400 font-bold'
                        : 'bg-[#121620] border-[#222a3a] text-[#8b95a5] hover:text-white'
                    }`}
                  >
                    <span>{formatTimeOnly(rel.timestamp)}</span>
                    <span className="truncate max-w-[150px]">{rel.action_type}</span>
                    <span>{formatBytes(rel.bytes_transferred)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommended Investigation Step */}
            <div className="p-2 bg-[#17141f] border border-purple-800/60 text-purple-300 text-[10px] space-y-0.5">
              <div className="font-bold">// RECOMMENDED INVESTIGATION STEP:</div>
              <div>Challenge principal with Step-Up MFA and quarantine access token on /api/v1/customer_records.</div>
            </div>
          </div>

          {/* Analyst Sovereign Actions (Bottom) */}
          <div className="pt-2 border-t border-[#232b3b] space-y-1.5">
            <div className="text-[9px] text-[#64748b]">// SOVEREIGN ANALYST INTERVENTION</div>
            <div className="grid grid-cols-2 gap-1.5 text-[10px]">
              <button
                onClick={() => handleTriageAction('VERIFY_THREAT')}
                className="retro-btn text-rose-300 border-rose-800 hover:bg-rose-600 hover:text-white"
              >
                &gt; VERIFY THREAT
              </button>
              <button
                onClick={() => handleTriageAction('STEP_UP_MFA')}
                className="retro-btn text-amber-300 border-amber-800 hover:bg-amber-600 hover:text-black"
              >
                &gt; STEP-UP MFA
              </button>
              <button
                onClick={() => handleTriageAction('FLAG_FALSE_POSITIVE')}
                className="retro-btn text-[#94a3b8]"
              >
                &gt; FALSE POSITIVE
              </button>
              <button
                onClick={() => handleTriageAction('ADD_INVESTIGATION')}
                className="retro-btn text-cyan-300 border-cyan-800"
              >
                &gt; ADD TO DOSSIER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
