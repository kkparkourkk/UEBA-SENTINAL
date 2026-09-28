/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { TopBar } from './components/TopBar';
import { Sidebar } from './components/Sidebar';
import { UnifiedDashboardView } from './components/UnifiedDashboardView';
import { OverviewView } from './components/OverviewView';
import { ActivityLogView } from './components/ActivityLogView';
import { AnomaliesView } from './components/AnomaliesView';
import { AlertsQueueView } from './components/AlertsQueueView';
import { InvestigationsView } from './components/InvestigationsView';
import { AuditLogView } from './components/AuditLogView';
import { SettingsView } from './components/SettingsView';
import { LoginPage } from './components/LoginPage';
import { AddEntityModal } from './components/AddEntityModal';
import {
  User,
  UnifiedUserPayload,
  AlertIncident,
  AnalystFeedbackRecord,
  AuthUser,
  LiveEventItem,
  PostureMetrics,
  FalsePositiveMetric,
  AppView,
} from './types';
import { Loader2, AlertTriangle, CheckCircle, X } from 'lucide-react';

const DEFAULT_DIRECTOR: AuthUser = {
  id: 'sec-dir-01',
  username: 'director',
  name: 'Eleanor Vance',
  role: 'security_director',
  roleTitle: 'Security Director',
  email: 'eleanor.vance@sentinel.soc',
  clearance: 'Level 4 — Executive Threat Authority',
  avatarColor: '#ea580c',
  canEscalate: true,
  canAddEntity: true,
};

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('entities');
  const [currentUser, setCurrentUser] = useState<AuthUser>(DEFAULT_DIRECTOR);
  const [isAddEntityOpen, setIsAddEntityOpen] = useState(false);

  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('sophia.chen');
  const [unifiedData, setUnifiedData] = useState<UnifiedUserPayload | null>(null);
  const [alerts, setAlerts] = useState<AlertIncident[]>([]);
  const [feedbackDataset, setFeedbackDataset] = useState<AnalystFeedbackRecord[]>([]);

  // Real-time telemetry & posture states
  const [liveEvents, setLiveEvents] = useState<LiveEventItem[]>([]);
  const [postureMetrics, setPostureMetrics] = useState<PostureMetrics | null>(null);
  const [fpMetrics, setFpMetrics] = useState<FalsePositiveMetric[]>([]);
  const [isWsConnected, setIsWsConnected] = useState(false);

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingUnified, setIsLoadingUnified] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Fetch all users
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error('Failed to load entities');
      const data = await res.json();
      const userList: User[] = Array.isArray(data) ? data : data.users || [];
      setUsers(userList);

      if (userList.length > 0 && !userList.some((u: User) => u.id === selectedUserId)) {
        const target = userList.find((u) => u.id === 'sophia.chen') || userList[0];
        setSelectedUserId(target.id);
      }
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setErrorMessage(err.message || 'Failed to connect to backend server');
    } finally {
      setIsLoadingUsers(false);
    }
  }, [selectedUserId]);

  // 2. Fetch unified payload for selected user
  const fetchUnifiedData = useCallback(async (userId: string) => {
    setIsLoadingUnified(true);
    try {
      const res = await fetch(`/api/users/${userId}/unified`);
      if (!res.ok) throw new Error(`Failed to load data for entity ${userId}`);
      const data = await res.json();
      setUnifiedData(data);
    } catch (err: any) {
      console.error('Error fetching unified data:', err);
      setErrorMessage(err.message);
    } finally {
      setIsLoadingUnified(false);
    }
  }, []);

  // 3. Fetch alert incidents
  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts?sortBy=priority');
      if (!res.ok) return;
      const data = await res.json();
      const alertList: AlertIncident[] = Array.isArray(data) ? data : data.alerts || [];
      setAlerts(alertList);
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
    }
  }, []);

  // 4. Fetch analyst feedback dataset
  const fetchFeedback = useCallback(async () => {
    try {
      const res = await fetch('/api/feedback');
      if (!res.ok) return;
      const data = await res.json();
      const feedbackList: AnalystFeedbackRecord[] = Array.isArray(data) ? data : data.feedbackDataset || [];
      setFeedbackDataset(feedbackList);
    } catch (err) {
      console.error('Error fetching feedback dataset:', err);
    }
  }, []);

  // 5. Fetch posture & false positive metrics
  const fetchMetrics = useCallback(async () => {
    try {
      const [posRes, fpRes, liveRes] = await Promise.all([
        fetch('/api/metrics/posture'),
        fetch('/api/metrics/false-positives'),
        fetch('/api/live/events?limit=50'),
      ]);
      if (posRes.ok) {
        const pData = await posRes.json();
        if (pData.posture) setPostureMetrics(pData.posture);
      }
      if (fpRes.ok) {
        const fpData = await fpRes.json();
        if (fpData.metrics) setFpMetrics(fpData.metrics);
      }
      if (liveRes.ok) {
        const lData = await liveRes.json();
        if (lData.events) setLiveEvents(lData.events);
      }
    } catch (err) {
      console.error('Error fetching live metrics:', err);
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws`;
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setIsWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === 'INIT_STATE') {
              if (msg.data.recentLiveEvents) setLiveEvents(msg.data.recentLiveEvents);
              if (msg.data.posture) setPostureMetrics(msg.data.posture);
              if (msg.data.fpMetrics) setFpMetrics(msg.data.fpMetrics);
            } else if (msg.type === 'LIVE_EVENT_SCORED') {
              setLiveEvents((prev) => [msg.data, ...prev.slice(0, 99)]);
              if (msg.posture) setPostureMetrics(msg.posture);
            } else if (msg.type === 'NEW_ALERT_PUSH') {
              setAlerts((prev) => [msg.data, ...prev]);
              setFeedbackNotice(`New Incident Flagged: ${msg.data.title}`);
              setTimeout(() => setFeedbackNotice(null), 5000);
            }
          } catch (e) {
            console.error('Error parsing WebSocket message:', e);
          }
        };

        ws.onclose = () => {
          setIsWsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          setIsWsConnected(false);
        };
      } catch (err) {
        setIsWsConnected(false);
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, []);

  // Initial load
  useEffect(() => {
    fetchUsers();
    fetchAlerts();
    fetchFeedback();
    fetchMetrics();
  }, [fetchUsers, fetchAlerts, fetchFeedback, fetchMetrics]);

  // When selected user changes, reload unified data
  useEffect(() => {
    if (selectedUserId) {
      fetchUnifiedData(selectedUserId);
    }
  }, [selectedUserId, fetchUnifiedData]);

  // Re-seed 30-day baseline dataset
  const handleResetSeed = async () => {
    if (isSeeding) return;
    setIsSeeding(true);
    try {
      const res = await fetch('/api/dataset/reset-seed', { method: 'POST' });
      if (!res.ok) throw new Error('Baseline recalibration failed');
      await fetchUsers();
      if (selectedUserId) {
        await fetchUnifiedData(selectedUserId);
      }
      await fetchAlerts();
      await fetchFeedback();
      await fetchMetrics();
      setFeedbackNotice('Synthetic telemetry re-calibrated with 30-day baseline and anomaly distributions.');
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Recalibration error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Submit analyst feedback / triage action
  const handleSubmitFeedback = async (
    alertId: string,
    decision: string,
    justification: string
  ) => {
    try {
      const res = await fetch(`/api/alerts/${alertId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decision,
          justification,
          analyst_name: currentUser?.name || 'SOC Analyst',
        }),
      });

      if (!res.ok) throw new Error('Failed to record analyst feedback');
      await fetchAlerts();
      await fetchFeedback();
      await fetchMetrics();
      setFeedbackNotice(`Action [${decision}] recorded on alert #${alertId}. Down-weight applied.`);
      setTimeout(() => setFeedbackNotice(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || 'Feedback error');
    }
  };

  const handleSelectUser = (id: string) => {
    setSelectedUserId(id);
    fetchUnifiedData(id);
  };

  // Determine which view to render
  const normalizedView = (() => {
    if (activeView === 'unified') return 'entities';
    if (activeView === 'priority') return 'alerts';
    if (activeView === 'oversight') return 'anomalies';
    if (activeView === 'live') return 'activity';
    if (activeView === 'posture' || activeView === 'landing') return 'overview';
    return activeView;
  })();

  return (
    <div className="min-h-screen bg-[#0c0e12] text-[#e5e7eb] flex flex-col font-sans selection:bg-amber-600 selection:text-white">
      {/* Top Bar */}
      <TopBar
        users={users}
        selectedUserId={selectedUserId}
        onSelectUser={handleSelectUser}
        currentUser={currentUser}
        onResetSeed={handleResetSeed}
        isSeeding={isSeeding}
        isWsConnected={isWsConnected}
        onOpenLogin={() => setActiveView('login')}
        onOpenAddEntity={() => setIsAddEntityOpen(true)}
      />

      {/* Main Layout Container (Sidebar + Content Workspace) */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar
          activeView={activeView}
          setActiveView={(view) => setActiveView(view)}
          pendingAlertsCount={alerts.length}
        />

        {/* Content Workspace */}
        <main className="flex-1 overflow-y-auto p-4 bg-[#0c0e12]">
          {/* Action / Notification Banner */}
          {feedbackNotice && (
            <div className="mb-4 p-2.5 bg-[#17201c] border border-emerald-600/40 text-emerald-300 text-xs font-mono flex items-center justify-between rounded-sm">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                <span>{feedbackNotice}</span>
              </div>
              <button
                onClick={() => setFeedbackNotice(null)}
                className="text-[#9ca3af] hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mb-4 p-2.5 bg-[#201518] border border-rose-600/40 text-rose-300 text-xs font-mono flex items-center justify-between rounded-sm">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-[#9ca3af] hover:text-white font-mono text-xs"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* View: Overview */}
          {normalizedView === 'overview' && (
            <OverviewView
              users={users}
              alerts={alerts}
              posture={postureMetrics}
              fpMetrics={fpMetrics}
              onSelectUser={handleSelectUser}
              onNavigateToView={(view) => setActiveView(view)}
            />
          )}

          {/* View: Entities (Main Entity Page - Sophia Chen) */}
          {normalizedView === 'entities' && (
            <div>
              {isLoadingUnified && !unifiedData ? (
                <div className="p-16 flex flex-col items-center justify-center text-[#6b7280] gap-2 font-mono text-xs">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Loading entity telemetry dossier...</span>
                </div>
              ) : unifiedData ? (
                <UnifiedDashboardView
                  data={unifiedData}
                  onNavigateToAlert={(alertId) => {
                    setActiveView('alerts');
                  }}
                  currentUser={currentUser}
                  onOpenAddEntity={() => setIsAddEntityOpen(true)}
                />
              ) : (
                <div className="p-12 text-center text-[#6b7280] font-mono text-xs">
                  No telemetry available for selected entity.
                </div>
              )}
            </div>
          )}

          {/* View: Activity (Compact Security Log Table) */}
          {normalizedView === 'activity' && (
            <ActivityLogView
              events={unifiedData?.activityFeed || []}
              liveEvents={liveEvents}
              isWsConnected={isWsConnected}
            />
          )}

          {/* View: Anomalies (Explainable Signals Breakdown) */}
          {normalizedView === 'anomalies' && (
            <AnomaliesView
              alerts={alerts}
              onNavigateToUser={handleSelectUser}
              onSubmitFeedback={handleSubmitFeedback}
            />
          )}

          {/* View: Alerts (Prioritized Queue) */}
          {normalizedView === 'alerts' && (
            <AlertsQueueView
              alerts={alerts}
              onSubmitFeedback={handleSubmitFeedback}
            />
          )}

          {/* View: Investigations (Open Case Dossiers) */}
          {normalizedView === 'investigations' && (
            <InvestigationsView
              users={users}
              onSelectUser={handleSelectUser}
              onNavigateToView={(view) => setActiveView(view)}
            />
          )}

          {/* View: Audit Log (Analyst Actions & Feedback History) */}
          {normalizedView === 'audit' && (
            <AuditLogView feedbackDataset={feedbackDataset} />
          )}

          {/* View: Settings (Baseline Parameters & Ingestion Status) */}
          {normalizedView === 'settings' && <SettingsView />}

          {/* View: Operator Authentication & Role Switcher */}
          {normalizedView === 'login' && (
            <LoginPage
              currentUser={currentUser}
              onLogin={(user: AuthUser) => {
                setCurrentUser(user);
                setActiveView('entities');
                setFeedbackNotice(`Authenticated as ${user.name} (${user.roleTitle}). Clearance: ${user.clearance}`);
                setTimeout(() => setFeedbackNotice(null), 4000);
              }}
              onNavigateToDashboard={() => setActiveView('entities')}
            />
          )}
        </main>
      </div>

      {/* Subtle CRT Monitor Scanlines & Vignette */}
      <div className="crt-overlay" />
      <div className="crt-vignette" />

      {/* Onboard Entity Modal */}
      <AddEntityModal
        isOpen={isAddEntityOpen}
        onClose={() => setIsAddEntityOpen(false)}
        currentUser={currentUser}
        onEntityCreated={async (newEntity: User) => {
          await fetchUsers();
          setSelectedUserId(newEntity.id);
          await fetchUnifiedData(newEntity.id);
          setActiveView('entities');
        }}
        onOpenLogin={() => {
          setIsAddEntityOpen(false);
          setActiveView('login');
        }}
      />
    </div>
  );
}
