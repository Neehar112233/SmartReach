import { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Sparkles,
  CheckCircle2,
  Send,
  Loader2,
} from 'lucide-react';
import Button from '../components/ui/Button';
import CampaignCard from '../components/CampaignCard';
import CreateCampaignModal from '../components/CreateCampaignModal';
import type { Campaign } from '../types';
import api from '../services/api';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadCampaigns = async () => {
    try {
      const { data } = await api.get('/api/campaigns');
      setCampaigns(data.campaigns || []);
    } catch {
      // Handle silently or display notice
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCampaigns();
  }, []);

  const handleCampaignCreated = (newCamp: Campaign) => {
    setCampaigns((prev) => [newCamp, ...prev]);
  };

  const handleDeleteCampaign = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    try {
      await api.delete(`/api/campaigns/${id}`);
      setCampaigns((prev) => prev.filter((c) => c.id !== id));
    } catch {
      alert('Failed to delete campaign.');
    }
  };

  // Aggregated Stats
  const totalCampaigns = campaigns.length;
  const totalGenerated = campaigns.reduce(
    (acc, c) => acc + (c.emails_generated ?? c.generated ?? 0),
    0
  );
  const totalApproved = campaigns.reduce(
    (acc, c) => acc + (c.emails_approved ?? c.approved ?? 0),
    0
  );
  const totalSent = campaigns.reduce(
    (acc, c) => acc + (c.emails_sent ?? c.sent ?? 0),
    0
  );

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
            Outreach Campaigns
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Create, manage, and monitor hyper-personalized AI email campaigns for your target recruiters.
          </p>
        </div>

        <Button
          type="button"
          size="sm"
          icon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowCreateModal(true)}
        >
          Create Campaign
        </Button>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Campaigns */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Total Campaigns
            </span>
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Megaphone className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-2">
            {totalCampaigns}
          </p>
          <span className="text-xs text-text-tertiary">Active pipelines</span>
        </div>

        {/* AI Generated */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              AI Generated
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-blue-600 mt-2">
            {totalGenerated}
          </p>
          <span className="text-xs text-text-tertiary">Personalized drafts</span>
        </div>

        {/* Approved for Sending */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Approved
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {totalApproved}
          </p>
          <span className="text-xs text-emerald-700 font-medium">Ready to dispatch</span>
        </div>

        {/* Emails Sent */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Emails Sent
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600">
              <Send className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-purple-600 mt-2">
            {totalSent}
          </p>
          <span className="text-xs text-text-tertiary">Delivered to inboxes</span>
        </div>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 text-center shadow-card">
          <div className="w-12 h-12 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mx-auto mb-4">
            <Megaphone className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-text-primary mb-1">
            No Campaigns Yet
          </h3>
          <p className="text-sm text-text-secondary max-w-sm mx-auto mb-5">
            Launch your first outreach campaign to generate personalized cold emails matching your resume and target recruiter list.
          </p>
          <Button
            type="button"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowCreateModal(true)}
          >
            Create Your First Campaign
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {campaigns.map((camp) => (
            <CampaignCard
              key={camp.id}
              campaign={camp}
              onDelete={handleDeleteCampaign}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      <CreateCampaignModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCampaignCreated={handleCampaignCreated}
      />
    </div>
  );
}
