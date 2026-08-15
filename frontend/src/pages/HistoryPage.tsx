import { useState, useEffect } from 'react';
import {
  History,
  Send,
  CheckCircle2,
  AlertCircle,
  Building2,
  Search,
  RefreshCw,
  Trash2,
  Loader2,
  Zap,
  Download,
  Paperclip,
} from 'lucide-react';
import Button from '../components/ui/Button';
import type { SendLog, HistoryStats } from '../types';
import api from '../services/api';

export default function HistoryPage() {
  const [logs, setLogs] = useState<SendLog[]>([]);
  const [stats, setStats] = useState<HistoryStats>({
    total_sent: 0,
    total_delivered: 0,
    total_failed: 0,
    total_campaigns: 0,
  });
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const params: { [key: string]: string | number } = { limit: 100 };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (search.trim()) params.search = search.trim();

      const [logsRes, statsRes] = await Promise.all([
        api.get<{ logs: SendLog[]; total: number }>('/api/history', { params }),
        api.get<HistoryStats>('/api/history/stats'),
      ]);

      setLogs(logsRes.data.logs || []);
      setStats(statsRes.data);
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadData();
  };

  const handleClearHistory = async () => {
    if (!window.confirm('Are you sure you want to clear all outreach history logs?')) return;
    try {
      await api.delete('/api/history');
      loadData();
    } catch {
      alert('Failed to clear history.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const params: { [key: string]: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;

      const response = await api.get('/api/history/export', {
        params,
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartreach_outreach_history.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export history CSV.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Outreach History & Delivery
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Complete audit trail of all dispatched emails, delivery statuses, and response timestamps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {logs.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={refreshing}
            icon={<RefreshCw className="w-3.5 h-3.5" />}
            onClick={() => loadData(true)}
          >
            Refresh
          </Button>

          {logs.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-text-tertiary hover:text-error hover:bg-error-light"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClearHistory}
            >
              Clear Logs
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sent */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Total Dispatched
            </span>
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-2">
            {stats.total_sent}
          </p>
          <span className="text-xs text-text-tertiary">All-time outreach</span>
        </div>

        {/* Delivered / Sandbox */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Delivered
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {stats.total_delivered}
          </p>
          <span className="text-xs text-emerald-700 font-medium">Successfully delivered</span>
        </div>

        {/* Failed / Bounced */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Bounced / Failed
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-2">
            {stats.total_failed}
          </p>
          <span className="text-xs text-text-tertiary">Requires attention</span>
        </div>

        {/* Total Campaigns */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Total Campaigns
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <History className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {stats.total_campaigns}
          </p>
          <span className="text-xs text-text-tertiary">Active pipelines</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-surface rounded-xl border border-border p-4 shadow-card flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search candidate, company, campaign..."
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/70 border border-border rounded-lg text-xs w-full md:w-auto justify-center">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-surface text-text-primary shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All Logs
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('delivered')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              statusFilter === 'delivered'
                ? 'bg-surface text-emerald-700 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Delivered
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('failed')}
            className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${
              statusFilter === 'failed'
                ? 'bg-surface text-red-700 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            Failed
          </button>
        </div>
      </div>

      {/* Delivery Logs Table */}
      {logs.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-card">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <History className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            No Dispatch Logs Found
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto">
            Once you launch and dispatch your campaigns, every outreach event will appear here with timestamps and delivery statuses.
          </p>
        </div>
      ) : (
        <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-secondary/50 border-b border-border text-text-tertiary font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Recipient & Company</th>
                  <th className="py-3 px-4">Subject & Campaign</th>
                  <th className="py-3 px-4">Sent At</th>
                  <th className="py-3 px-4 text-right">Delivery Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const isDelivered =
                    log.status === 'delivered' ||
                    log.status === 'simulated' ||
                    log.status === 'sent';
                  const isSimulated = log.status === 'simulated';

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-surface-secondary/30 transition-colors"
                    >
                      {/* Recipient */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold shrink-0">
                            {log.recipient_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-text-primary">
                              {log.recipient_name}
                            </p>
                            <div className="flex items-center gap-1 text-[11px] text-text-tertiary mt-0.5">
                              <Building2 className="w-3 h-3" />
                              <span>{log.recipient_company}</span>
                              <span>•</span>
                              <span className="font-mono">{log.recipient_email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Subject & Campaign */}
                      <td className="py-3 px-4 max-w-xs">
                        <p className="font-medium text-text-primary truncate">
                          {log.subject}
                        </p>
                        <div className="flex items-center flex-wrap gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.2 rounded bg-surface-tertiary text-[10px] text-text-secondary font-medium">
                            {log.campaign_name}
                          </span>
                          {log.resume_attached && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-primary-50 text-primary-700 text-[10px] font-semibold border border-primary-200">
                              <Paperclip className="w-2.5 h-2.5" />
                              {log.resume_filename || 'Resume.pdf'}
                            </span>
                          )}
                          <span className="text-[11px] text-text-tertiary truncate">
                            {log.body_snippet}
                          </span>
                        </div>
                      </td>

                      {/* Timestamp */}
                      <td className="py-3 px-4 text-text-secondary whitespace-nowrap">
                        {new Date(log.sent_at).toLocaleString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isSimulated ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-blue-50 text-blue-700 border border-blue-200 text-[11px]">
                            <Zap className="w-3 h-3" />
                            Simulated
                          </span>
                        ) : isDelivered ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px]">
                            <CheckCircle2 className="w-3 h-3" />
                            Delivered
                          </span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold bg-red-50 text-red-700 border border-red-200 text-[11px]"
                            title={log.error_message || 'Delivery error'}
                          >
                            <AlertCircle className="w-3 h-3" />
                            Failed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
