import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckCircle2,
  Send,
  AlertTriangle,
  Megaphone,
  Clock,
  Sparkles,
  ArrowRight,
  Plus,
  Building2,
} from 'lucide-react';
import StatsCard from '../components/ui/StatsCard';
import Button from '../components/ui/Button';
import { checkHealth } from '../services/api';
import api from '../services/api';
import type { Campaign, SendLog, HistoryStats } from '../types';

export default function DashboardPage() {
  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'connected' | 'disconnected'
  >('checking');
  const [demoMode, setDemoMode] = useState(false);

  const [totalContacts, setTotalContacts] = useState(0);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [recentLogs, setRecentLogs] = useState<SendLog[]>([]);
  const [historyStats, setHistoryStats] = useState<HistoryStats>({
    total_sent: 0,
    total_delivered: 0,
    total_failed: 0,
    total_campaigns: 0,
  });

  useEffect(() => {
    checkHealth()
      .then((data) => {
        setBackendStatus('connected');
        setDemoMode(data.demoMode);
      })
      .catch(() => {
        setBackendStatus('disconnected');
      });

    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const [contactsRes, campsRes, logsRes, statsRes] = await Promise.all([
        api.get('/api/contacts/stats').catch(() => ({ data: { total: 0 } })),
        api.get('/api/campaigns').catch(() => ({ data: { campaigns: [] } })),
        api.get('/api/history', { params: { limit: 5 } }).catch(() => ({ data: { logs: [] } })),
        api.get('/api/history/stats').catch(() => ({ data: { total_sent: 0, total_delivered: 0, total_failed: 0, total_campaigns: 0 } })),
      ]);

      setTotalContacts(contactsRes.data.total ?? 0);
      setCampaigns(campsRes.data.campaigns || []);
      setRecentLogs(logsRes.data.logs || []);
      setHistoryStats(statsRes.data);
    } catch {
      // Degraded data
    }
  };

  const totalGenerated = campaigns.reduce(
    (acc, c) => acc + (c.emails_generated ?? c.generated ?? 0),
    0
  );
  const totalApproved = campaigns.reduce(
    (acc, c) => acc + (c.emails_approved ?? c.approved ?? 0),
    0
  );
  const totalSent = historyStats.total_sent || campaigns.reduce((acc, c) => acc + (c.emails_sent ?? c.sent ?? 0), 0);

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time analytics and outreach activity across your active candidate profile.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link to="/campaigns">
            <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />}>
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      {/* Status banner */}
      {backendStatus === 'disconnected' && (
        <div className="bg-warning-light border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-800">
              Backend Unavailable
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              The API server is not running. Start the backend with{' '}
              <code className="px-1 py-0.5 bg-amber-100 rounded text-xs font-mono">
                uvicorn app.main:app --reload
              </code>
            </p>
          </div>
        </div>
      )}

      {backendStatus === 'connected' && demoMode && (
        <div className="bg-info-light border border-blue-200 rounded-xl px-4 py-3 flex items-start gap-3 shadow-xs">
          <Sparkles className="w-5 h-5 text-info shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-800">Demo Sandbox Active</p>
            <p className="text-xs text-blue-700 mt-0.5">
              SmartReach is operating in sandbox simulation mode. Live email deliveries are safely simulated.
            </p>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <StatsCard
          label="Total Contacts"
          value={totalContacts}
          icon={Users}
          color="blue"
        />
        <StatsCard
          label="Campaigns"
          value={campaigns.length}
          icon={Megaphone}
          color="yellow"
        />
        <StatsCard
          label="AI Generated"
          value={totalGenerated}
          icon={Sparkles}
          color="purple"
        />
        <StatsCard
          label="Approved"
          value={totalApproved}
          icon={CheckCircle2}
          color="green"
        />
        <StatsCard
          label="Emails Sent"
          value={totalSent}
          icon={Send}
          color="blue"
        />
        <StatsCard
          label="Failed / Bounced"
          value={historyStats.total_failed}
          icon={AlertTriangle}
          color="red"
        />
      </div>

      {/* Quick Launch & Workspace Flow */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-card bg-gradient-to-r from-primary-50/30 via-surface to-surface">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-600 text-white flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                SmartReach AI Outreach Pipeline
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                Upload Contacts → Parse Resume & Setup Profile → Configure Campaign & Tone → Review & Dispatch
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/upload"
              className="px-3 py-1.5 rounded-lg border border-border bg-surface text-xs font-semibold text-text-primary hover:bg-surface-secondary transition-colors"
            >
              Manage Contacts
            </Link>
            <Link
              to="/campaigns"
              className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition-colors flex items-center gap-1"
            >
              <span>Campaigns</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Campaigns & Recent Outbox Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Recent Campaigns */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Active Campaigns
                </h2>
              </div>
              <Link
                to="/campaigns"
                className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>View all</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {campaigns.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-text-tertiary">No campaigns created yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {campaigns.slice(0, 3).map((c) => {
                  const gen = c.emails_generated ?? c.generated ?? 0;
                  const app = c.emails_approved ?? c.approved ?? 0;
                  return (
                    <Link
                      key={c.id}
                      to={`/campaign/${c.id}`}
                      className="block p-3 rounded-lg border border-border hover:border-primary-300 hover:bg-surface-secondary/40 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold text-text-primary">
                          {c.name}
                        </p>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-50 text-primary-700 capitalize">
                          {c.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-text-tertiary mt-1">
                        <span>Role: {c.target_role || 'Engineer'}</span>
                        <span>•</span>
                        <span>{gen} Generated</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-medium">{app} Approved</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Recent Delivery Activity */}
        <div className="bg-surface rounded-xl border border-border shadow-card p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-semibold text-text-primary">
                  Recent Outbox Activity
                </h2>
              </div>
              <Link
                to="/history"
                className="text-xs text-primary-600 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Full history</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {recentLogs.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-xs text-text-tertiary">No outreach events dispatched yet.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentLogs.slice(0, 3).map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg border border-border bg-surface-secondary/20 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 text-xs font-semibold shrink-0">
                        {log.recipient_name.charAt(0)}
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-semibold text-text-primary truncate">
                          {log.recipient_name}
                        </p>
                        <div className="flex items-center gap-1 text-[11px] text-text-tertiary truncate">
                          <Building2 className="w-3 h-3" />
                          <span>{log.recipient_company}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {log.status === 'simulated' ? 'Simulated' : 'Delivered'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
