import React, { useState, useEffect } from 'react';
import {
  Mail,
  ShieldCheck,
  Server,
  Zap,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Save,
  Loader2,
  Paperclip,
} from 'lucide-react';
import Button from '../components/ui/Button';
import type { SMTPSettings, SMTPTestResponse } from '../types';
import api from '../services/api';

const PRESETS = [
  {
    id: 'gmail',
    name: 'Gmail / Google Workspace',
    host: 'smtp.gmail.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    tip: 'Requires a Google App Password (not your normal Google account password).',
  },
  {
    id: 'outlook',
    name: 'Outlook / Office 365',
    host: 'smtp.office365.com',
    port: 587,
    use_tls: true,
    use_ssl: false,
    tip: 'Use your Microsoft account email and an App Password.',
  },
  {
    id: 'sendgrid',
    name: 'SendGrid',
    host: 'smtp.sendgrid.net',
    port: 587,
    use_tls: true,
    use_ssl: false,
    tip: 'Username is "apikey" and password is your SendGrid API key.',
  },
  {
    id: 'custom',
    name: 'Custom SMTP Server',
    host: '',
    port: 587,
    use_tls: true,
    use_ssl: false,
    tip: 'Configure your company or custom mail server credentials.',
  },
];

export default function SettingsPage() {
  const [provider, setProvider] = useState('gmail');
  const [smtpHost, setSmtpHost] = useState('smtp.gmail.com');
  const [smtpPort, setSmtpPort] = useState(587);
  const [smtpUser, setSmtpUser] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [senderName, setSenderName] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [useTls, setUseTls] = useState(true);
  const [useSsl, setUseSsl] = useState(false);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [delaySeconds, setDelaySeconds] = useState(3);
  const [simulationMode, setSimulationMode] = useState(true);
  const [attachResume, setAttachResume] = useState(true);
  const [hasSavedPassword, setHasSavedPassword] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('untested');

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<SMTPTestResponse | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data } = await api.get<SMTPSettings>('/api/settings/smtp');
      setProvider(data.provider || 'gmail');
      setSmtpHost(data.smtp_host || 'smtp.gmail.com');
      setSmtpPort(data.smtp_port || 587);
      setSmtpUser(data.smtp_user || '');
      setSenderName(data.sender_name || '');
      setSenderEmail(data.sender_email || '');
      setUseTls(data.use_tls ?? true);
      setUseSsl(data.use_ssl ?? false);
      setDailyLimit(data.daily_limit || 50);
      setDelaySeconds(data.delay_seconds || 3);
      setSimulationMode(data.simulation_mode ?? true);
      setAttachResume(data.attach_resume ?? true);
      setHasSavedPassword(!!data.has_password);
      setConnectionStatus(data.connection_status || 'untested');
    } catch {
      // Default to safe defaults
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setProvider(presetId);
    const p = PRESETS.find((x) => x.id === presetId);
    if (p && p.host) {
      setSmtpHost(p.host);
      setSmtpPort(p.port);
      setUseTls(p.use_tls);
      setUseSsl(p.use_ssl);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const payload: Partial<SMTPSettings> = {
        provider,
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort),
        smtp_user: smtpUser,
        sender_name: senderName,
        sender_email: senderEmail,
        use_tls: useTls,
        use_ssl: useSsl,
        daily_limit: Number(dailyLimit),
        delay_seconds: Number(delaySeconds),
        simulation_mode: simulationMode,
        attach_resume: attachResume,
      };

      if (smtpPassword.trim()) {
        payload.smtp_password = smtpPassword.trim();
      }

      const { data } = await api.put<SMTPSettings>('/api/settings/smtp', payload);
      setHasSavedPassword(!!data.has_password);
      setConnectionStatus(data.connection_status || 'untested');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch {
      alert('Failed to save SMTP settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const payload = {
        provider,
        smtp_host: smtpHost,
        smtp_port: Number(smtpPort),
        smtp_user: smtpUser,
        smtp_password: smtpPassword.trim() || undefined,
        use_tls: useTls,
        use_ssl: useSsl,
        simulation_mode: simulationMode,
      };

      const { data } = await api.post<SMTPTestResponse>('/api/settings/smtp/test', payload);
      setTestResult(data);
      setConnectionStatus(data.success ? 'connected' : 'failed');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setTestResult({
        success: false,
        message: axiosErr.response?.data?.detail || 'Connection test failed.',
      });
      setConnectionStatus('failed');
    } finally {
      setTesting(false);
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
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Email & Dispatch Settings
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Configure your outgoing SMTP server, delivery speed, and anti-spam safeguards.
          </p>
        </div>

        {/* Live Status Badge */}
        <div className="flex items-center gap-2">
          {simulationMode ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <Zap className="w-3.5 h-3.5" />
              Sandbox Simulation Active
            </span>
          ) : connectionStatus === 'connected' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              SMTP Connected
            </span>
          ) : connectionStatus === 'failed' ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <XCircle className="w-3.5 h-3.5" />
              Connection Error
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-surface-tertiary text-text-secondary border border-border">
              Untested
            </span>
          )}
        </div>
      </div>

      {saveSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl p-4 flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <p className="text-sm font-medium">
            Settings saved successfully! Your dispatcher is updated.
          </p>
        </div>
      )}

      {/* Sandbox Toggle Banner */}
      <div className="bg-surface rounded-xl border border-primary-200/80 p-5 shadow-card bg-gradient-to-r from-primary-50/40 via-surface to-surface">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-100 flex items-center justify-center text-primary-700 shrink-0 mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                Sandbox Simulation Mode
              </h3>
              <p className="text-xs text-text-secondary mt-0.5 max-w-xl">
                Simulates real-world email delivery without sending actual emails. Recommended for safe testing of campaigns, templates, and UI workflows.
              </p>
            </div>
          </div>

          <label className="relative inline-flex items-center cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={simulationMode}
              onChange={(e) => setSimulationMode(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
          </label>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Provider Presets */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              1. Choose Mail Provider
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Select your email provider to automatically pre-fill server addresses.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PRESETS.map((p) => (
              <button
                type="button"
                key={p.id}
                onClick={() => handleSelectPreset(p.id)}
                className={`
                  p-3.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between
                  ${
                    provider === p.id
                      ? 'border-primary-500 bg-primary-50/50 ring-2 ring-primary-500/20'
                      : 'border-border bg-surface hover:border-text-tertiary'
                  }
                `}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-primary-600" />
                    <span className="text-xs font-semibold text-text-primary">
                      {p.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-2">
                    {p.tip}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Server & Authentication */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-card space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
                <Server className="w-4 h-4 text-primary-600" />
                2. Server & Authentication Credentials
              </h3>
              <p className="text-xs text-text-tertiary mt-0.5">
                Provide the credentials used to establish the outbound SMTP connection.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Host */}
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-text-primary mb-1">
                SMTP Server Host <span className="text-error">*</span>
              </label>
              <input
                type="text"
                required
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Port */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Port <span className="text-error">*</span>
              </label>
              <input
                type="number"
                required
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="587"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Username / Email */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                SMTP Username / Email <span className="text-error">*</span>
              </label>
              <input
                type="text"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="youremail@example.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* App Password */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                App Password / API Key{' '}
                {hasSavedPassword && (
                  <span className="text-emerald-600 font-normal">
                    (Password Saved)
                  </span>
                )}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={smtpPassword}
                  onChange={(e) => setSmtpPassword(e.target.value)}
                  placeholder={
                    hasSavedPassword
                      ? '•••••••••••••••• (Leave blank to keep current)'
                      : 'Enter App Password'
                  }
                  className="w-full pl-3 pr-10 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Sender Display Name */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                Sender Display Name
              </label>
              <input
                type="text"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                placeholder="e.g., Neehar Sharma"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* From Email Address */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1">
                From Email Address
              </label>
              <input
                type="email"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                placeholder="e.g., neehar@example.com"
                className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Encryption Toggles */}
          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={useTls}
                onChange={(e) => setUseTls(e.target.checked)}
                className="rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span>Enable STARTTLS (Recommended for Port 587)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-secondary">
              <input
                type="checkbox"
                checked={useSsl}
                onChange={(e) => setUseSsl(e.target.checked)}
                className="rounded border-border text-primary-600 focus:ring-primary-500"
              />
              <span>Enable SSL (Port 465)</span>
            </label>
          </div>
        </div>

        {/* Anti-Spam & Rate Limiting Controls */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-card space-y-5">
          <div>
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              3. Rate Limiting & Inbox Safeguards
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Protect your email domain reputation and prevent spam blacklisting.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily limit */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  Daily Dispatch Cap
                </label>
                <span className="text-xs font-bold text-primary-600">
                  {dailyLimit} emails / day
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={250}
                step={5}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <span className="text-[11px] text-text-tertiary">
                Recommended: 30–50 for new cold outreach domains.
              </span>
            </div>

            {/* Delay seconds */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-text-primary">
                  Delay Between Emails
                </label>
                <span className="text-xs font-bold text-primary-600">
                  {delaySeconds}s + random jitter
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={30}
                step={1}
                value={delaySeconds}
                onChange={(e) => setDelaySeconds(Number(e.target.value))}
                className="w-full accent-primary-600"
              />
              <span className="text-[11px] text-text-tertiary">
                Randomized jitter (0.2s–0.8s) is added to emulate human sending.
              </span>
            </div>
          </div>
        </div>

        {/* Outreach Attachments & Resume */}
        <div className="bg-surface rounded-xl border border-border p-6 shadow-card space-y-4">
          <div>
            <h3 className="text-base font-semibold text-text-primary flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-primary-600" />
              4. Outreach Attachments & Resume
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Automatically attach your uploaded PDF resume to outbound outreach emails.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-border bg-surface-secondary/40 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <p className="text-xs font-semibold text-text-primary">
                Attach Profile Resume (PDF) to Emails
              </p>
              <p className="text-xs text-text-secondary">
                When enabled, your active resume uploaded in Profile will be automatically attached as a PDF file to every outreach email dispatched to recruiters.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={attachResume}
                onChange={(e) => setAttachResume(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-tertiary peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600" />
            </label>
          </div>
        </div>

        {/* Live Test Feedback Banner */}
        {testResult && (
          <div
            className={`
              p-4 rounded-xl border flex items-start gap-3 animate-in fade-in duration-150
              ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }
            `}
          >
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-semibold">
                {testResult.success
                  ? 'Connection Test Successful'
                  : 'Connection Test Failed'}
              </h4>
              <p className="text-xs mt-0.5 opacity-90">{testResult.message}</p>
              {testResult.latency_ms && (
                <span className="inline-block text-[11px] font-mono mt-1 px-2 py-0.5 rounded bg-black/5">
                  Latency: {testResult.latency_ms} ms
                </span>
              )}
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="flex items-center justify-between pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={testing}
            onClick={handleTestConnection}
          >
            Test Connection
          </Button>

          <Button
            type="submit"
            size="sm"
            loading={saving}
            icon={<Save className="w-3.5 h-3.5" />}
          >
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
