import { useState, useEffect } from 'react';
import {
  User as UserIcon,
  Mail,
  Phone,
  Link2,
  Code,
  Globe,
  Target,
  MessageSquare,
  Save,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Button from '../components/ui/Button';
import ResumeUploader from '../components/ResumeUploader';
import StructuredProfileEditor from '../components/StructuredProfileEditor';
import type { ExtractedProfile, ResumeUploadResponse } from '../types';
import api from '../services/api';

type TabType = 'resume' | 'personal' | 'ai_goals';

interface ProfileFormData {
  full_name: string;
  phone: string;
  linkedin_url: string;
  github_url: string;
  portfolio_url: string;
  outreach_objective: string;
  custom_instructions: string;
}

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('resume');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Basic info form
  const [form, setForm] = useState<ProfileFormData>({
    full_name: '',
    phone: '',
    linkedin_url: '',
    github_url: '',
    portfolio_url: '',
    outreach_objective: '',
    custom_instructions: '',
  });

  // Extracted resume profile
  const [extractedProfile, setExtractedProfile] = useState<ExtractedProfile | null>(null);

  // Fetch both basic profile and extracted resume data on mount
  useEffect(() => {
    const loadAllProfileData = async () => {
      try {
        const { data: profileData } = await api.get('/api/profile');
        setForm({
          full_name: profileData.full_name || '',
          phone: profileData.phone || '',
          linkedin_url: profileData.linkedin_url || '',
          github_url: profileData.github_url || '',
          portfolio_url: profileData.portfolio_url || '',
          outreach_objective: profileData.outreach_objective || '',
          custom_instructions: profileData.custom_instructions || '',
        });

        // Try loading resume data if available
        if (profileData.resume_uploaded) {
          try {
            const { data: resumeData } = await api.get<ExtractedProfile>('/api/resume');
            setExtractedProfile(resumeData);
          } catch {
            // Resume profile not found or empty
          }
        }
      } catch {
        setError('Failed to load profile data.');
      } finally {
        setLoading(false);
      }
    };

    loadAllProfileData();
  }, []);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setSuccess('');
    setError('');
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload: Record<string, string> = {};
      for (const [key, value] of Object.entries(form)) {
        if (value.trim()) {
          payload[key] = value.trim();
        }
      }

      const { data } = await api.put('/api/profile', payload);

      if (user) {
        updateUser({
          ...user,
          fullName: data.full_name,
          phone: data.phone,
          linkedinUrl: data.linkedin_url,
          githubUrl: data.github_url,
          portfolioUrl: data.portfolio_url,
          outreachObjective: data.outreach_objective,
          customInstructions: data.custom_instructions,
          updatedAt: data.updated_at,
        });
      }

      setSuccess('Personal details updated successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to update profile.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Called when a new PDF resume is uploaded
  const handleUploadSuccess = (data: ResumeUploadResponse) => {
    setExtractedProfile(data.extracted_profile);

    // Sync basic form fields if newly extracted
    setForm((prev) => ({
      ...prev,
      phone: prev.phone || data.extracted_profile.phone || '',
      linkedin_url: prev.linkedin_url || data.extracted_profile.linkedin_url || '',
      github_url: prev.github_url || data.extracted_profile.github_url || '',
      portfolio_url: prev.portfolio_url || data.extracted_profile.portfolio_url || '',
    }));

    if (user) {
      updateUser({
        ...user,
        resumeUploaded: true,
        resumeFilename: data.filename,
        phone: user.phone || data.extracted_profile.phone || undefined,
        linkedinUrl: user.linkedinUrl || data.extracted_profile.linkedin_url || undefined,
        githubUrl: user.githubUrl || data.extracted_profile.github_url || undefined,
        portfolioUrl: user.portfolioUrl || data.extracted_profile.portfolio_url || undefined,
      });
    }
  };

  const handleDeleteResumeSuccess = () => {
    setExtractedProfile(null);
    if (user) {
      updateUser({
        ...user,
        resumeUploaded: false,
        resumeFilename: undefined,
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Candidate Profile & Resume
        </h1>
        <p className="text-sm text-text-secondary mt-1">
          Manage your resume, extracted skills, and AI personalization preferences for outreach.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border gap-2">
        <button
          type="button"
          onClick={() => {
            setActiveTab('resume');
            setSuccess('');
            setError('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'resume'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
          }`}
        >
          <FileText className="w-4 h-4" />
          Resume & Extracted Skills
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('personal');
            setSuccess('');
            setError('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'personal'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
          }`}
        >
          <UserIcon className="w-4 h-4" />
          Personal Info & Links
        </button>

        <button
          type="button"
          onClick={() => {
            setActiveTab('ai_goals');
            setSuccess('');
            setError('');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer ${
            activeTab === 'ai_goals'
              ? 'border-primary-600 text-primary-600'
              : 'border-transparent text-text-secondary hover:text-text-primary hover:border-border'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          AI Outreach Goals
        </button>
      </div>

      {/* ================= TAB 1: RESUME & SKILLS ================= */}
      {activeTab === 'resume' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <ResumeUploader
            resumeUploaded={Boolean(user?.resumeUploaded)}
            resumeFilename={user?.resumeFilename}
            extractedProfile={extractedProfile}
            onUploadSuccess={handleUploadSuccess}
            onDeleteSuccess={handleDeleteResumeSuccess}
          />

          {extractedProfile && (
            <StructuredProfileEditor
              initialProfile={extractedProfile}
              onProfileUpdated={(updated) => setExtractedProfile(updated)}
            />
          )}
        </div>
      )}

      {/* ================= TAB 2: PERSONAL INFO & LINKS ================= */}
      {activeTab === 'personal' && (
        <form onSubmit={handlePersonalSubmit} className="space-y-6 animate-in fade-in duration-200">
          {success && (
            <div className="bg-success-light border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-success shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Basic Info */}
          <div className="bg-surface rounded-xl border border-border shadow-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Basic Information
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="full_name"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Full Name <span className="text-error">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    id="full_name"
                    name="full_name"
                    type="text"
                    required
                    value={form.full_name}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Your full name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface-tertiary text-sm text-text-secondary cursor-not-allowed"
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  Email cannot be changed.
                </p>
              </div>

              <div className="sm:col-span-2">
                <label
                  htmlFor="phone"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="+91 98765 43210"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Social Profiles */}
          <div className="bg-surface rounded-xl border border-border shadow-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              Online Profiles
            </h2>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="linkedin_url"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  LinkedIn URL
                </label>
                <div className="relative">
                  <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    id="linkedin_url"
                    name="linkedin_url"
                    type="url"
                    value={form.linkedin_url}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="github_url"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  GitHub URL
                </label>
                <div className="relative">
                  <Code className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    id="github_url"
                    name="github_url"
                    type="url"
                    value={form.github_url}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://github.com/yourusername"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="portfolio_url"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Portfolio / Personal Website
                </label>
                <div className="relative">
                  <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                  <input
                    id="portfolio_url"
                    name="portfolio_url"
                    type="url"
                    value={form.portfolio_url}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="https://yourportfolio.dev"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              Save Personal Info
            </Button>
          </div>
        </form>
      )}

      {/* ================= TAB 3: AI OUTREACH GOALS ================= */}
      {activeTab === 'ai_goals' && (
        <form onSubmit={handlePersonalSubmit} className="space-y-6 animate-in fade-in duration-200">
          {success && (
            <div className="bg-success-light border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <CheckCircle2 className="w-4.5 h-4.5 text-success shrink-0" />
              <p className="text-sm text-emerald-700">{success}</p>
            </div>
          )}

          {error && (
            <div className="bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
              <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-surface rounded-xl border border-border shadow-card p-6">
            <h2 className="text-base font-semibold text-text-primary mb-4">
              AI Outreach Preferences
            </h2>
            <div className="space-y-5">
              <div>
                <label
                  htmlFor="outreach_objective"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Primary Outreach Objective
                </label>
                <div className="relative">
                  <Target className="absolute left-3 top-3 w-4 h-4 text-text-tertiary" />
                  <textarea
                    id="outreach_objective"
                    name="outreach_objective"
                    rows={2}
                    value={form.outreach_objective}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="e.g., Seeking full-time Software Engineer (SDE-1) or Backend Developer roles"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="custom_instructions"
                  className="block text-sm font-medium text-text-primary mb-1.5"
                >
                  Custom Instructions for AI Email Generation
                </label>
                <div className="relative">
                  <MessageSquare className="absolute left-3 top-3 w-4 h-4 text-text-tertiary" />
                  <textarea
                    id="custom_instructions"
                    name="custom_instructions"
                    rows={4}
                    value={form.custom_instructions}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    placeholder="e.g., Emphasize my experience with high-scale Python microservices and React performance tuning. Keep emails concise under 120 words."
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1.5">
                  These instructions are automatically fed into the AI prompt whenever emails are generated for your campaigns.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              loading={saving}
              icon={<Save className="w-4 h-4" />}
            >
              Save AI Goals
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
