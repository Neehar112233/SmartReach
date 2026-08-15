import { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Sparkles,
  Mail,
  Building2,
  Save,
  Clock,
  FileText,
  Paperclip,
} from 'lucide-react';
import Button from './ui/Button';
import type { GeneratedEmail } from '../types';
import api from '../services/api';

interface EmailPreviewEditorProps {
  email: GeneratedEmail;
  onUpdated: (updated: GeneratedEmail) => void;
}

export default function EmailPreviewEditor({
  email,
  onUpdated,
}: EmailPreviewEditorProps) {
  const [subject, setSubject] = useState(email.subject);
  const [body, setBody] = useState(email.body);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const wordCount = body.trim().split(/\s+/).filter(Boolean).length;
  const readTimeSeconds = Math.ceil(wordCount / 3.5); // ~200 WPM

  const recipientName = email.recipient_name || email.contactName || 'Recruiter';
  const recipientEmail = email.recipient_email || email.contactEmail || '';
  const recipientCompany = email.recipient_company || email.contactCompany || '';
  const recipientTitle = email.recipient_title || email.contactTitle || 'Recruiter';

  const handleSave = async (newStatus?: string) => {
    setSaving(true);
    try {
      const payload: { subject?: string; body?: string; status?: string } = {
        subject: subject.trim(),
        body: body.trim(),
      };
      if (newStatus) {
        payload.status = newStatus;
      }
      const { data } = await api.put<GeneratedEmail>(`/api/emails/${email.id}`, payload);
      onUpdated(data);
      setIsEditing(false);
    } catch {
      alert('Failed to save email changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const { data } = await api.post<GeneratedEmail>(`/api/emails/${email.id}/regenerate`);
      setSubject(data.subject);
      setBody(data.body);
      onUpdated(data);
      setIsEditing(false);
    } catch {
      alert('Failed to regenerate email.');
    } finally {
      setRegenerating(false);
    }
  };

  const isApproved = email.status === 'approved';
  const isRejected = email.status === 'rejected';

  return (
    <div
      className={`
        bg-surface rounded-xl border transition-all duration-200 overflow-hidden shadow-card
        ${
          isApproved
            ? 'border-emerald-500/50 ring-1 ring-emerald-500/20'
            : isRejected
            ? 'border-red-300 opacity-70'
            : 'border-border hover:border-text-tertiary'
        }
      `}
    >
      {/* Header: Recruiter Info & Badges */}
      <div className="p-4 bg-surface-secondary/40 border-b border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold shrink-0">
            {recipientName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-text-primary">
                {recipientName}
              </h4>
              <span className="text-xs text-text-tertiary">•</span>
              <div className="flex items-center gap-1 text-xs text-text-secondary font-medium">
                <Building2 className="w-3.5 h-3.5 text-text-tertiary" />
                <span>{recipientCompany}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-tertiary mt-0.5">
              <span className="truncate max-w-[200px]">{recipientTitle}</span>
              <span>•</span>
              <div className="flex items-center gap-1 font-mono text-[11px]">
                <Mail className="w-3 h-3" />
                <span>{recipientEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Badge & Metrics */}
        <div className="flex items-center gap-2 self-end sm:self-center">
          <div className="flex items-center gap-2 text-[11px] text-text-tertiary mr-1">
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" />
              {wordCount} words
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              ~{readTimeSeconds}s read
            </span>
          </div>

          {isApproved ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approved
            </span>
          ) : isRejected ? (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
              <XCircle className="w-3.5 h-3.5" />
              Rejected
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
              Draft (Pending Review)
            </span>
          )}
        </div>
      </div>

      {/* Content Area: Subject & Body */}
      <div className="p-5 space-y-4">
        {/* Subject Line */}
        <div>
          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
            Subject Line
          </label>
          {isEditing ? (
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg border border-border bg-surface text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          ) : (
            <p className="text-sm font-semibold text-text-primary bg-surface-secondary/50 px-3 py-2 rounded-lg border border-border/50">
              {subject}
            </p>
          )}
        </div>

        {/* Email Body */}
        <div>
          <label className="block text-xs font-semibold text-text-tertiary uppercase tracking-wider mb-1">
            Personalized Email Message
          </label>
          {isEditing ? (
            <textarea
              rows={8}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full p-3 rounded-lg border border-border bg-surface text-sm text-text-primary font-sans leading-relaxed focus:outline-none focus:ring-2 focus:ring-primary-500 resize-y"
            />
          ) : (
            <div className="p-4 rounded-lg bg-surface-secondary/20 border border-border/40 text-sm text-text-primary whitespace-pre-wrap font-sans leading-relaxed">
              {body}
            </div>
          )}

          {/* Attachment indicator */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary bg-surface-secondary/40 px-3 py-1.5 rounded-lg border border-border/50 w-fit">
            <Paperclip className="w-3.5 h-3.5 text-primary-600 shrink-0" />
            <span className="font-medium">PDF Resume automatically attached upon dispatch</span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="px-5 py-3 bg-surface-secondary/30 border-t border-border flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isEditing ? (
            <Button
              type="button"
              size="sm"
              loading={saving}
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={() => handleSave()}
            >
              Save Edits
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEditing(true)}
            >
              Edit Content
            </Button>
          )}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            loading={regenerating}
            icon={<Sparkles className="w-3.5 h-3.5 text-primary-600" />}
            onClick={handleRegenerate}
          >
            Regenerate AI
          </Button>
        </div>

        {/* Approve / Reject Buttons */}
        <div className="flex items-center gap-2">
          {!isRejected && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-text-tertiary hover:text-error hover:bg-error-light"
              onClick={() => handleSave('rejected')}
            >
              Reject
            </Button>
          )}

          {!isApproved ? (
            <Button
              type="button"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              icon={<CheckCircle2 className="w-3.5 h-3.5" />}
              onClick={() => handleSave('approved')}
            >
              Approve Email
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-text-secondary"
              onClick={() => handleSave('draft')}
            >
              Move to Draft
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
