import React, { useState } from 'react';
import {
  X,
  Megaphone,
  Briefcase,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import Button from './ui/Button';
import type { Campaign } from '../types';
import api from '../services/api';

interface CreateCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCampaignCreated: (campaign: Campaign) => void;
}

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Crisp, polite, and corporate' },
  { id: 'enthusiastic', label: 'Enthusiastic', desc: 'Energetic, motivated, and warm' },
  { id: 'casual', label: 'Casual', desc: 'Friendly, modern startup style' },
  { id: 'concise', label: 'Concise', desc: 'Direct, sub-100 words, high impact' },
];

const SUBJECT_STYLES = [
  { id: 'direct', label: 'Direct', example: 'Application for [Role] — [Name]' },
  { id: 'value', label: 'Value Focus', example: 'Value for [Company] Engineering — [Name]' },
  { id: 'curious', label: 'Question', example: 'Quick question regarding [Role] at [Company]' },
  { id: 'referral', label: 'Referral', example: '[Role] inquiry — [Name]' },
];

const PROMPT_SUGGESTIONS = [
  'Emphasize experience in React and FastAPI',
  'Keep the email under 130 words',
  'Highlight my AI / LLM projects',
  'Mention I am available to start immediately',
];

export default function CreateCampaignModal({
  isOpen,
  onClose,
  onCampaignCreated,
}: CreateCampaignModalProps) {
  const [name, setName] = useState('');
  const [targetRole, setTargetRole] = useState('Senior Full Stack Engineer');
  const [tone, setTone] = useState('enthusiastic');
  const [subjectStyle, setSubjectStyle] = useState('direct');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter a campaign name.');
      return;
    }
    if (!targetRole.trim()) {
      setError('Please specify a target role.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        name: name.trim(),
        target_role: targetRole.trim(),
        tone,
        subject_line_style: subjectStyle,
        custom_instructions: customInstructions.trim() || null,
      };

      const { data } = await api.post<Campaign>('/api/campaigns', payload);
      onCampaignCreated(data);
      onClose();
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(axiosErr.response?.data?.detail || 'Failed to create campaign.');
    } finally {
      setLoading(false);
    }
  };

  const addSuggestion = (text: string) => {
    setCustomInstructions((prev) =>
      prev ? `${prev}. ${text}` : text
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150 overflow-y-auto">
      <div className="bg-surface rounded-xl border border-border shadow-modal w-full max-w-xl overflow-hidden my-8 animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Create Outreach Campaign
              </h2>
              <p className="text-xs text-text-tertiary">
                Configure your target role, tone, and AI writing prompt.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-error-light border border-red-200 rounded-lg px-4 py-2.5 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-error shrink-0" />
              <p className="text-xs text-red-700 font-medium">{error}</p>
            </div>
          )}

          {/* Campaign Name */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Campaign Name <span className="text-error">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Q3 AI Startups & Tech Giants Outreach"
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Target Role */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Target Position / Role <span className="text-error">*</span>
            </label>
            <div className="relative">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
              <input
                type="text"
                required
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
                placeholder="e.g., Senior Full Stack AI Engineer"
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Outreach Tone
            </label>
            <div className="grid grid-cols-2 gap-2">
              {TONES.map((t) => (
                <button
                  type="button"
                  key={t.id}
                  onClick={() => setTone(t.id)}
                  className={`
                    p-2.5 rounded-lg border text-left transition-all cursor-pointer
                    ${
                      tone === t.id
                        ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500'
                        : 'border-border bg-surface hover:border-text-tertiary'
                    }
                  `}
                >
                  <p className="text-xs font-semibold text-text-primary">
                    {t.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5">
                    {t.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Subject Line Style */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1.5">
              Subject Line Style
            </label>
            <div className="grid grid-cols-2 gap-2">
              {SUBJECT_STYLES.map((s) => (
                <button
                  type="button"
                  key={s.id}
                  onClick={() => setSubjectStyle(s.id)}
                  className={`
                    p-2.5 rounded-lg border text-left transition-all cursor-pointer
                    ${
                      subjectStyle === s.id
                        ? 'border-primary-500 bg-primary-50/50 ring-1 ring-primary-500'
                        : 'border-border bg-surface hover:border-text-tertiary'
                    }
                  `}
                >
                  <p className="text-xs font-semibold text-text-primary">
                    {s.label}
                  </p>
                  <p className="text-[11px] text-text-tertiary mt-0.5 truncate">
                    {s.example}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs font-semibold text-text-primary mb-1">
              Custom AI Instructions (Optional)
            </label>
            <textarea
              rows={3}
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="e.g., Highlight my cloud architecture experience, mention interest in generative AI..."
              className="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
            {/* Quick Suggestion Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {PROMPT_SUGGESTIONS.map((sug, i) => (
                <button
                  type="button"
                  key={i}
                  onClick={() => addSuggestion(sug)}
                  className="px-2 py-0.5 rounded-full bg-surface-tertiary text-[11px] text-text-secondary hover:text-text-primary hover:bg-primary-50 transition-colors border border-border cursor-pointer flex items-center gap-1"
                >
                  <Sparkles className="w-2.5 h-2.5 text-primary-500" />
                  + {sug}
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              loading={loading}
              icon={<Megaphone className="w-3.5 h-3.5" />}
            >
              Create Campaign
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
