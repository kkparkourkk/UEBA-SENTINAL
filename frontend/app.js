/**
 * UEBA Sentinel - Frontend Application & WebSocket Controller
 * Implements:
 * 1. Native WebSocket client for /ws/telemetry with live ticker & zero-polling
 * 2. EWMA Long-Term Drift & Circadian Chart.js Visualizer (HMW 1)
 * 3. Plain-English Anomaly Narrative & 3-Second Visual Chips (HMW 2)
 * 4. Explain-Why Factor Inspector & 1-Click Analyst Actions (HMW 3)
 * 5. Universal Ingestion Modal & Field Normalizer (HMW 4)
 */

let ws = null;
let isStreamPaused = false;
let currentEntityId = 'sophia.chen';
let circadianChart = null;

// Presets for HMW 4 Universal Ingestion
const SAMPLE_PRESETS = {
  cef: 'CEF:0|CyberGuard|WAF-Sensor|3.2|1004|DATABASE_MASS_EXPORT|8|src=194.26.29.112 suser=sophia.chen dst=/api/v1/customer_records bytes=45200000 loc=Munich act=BULK_DUMP',
  syslog: '<134>Sep 28 03:14:22 edge-router-01 audit[8211]: user=marcus.vance client_ip=185.220.101.5 action=PAYROLL_READ file=/db/salaries.sql size=28000000 location=Amsterdam',
  json: JSON.stringify({
    login: "elena.rostova",
    network_source: "10.0.14.90",
    operation: "ROOT_TOKEN_CREATION",
    target_object: "vault://auth/token/create-orphan",
    byte_count: 520000,
    geo_city: "HQ Internal"
  }, null, 2)
};

// ----------------- WEBSOCKET CONNECTION -----------------
function initWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // If running on port 3000 (Vite / Express), route to /ws/telemetry or /ws
  const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('Connected to UEBA Real-Time WebSocket:', wsUrl);
      updateWsBadge(true);
    };

    ws.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleWsMessage(payload);
      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    ws.onclose = () => {
      updateWsBadge(false);
      // Fallback reconnect attempt after 3s
      setTimeout(initWebSocket, 3000);
    };

    ws.onerror = () => {
      updateWsBadge(false);
    };
  } catch (e) {
    updateWsBadge(false);
    setTimeout(initWebSocket, 3000);
  }
}

function updateWsBadge(isConnected) {
  const badge = document.getElementById('ws-status-badge');
  if (!badge) return;
  if (isConnected) {
    badge.className = "flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-950/80 border border-emerald-700/50 text-emerald-400 text-[10px] font-mono";
    badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span><span>WS LIVE</span>';
  } else {
    badge.className = "flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-700/50 text-amber-400 text-[10px] font-mono";
    badge.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span>RECONNECTING</span>';
  }
}

function handleWsMessage(payload) {
  if (payload.type === 'INITIAL_SYNC') {
    if (payload.recent_events) {
      payload.recent_events.forEach(prependEventToStream);
    }
    if (payload.incidents) {
      renderIncidents(payload.incidents);
    }
    if (payload.posture) {
      renderPosture(payload.posture);
    }
  } else if (payload.type === 'LIVE_TELEMETRY_SCORED') {
    if (payload.event && !isStreamPaused) {
      prependEventToStream(payload.event);
    }
    if (payload.alert) {
      prependIncident(payload.alert);
    }
    if (payload.posture) {
      renderPosture(payload.posture);
    }
  } else if (payload.type === 'ANALYST_ACTION_COMMITTED') {
    if (payload.posture) {
      renderPosture(payload.posture);
    }
    updateIncidentStatus(payload.alert_id, payload.decision);
  }
}

// ----------------- LIVE TELEMETRY TICKER -----------------
function prependEventToStream(evt) {
  const container = document.getElementById('events-stream-container');
  if (!container) return;

  const row = document.createElement('div');
  const isAnomaly = evt.anomaly_score >= 60;
  const isEarly = evt.is_early_warning;

  let borderStyle = "border-neutral-800/70 bg-neutral-950/60";
  let scoreColor = "text-neutral-400";
  if (isEarly) {
    borderStyle = "border-amber-700/60 bg-amber-950/20";
    scoreColor = "text-amber-400";
  } else if (isAnomaly) {
    borderStyle = "border-rose-700/60 bg-rose-950/30";
    scoreColor = "text-rose-400";
  }

  const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : 'now';
  const chipsHtml = (evt.chips || []).slice(0, 2).map(c => 
    `<span class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">${c}</span>`
  ).join(' ');

  row.className = `p-2.5 rounded-xl border ${borderStyle} text-xs space-y-1 transition hover:bg-neutral-900 cursor-pointer animate-in fade-in duration-300`;
  row.onclick = () => onEntitySelect(evt.user_id);

  row.innerHTML = `
    <div class="flex items-center justify-between font-mono text-[10px]">
      <span class="text-neutral-500">${timeStr}</span>
      <span class="font-bold ${scoreColor}">Score: ${Math.round(evt.anomaly_score)}</span>
    </div>
    <div class="flex items-center justify-between font-medium">
      <span class="text-white truncate max-w-[170px]">${evt.user_name || evt.user_id}</span>
      <span class="text-[10px] text-neutral-400 font-mono">${formatBytes(evt.bytes_transferred)}</span>
    </div>
    <div class="text-[11px] text-neutral-400 truncate">${evt.action} &rarr; ${evt.resource}</div>
    <div class="flex items-center gap-1 pt-0.5">${chipsHtml}</div>
  `;

  container.insertBefore(row, container.firstChild);
  if (container.children.length > 40) {
    container.removeChild(container.lastChild);
  }
}

// ----------------- INCIDENT QUEUE & EXPLAIN WHY (HMW 3) -----------------
let incidentsList = [];

function renderIncidents(incidents) {
  incidentsList = incidents;
  const container = document.getElementById('incidents-container');
  if (!container) return;
  container.innerHTML = '';

  const badge = document.getElementById('incidents-count-badge');
  if (badge) badge.innerText = `${incidents.length} Active`;

  incidents.forEach(inc => {
    container.appendChild(createIncidentCard(inc));
  });
}

function prependIncident(inc) {
  incidentsList.unshift(inc);
  const container = document.getElementById('incidents-container');
  if (!container) return;
  container.insertBefore(createIncidentCard(inc), container.firstChild);

  const badge = document.getElementById('incidents-count-badge');
  if (badge) badge.innerText = `${incidentsList.length} Active`;
}

function createIncidentCard(inc) {
  const card = document.createElement('div');
  card.id = `incident-${inc.alert_id}`;
  
  const isEarly = inc.is_early_warning;
  const cardBorder = isEarly ? "border-amber-700/60 bg-amber-950/20" : "border-rose-800/70 bg-rose-950/30";
  const badgeColor = isEarly ? "bg-amber-900/60 text-amber-300 border-amber-700" : "bg-rose-900/60 text-rose-300 border-rose-700";
  const label = isEarly ? "PROACTIVE EARLY WARNING" : "CRITICAL BREACH";

  // Build factors breakdown HTML
  const factorsHtml = (inc.explain_why || []).map(f => `
    <div class="space-y-1">
      <div class="flex items-center justify-between text-[11px]">
        <span class="text-neutral-300 font-medium">${f.factor_name}</span>
        <span class="font-mono text-orange-400 font-bold">${f.weight_pct}%</span>
      </div>
      <div class="h-1.5 w-full bg-neutral-800 rounded-full overflow-hidden">
        <div class="h-full bg-orange-500 rounded-full" style="width: ${f.weight_pct}%"></div>
      </div>
      <div class="text-[10px] text-neutral-400">${f.description}</div>
    </div>
  `).join('');

  const chipsHtml = (inc.chips || []).map(c => 
    `<span class="text-[9px] px-1.5 py-0.2 rounded bg-neutral-800 text-neutral-300 font-mono">${c}</span>`
  ).join(' ');

  card.className = `p-4 rounded-xl border ${cardBorder} space-y-3 shadow-md`;
  card.innerHTML = `
    <div class="flex items-center justify-between">
      <span class="text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeColor} font-bold">${label}</span>
      <span class="text-xs font-mono font-bold text-white bg-neutral-900 px-2 py-0.5 rounded border border-neutral-700">Score: ${inc.priority_score}</span>
    </div>

    <div>
      <div class="flex items-center justify-between">
        <h4 class="text-xs font-bold text-white">${inc.user_name} (${inc.department})</h4>
        <span class="text-[10px] text-neutral-500 font-mono">${new Date(inc.timestamp).toLocaleTimeString()}</span>
      </div>
      <p class="text-xs text-neutral-200 mt-1 leading-snug">"${inc.plain_english_narrative}"</p>
      <div class="flex items-center gap-1.5 mt-2 flex-wrap">${chipsHtml}</div>
    </div>

    <!-- Collapsible HMW 3: Explain-Why Factor Inspector -->
    <div class="pt-2 border-t border-neutral-800/80">
      <button onclick="toggleExplainWhy('${inc.alert_id}')" class="text-[11px] font-semibold text-orange-400 hover:text-orange-300 flex items-center justify-between w-full">
        <span class="flex items-center gap-1">
          <i class="fa-solid fa-circle-question"></i>
          Why was this flagged? (Model Factor Weights)
        </span>
        <i id="icon-why-${inc.alert_id}" class="fa-solid fa-chevron-down text-[10px]"></i>
      </button>

      <div id="details-why-${inc.alert_id}" class="hidden space-y-2.5 pt-2.5 mt-1 border-t border-neutral-800/50">
        ${factorsHtml}
      </div>
    </div>

    <!-- 1-Click Analyst Triage Actions -->
    <div class="pt-2 border-t border-neutral-800/80 flex items-center justify-between gap-2">
      <button onclick="commitAnalystAction('${inc.alert_id}', 'VERIFY_THREAT')" class="flex-1 py-1.5 rounded-lg bg-rose-600/80 hover:bg-rose-600 text-white text-[11px] font-bold transition flex items-center justify-center gap-1" title="Verify Threat and block entity">
        <i class="fa-solid fa-shield-virus text-[10px]"></i>
        Verify Threat
      </button>
      <button onclick="commitAnalystAction('${inc.alert_id}', 'STEP_UP_MFA')" class="flex-1 py-1.5 rounded-lg bg-amber-600/80 hover:bg-amber-600 text-white text-[11px] font-bold transition flex items-center justify-center gap-1" title="Challenge user with immediate Step-Up MFA">
        <i class="fa-solid fa-mobile-screen text-[10px]"></i>
        Step-Up MFA
      </button>
      <button onclick="commitAnalystAction('${inc.alert_id}', 'FLAG_FALSE_POSITIVE')" class="flex-1 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-[11px] font-bold border border-neutral-700 transition flex items-center justify-center gap-1" title="Downweight this signal in memory">
        <i class="fa-solid fa-ban text-[10px]"></i>
        False Positive
      </button>
    </div>
  `;

  return card;
}

function toggleExplainWhy(alertId) {
  const panel = document.getElementById(`details-why-${alertId}`);
  const icon = document.getElementById(`icon-why-${alertId}`);
  if (!panel) return;
  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    if (icon) icon.className = "fa-solid fa-chevron-up text-[10px]";
  } else {
    panel.classList.add('hidden');
    if (icon) icon.className = "fa-solid fa-chevron-down text-[10px]";
  }
}

async function commitAnalystAction(alertId, decision) {
  const target = incidentsList.find(a => a.alert_id === alertId);
  const signalType = target?.signals?.[0] || 'RULE_ODD_HOURS';

  try {
    const res = await fetch(`/api/v1/incidents/${alertId}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_id: alertId,
        signal_type: signalType,
        decision: decision,
        notes: `Action committed by SOC Analyst via 1-click dashboard.`
      })
    });

    if (res.ok) {
      updateIncidentStatus(alertId, decision);
    }
  } catch (err) {
    console.error('Failed to commit action:', err);
  }
}

function updateIncidentStatus(alertId, decision) {
  const card = document.getElementById(`incident-${alertId}`);
  if (!card) return;

  let statusBadge = '';
  if (decision === 'FLAG_FALSE_POSITIVE') {
    statusBadge = '<div class="p-2 rounded bg-neutral-900 border border-neutral-700 text-neutral-400 text-center text-xs font-mono font-bold"><i class="fa-solid fa-check text-emerald-400 mr-1.5"></i>Flagged Benign (Signal Auto-Downweighted)</div>';
  } else if (decision === 'VERIFY_THREAT') {
    statusBadge = '<div class="p-2 rounded bg-rose-950 border border-rose-800 text-rose-300 text-center text-xs font-mono font-bold"><i class="fa-solid fa-lock text-rose-400 mr-1.5"></i>Threat Verified & Entity Contained</div>';
  } else if (decision === 'STEP_UP_MFA') {
    statusBadge = '<div class="p-2 rounded bg-amber-950 border border-amber-800 text-amber-300 text-center text-xs font-mono font-bold"><i class="fa-solid fa-shield-halved text-amber-400 mr-1.5"></i>Step-Up MFA Challenge Dispatched</div>';
  }

  card.innerHTML = statusBadge;
  setTimeout(() => card.remove(), 2500);
}

// ----------------- POSTURE METER & FP MULTIPLIERS -----------------
function renderPosture(posture) {
  const ratioVal = document.getElementById('posture-ratio-val');
  const bar = document.getElementById('posture-circle-bar');
  const earlyStat = document.getElementById('early-warnings-stat');
  const reactiveStat = document.getElementById('reactive-stat');
  const leadTimeStat = document.getElementById('lead-time-stat');

  if (ratioVal) ratioVal.innerText = `${posture.proactive_ratio}%`;
  if (bar) bar.setAttribute('stroke-dasharray', `${posture.proactive_ratio}, 100`);
  if (earlyStat) earlyStat.innerText = posture.early_warnings_count;
  if (reactiveStat) reactiveStat.innerText = posture.reactive_alerts_count;
  if (leadTimeStat) leadTimeStat.innerText = `${posture.avg_lead_time_hours} hrs`;

  // Update multipliers
  const mults = posture.signal_weight_multipliers || {};
  if (document.getElementById('mult-odd-hours')) {
    document.getElementById('mult-odd-hours').innerText = `${(mults.RULE_ODD_HOURS || 0.65).toFixed(2)}x`;
  }
  if (document.getElementById('mult-travel')) {
    document.getElementById('mult-travel').innerText = `${(mults.RULE_IMPOSSIBLE_TRAVEL || 0.85).toFixed(2)}x`;
  }
  if (document.getElementById('mult-volume')) {
    document.getElementById('mult-volume').innerText = `${(mults.RULE_VOLUME_SPIKE || 1.0).toFixed(2)}x`;
  }
  if (document.getElementById('mult-drift')) {
    document.getElementById('mult-drift').innerText = `${(mults.RULE_EWMA_DRIFT || 1.20).toFixed(2)}x`;
  }
}

// ----------------- ENTITY DOSSIER & CIRCADIAN CHART (HMW 1) -----------------
async function onEntitySelect(userId) {
  currentEntityId = userId;
  const selector = document.getElementById('entity-selector');
  if (selector) selector.value = userId;

  try {
    const res = await fetch(`/api/v1/entities/${userId}/dossier`);
    if (!res.ok) return;
    const data = await res.json();
    renderEntityDossier(data);
  } catch (err) {
    console.error('Failed to load entity dossier:', err);
  }
}

function renderEntityDossier(data) {
  const entity = data.entity;
  const profileCard = document.getElementById('entity-profile-card');
  if (!profileCard) return;

  const initials = entity.name.split(' ').map(n => n[0]).join('');
  const isDrifting = entity.is_drifting;

  profileCard.innerHTML = `
    <div class="flex items-start justify-between">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center font-bold text-white text-sm">
          ${initials}
        </div>
        <div>
          <h3 class="text-sm font-bold text-white">${entity.name}</h3>
          <p class="text-xs text-neutral-400">${entity.role_title} &bull; ${entity.department}</p>
        </div>
      </div>
      <div class="text-right">
        <div class="text-xs font-mono text-neutral-400">Risk Score</div>
        <div class="text-xl font-bold ${entity.risk_score >= 80 ? 'text-rose-400' : 'text-amber-400'} font-mono">${entity.risk_score} / 100</div>
      </div>
    </div>

    <!-- HMW 1: Dedicated Long-Term Baseline Drift Velocity Indicator -->
    <div class="p-3 rounded-lg ${isDrifting ? 'bg-orange-950/40 border border-orange-800/60' : 'bg-neutral-900 border border-neutral-800'} flex items-center justify-between">
      <div class="space-y-0.5">
        <div class="text-[10px] font-mono uppercase font-bold text-orange-400 flex items-center gap-1.5">
          <i class="fa-solid fa-chart-line"></i>
          HMW 1: Long-Term Baseline Drift Velocity Tracker
        </div>
        <p class="text-xs text-neutral-200">
          EWMA Velocity: <span class="font-mono text-orange-300 font-bold">+${entity.drift_velocity_pct}% Weekly Drift</span>
        </p>
      </div>
      <span class="px-2 py-1 rounded ${isDrifting ? 'bg-orange-900/60 border border-orange-700 text-orange-200 animate-pulse' : 'bg-neutral-800 text-neutral-400'} text-[10px] font-bold">
        ${isDrifting ? 'Low & Slow Exfil Warning' : 'Within Normal Baseline'}
      </span>
    </div>
  `;

  // Render Chart.js
  renderCircadianChart(data.circadian_24h_curve);
}

function renderCircadianChart(curveData) {
  const ctx = document.getElementById('circadianChart');
  if (!ctx) return;

  const labels = curveData.map(c => c.hour);
  const expected = curveData.map(c => c.expected_baseline_kb);
  const actual = curveData.map(c => c.actual_observed_kb);

  if (circadianChart) {
    circadianChart.destroy();
  }

  circadianChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [
        {
          label: '30-Day Circadian Baseline (KB)',
          data: expected,
          borderColor: 'rgba(156, 163, 175, 0.7)',
          backgroundColor: 'rgba(156, 163, 175, 0.05)',
          borderWidth: 2,
          borderDash: [4, 4],
          fill: true,
          tension: 0.3
        },
        {
          label: 'Actual Observed Velocity (KB)',
          data: actual,
          borderColor: 'rgba(249, 115, 22, 1)',
          backgroundColor: 'rgba(249, 115, 22, 0.15)',
          borderWidth: 2.5,
          fill: true,
          tension: 0.3,
          pointBackgroundColor: 'rgba(249, 115, 22, 1)'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#9ca3af', font: { size: 10 } }
        }
      },
      scales: {
        x: {
          ticks: { color: '#6b7280', font: { size: 9 }, maxTicksLimit: 12 },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        },
        y: {
          ticks: { color: '#6b7280', font: { size: 9 } },
          grid: { color: 'rgba(255, 255, 255, 0.05)' }
        }
      }
    }
  });
}

// ----------------- UNIVERSAL INGESTION MODAL (HMW 4) -----------------
function initIngestionModal() {
  const btnOpen = document.getElementById('btn-open-ingestion');
  const btnClose = document.getElementById('btn-close-ingestion');
  const btnCancel = document.getElementById('btn-cancel-ingestion');
  const modal = document.getElementById('ingestion-modal');

  if (btnOpen && modal) {
    btnOpen.onclick = () => {
      modal.classList.remove('hidden');
      loadSamplePreset('cef');
    };
  }

  const closeFn = () => modal?.classList.add('hidden');
  if (btnClose) btnClose.onclick = closeFn;
  if (btnCancel) btnCancel.onclick = closeFn;
}

function loadSamplePreset(type) {
  const input = document.getElementById('raw-log-input');
  if (input && SAMPLE_PRESETS[type]) {
    input.value = SAMPLE_PRESETS[type];
  }
}

async function submitUniversalTelemetry() {
  const input = document.getElementById('raw-log-input');
  const rawText = input?.value.trim();
  if (!rawText) return;

  const resultBox = document.getElementById('ingestion-result-box');
  const resultJson = document.getElementById('ingestion-result-json');

  let payload = { raw_payload: rawText };
  if (rawText.startsWith('{')) {
    try {
      payload = { data: JSON.parse(rawText) };
    } catch (e) {
      payload = { raw_payload: rawText };
    }
  }

  try {
    const res = await fetch('/api/v1/telemetry/universal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      const data = await res.json();
      if (resultBox && resultJson) {
        resultBox.classList.remove('hidden');
        resultJson.innerText = JSON.stringify(data, null, 2);
      }
    }
  } catch (err) {
    console.error('Ingestion failed:', err);
  }
}

// ----------------- SCENARIO INJECTOR -----------------
async function triggerScenario(type) {
  try {
    await fetch('/api/v1/simulation/scenario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scenario_type: type })
    });
  } catch (e) {
    console.error(e);
  }
}

// ----------------- UTILITIES -----------------
function formatBytes(bytes) {
  if (!bytes) return '0 B';
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes >= 1_000) return `${(bytes / 1_000).toFixed(1)} KB`;
  return `${bytes} B`;
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  initWebSocket();
  initIngestionModal();
  onEntitySelect('sophia.chen');

  const btnToggle = document.getElementById('btn-toggle-stream');
  if (btnToggle) {
    btnToggle.onclick = () => {
      isStreamPaused = !isStreamPaused;
      btnToggle.innerText = isStreamPaused ? 'Resume' : 'Pause';
      btnToggle.className = isStreamPaused ? 'text-[11px] px-2 py-0.5 rounded bg-orange-600 text-white' : 'text-[11px] px-2 py-0.5 rounded bg-neutral-800 text-neutral-400 hover:text-white border border-neutral-700';
    };
  }
});
