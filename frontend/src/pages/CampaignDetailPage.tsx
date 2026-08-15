import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Briefcase,
  Loader2,
  RefreshCw,
  Sliders,
  Send,
} from 'lucide-react';
import Button from '../components/ui/Button';
import EmailPreviewEditor from '../components/EmailPreviewEditor';
import DispatchProgressModal from '../components/DispatchProgressModal';
import type { Campaign, GeneratedEmail } from '../types';
import api from '../services/api';

export default function CampaignDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [emails, setEmails] = useState<GeneratedEmail[]>([]);
  const [counts, setCounts] = useState<{ [key: string]: number }>({
    all: 0,
    draft: 0,
    approved: 0,
    rejected: 0,
    sent: 0,
  });
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approvingAll, setApprovingAll] = useState(false);
  const [showDispatchModal, setShowDispatchModal] = useState(false);

  const loadCampaignData = async () => {
    if (!id) return;
    try {
      const [campRes, emailsRes] = await Promise.all([
        api.get<Campaign>(`/api/campaigns/${id}`),
        api.get<{ emails: GeneratedEmail[]; total: number; counts: { [key: string]: number } }>(
          `/api/emails/campaign/${id}`
        ),
      ]);
      setCampaign(campRes.data);
      setEmails(emailsRes.data.emails || []);
      if (emailsRes.data.counts) {
        setCounts(emailsRes.data.counts);
      }
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaignData();
  }, [id]);

  const handleGenerateEmails = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      await api.post(`/api/campaigns/${id}/generate`);
      await loadCampaignData();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || 'Failed to generate emails.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAll = async () => {
    if (!id) return;
    setApprovingAll(true);
    try {
      await api.post(`/api/emails/campaign/${id}/approve-all`);
      await loadCampaignData();
    } catch {
      alert('Failed to approve all emails.');
    } finally {
      setApprovingAll(false);
    }
  };

  const handleEmailUpdated = (updated: GeneratedEmail) => {
    setEmails((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    loadCampaignData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-primary-600 animate-spin" />
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-20">
        <h2 className="text-xl font-bold text-text-primary">Campaign not found</h2>
        <Link to="/campaigns" className="text-sm text-primary-600 hover:underline mt-2 inline-block">
          ← Back to Campaigns
        </Link>
      </div>
    );
  }

  const filteredEmails = emails.filter((e) => {
    if (statusFilter === 'all') return true;
    return e.status === statusFilter;
  });

  const totalContacts = campaign.total_contacts ?? campaign.totalContacts ?? 0;
  const generatedCount = counts.all || 0;
  const approvedCount = counts.approved || 0;
  const pctApproved = generatedCount > 0 ? Math.round((approvedCount / generatedCount) * 100) : 0;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/campaigns"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-text-secondary hover:text-primary-600 transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Campaigns</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">
                {campaign.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-50 text-primary-700 border border-primary-200">
                {campaign.status.toUpperCase()}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-text-secondary mt-1.5">
              <div className="flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="font-medium text-text-primary">
                  {campaign.target_role || campaign.targetRole}
                </span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-1">
                <Sliders className="w-3.5 h-3.5 text-text-tertiary" />
                <span className="capitalize">{campaign.tone} Tone</span>
              </div>
              {campaign.subject_line_style && (
                <>
                  <span>•</span>
                  <span className="capitalize">{campaign.subject_line_style} Subject Style</span>
                </>
              )}
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              loading={generating}
              icon={<Sparkles className="w-3.5 h-3.5 text-primary-600" />}
              onClick={handleGenerateEmails}
            >
              {generatedCount === 0 ? 'Generate AI Emails' : 'Regenerate All'}
            </Button>

            {generatedCount > 0 && counts.draft > 0 && (
              <Button
                type="button"
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                loading={approvingAll}
                icon={<CheckCircle2 className="w-3.5 h-3.5" />}
                onClick={handleApproveAll}
              >
                Approve All ({counts.draft})
              </Button>
            )}

            {approvedCount > 0 && (
              <Button
                type="button"
                size="sm"
                className="bg-primary-600 hover:bg-primary-700 text-white"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => setShowDispatchModal(true)}
              >
                Dispatch Emails ({approvedCount})
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Progress & Health Card */}
      <div className="bg-surface rounded-xl border border-border p-5 shadow-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Outreach Readiness Progress
            </h3>
            <p className="text-xs text-text-tertiary mt-0.5">
              Review and approve personalized drafts before triggering automated outreach.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-text-tertiary">Recipients: </span>
              <span className="font-semibold text-text-primary">{totalContacts}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Drafted: </span>
              <span className="font-semibold text-blue-600">{generatedCount}</span>
            </div>
            <div>
              <span className="text-text-tertiary">Approved: </span>
              <span className="font-semibold text-emerald-600">{approvedCount}</span>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${pctApproved}%` }}
          />
        </div>
      </div>

      {/* Custom Prompt Banner if present */}
      {campaign.custom_instructions && (
        <div className="bg-primary-50/50 border border-primary-100 rounded-xl p-3.5 text-xs text-text-secondary flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-primary-900">Custom Prompt: </span>
            <span>{campaign.custom_instructions}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Content */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex items-center gap-1.5 p-1 bg-surface-secondary/70 border border-border rounded-lg text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'all'
                  ? 'bg-surface text-text-primary shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              All ({counts.all || 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('draft')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'draft'
                  ? 'bg-surface text-amber-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Pending Review ({counts.draft || 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'approved'
                  ? 'bg-surface text-emerald-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Approved ({counts.approved || 0})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all cursor-pointer ${
                statusFilter === 'rejected'
                  ? 'bg-surface text-red-700 shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Rejected ({counts.rejected || 0})
            </button>
          </div>

          <button
            type="button"
            onClick={loadCampaignData}
            className="p-1.5 rounded-lg text-text-tertiary hover:text-text-primary hover:bg-surface-tertiary transition-colors cursor-pointer"
            title="Refresh emails"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Email Cards List */}
        {filteredEmails.length === 0 ? (
          <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-card">
            {generatedCount === 0 ? (
              <div>
                <Sparkles className="w-10 h-10 text-primary-500 mx-auto mb-3" />
                <h3 className="text-base font-semibold text-text-primary mb-1">
                  Ready to Generate AI Outreach
                </h3>
                <p className="text-sm text-text-secondary max-w-md mx-auto mb-5">
                  Generate tailored emails for {totalContacts} recruiter contacts matching your target role and resume profile.
                </p>
                <Button
                  type="button"
                  size="sm"
                  loading={generating}
                  icon={<Sparkles className="w-3.5 h-3.5" />}
                  onClick={handleGenerateEmails}
                >
                  Generate AI Emails Now
                </Button>
              </div>
            ) : (
              <p className="text-sm text-text-tertiary">
                No emails found matching the selected filter ({statusFilter}).
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEmails.map((email) => (
              <EmailPreviewEditor
                key={email.id}
                email={email}
                onUpdated={handleEmailUpdated}
              />
            ))}
          </div>
        )}
      </div>

      {/* Dispatch Progress Modal */}
      <DispatchProgressModal
        isOpen={showDispatchModal}
        campaignId={campaign.id}
        campaignName={campaign.name}
        approvedCount={approvedCount}
        onClose={() => {
          setShowDispatchModal(false);
          loadCampaignData();
        }}
        onCompleted={() => {
          loadCampaignData();
        }}
      />
    </div>
  );
}
