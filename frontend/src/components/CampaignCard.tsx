import { Link } from 'react-router-dom';
import {
  Megaphone,
  Briefcase,
  Users,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Trash2,
} from 'lucide-react';
import type { Campaign } from '../types';

interface CampaignCardProps {
  campaign: Campaign;
  onDelete?: (id: string) => void;
}

export default function CampaignCard({ campaign, onDelete }: CampaignCardProps) {
  const total = campaign.total_contacts ?? campaign.totalContacts ?? 0;
  const generated = campaign.emails_generated ?? campaign.generated ?? 0;
  const approved = campaign.emails_approved ?? campaign.approved ?? 0;

  const pctGenerated = total > 0 ? Math.round((generated / total) * 100) : 0;
  const pctApproved = generated > 0 ? Math.round((approved / generated) * 100) : 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
      case 'generated':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Ready ({generated} generated)
          </span>
        );
      case 'generating':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            Generating...
          </span>
        );
      case 'sending':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
            Sending...
          </span>
        );
      case 'completed':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            Completed
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-surface-tertiary text-text-secondary border border-border">
            Draft
          </span>
        );
    }
  };

  return (
    <div className="bg-surface rounded-xl border border-border p-5 shadow-card hover:shadow-card-hover transition-all duration-200 flex flex-col justify-between group">
      <div>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600 shrink-0">
              <Megaphone className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-primary-600 transition-colors line-clamp-1">
                {campaign.name}
              </h3>
              <div className="flex items-center gap-1.5 text-xs text-text-tertiary mt-0.5">
                <Briefcase className="w-3 h-3" />
                <span>{campaign.target_role || campaign.targetRole || 'Software Engineer'}</span>
              </div>
            </div>
          </div>
          {getStatusBadge(campaign.status)}
        </div>

        {/* Tone and Style Pills */}
        <div className="flex flex-wrap items-center gap-1.5 my-3">
          <span className="px-2 py-0.5 rounded-md bg-surface-tertiary text-xs text-text-secondary font-medium capitalize">
            {campaign.tone} Tone
          </span>
          {campaign.subject_line_style && (
            <span className="px-2 py-0.5 rounded-md bg-surface-tertiary text-xs text-text-secondary font-medium capitalize">
              {campaign.subject_line_style} Subject
            </span>
          )}
        </div>

        {/* Progress Bars */}
        <div className="space-y-2.5 my-4 pt-2 border-t border-border">
          {/* Generation Progress */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-text-secondary flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-primary-500" /> AI Generated
              </span>
              <span className="font-medium text-text-primary">
                {generated} / {total} ({pctGenerated}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-primary-600 rounded-full transition-all duration-300"
                style={{ width: `${pctGenerated}%` }}
              />
            </div>
          </div>

          {/* Approval Progress */}
          {generated > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-text-secondary flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Approved
                </span>
                <span className="font-medium text-emerald-600">
                  {approved} / {generated} ({pctApproved}%)
                </span>
              </div>
              <div className="w-full h-1.5 bg-surface-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                  style={{ width: `${pctApproved}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="pt-3 border-t border-border flex items-center justify-between">
        <div className="flex items-center gap-1 text-xs text-text-tertiary">
          <Users className="w-3.5 h-3.5" />
          <span>{total} Contacts</span>
        </div>

        <div className="flex items-center gap-2">
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(campaign.id)}
              className="p-1.5 rounded-lg text-text-tertiary hover:text-error hover:bg-error-light transition-colors cursor-pointer"
              title="Delete Campaign"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          <Link
            to={`/campaign/${campaign.id}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary-50 text-primary-700 hover:bg-primary-100 text-xs font-semibold transition-colors"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
