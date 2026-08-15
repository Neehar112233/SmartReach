import React, { useState } from 'react';
import {
  Code,
  Briefcase,
  GraduationCap,
  FolderGit2,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import Button from './ui/Button';
import SkillsBadgeInput from './SkillsBadgeInput';
import type {
  ExtractedProfile,
  ProjectItem,
  ExperienceItem,
  EducationItem,
} from '../types';
import api from '../services/api';

interface StructuredProfileEditorProps {
  initialProfile: ExtractedProfile;
  onProfileUpdated: (updated: ExtractedProfile) => void;
}

export default function StructuredProfileEditor({
  initialProfile,
  onProfileUpdated,
}: StructuredProfileEditorProps) {
  const [profile, setProfile] = useState<ExtractedProfile>(initialProfile);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSaving(true);

    try {
      const { data } = await api.put<ExtractedProfile>('/api/resume', {
        extracted_profile: profile,
      });
      setProfile(data);
      onProfileUpdated(data);
      setSuccessMsg('Resume profile changes saved successfully.');
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to save changes.'
      );
    } finally {
      setSaving(false);
    }
  };

  // --- Projects Handlers ---
  const addProject = () => {
    setProfile((prev) => ({
      ...prev,
      projects: [
        ...prev.projects,
        { title: '', tech_stack: '', description: '', url: '' },
      ],
    }));
  };

  const updateProject = (index: number, field: keyof ProjectItem, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.projects];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, projects: updated };
    });
  };

  const removeProject = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      projects: prev.projects.filter((_, i) => i !== index),
    }));
  };

  // --- Experience Handlers ---
  const addExperience = () => {
    setProfile((prev) => ({
      ...prev,
      experience: [
        ...prev.experience,
        { title: '', company: '', duration: '', description: '' },
      ],
    }));
  };

  const updateExperience = (index: number, field: keyof ExperienceItem, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.experience];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, experience: updated };
    });
  };

  const removeExperience = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      experience: prev.experience.filter((_, i) => i !== index),
    }));
  };

  // --- Education Handlers ---
  const addEducation = () => {
    setProfile((prev) => ({
      ...prev,
      education: [
        ...prev.education,
        { degree: '', institution: '', year: '', grade: '' },
      ],
    }));
  };

  const updateEducation = (index: number, field: keyof EducationItem, value: string) => {
    setProfile((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  };

  const removeEducation = (index: number) => {
    setProfile((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  };

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Notifications */}
      {successMsg && (
        <div className="bg-success-light border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
          <CheckCircle2 className="w-4.5 h-4.5 text-success shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2.5">
          <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* 1. Skills Section */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <Code className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Extracted Skills & Competencies
            </h2>
            <p className="text-xs text-text-secondary">
              AI highlights these skills when matching your profile with job roles.
            </p>
          </div>
        </div>

        <SkillsBadgeInput
          skills={profile.skills || []}
          onChange={(newSkills) =>
            setProfile((prev) => ({ ...prev, skills: newSkills }))
          }
        />
      </div>

      {/* 2. Professional Summary */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
            <FileText className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-text-primary">
              Professional Summary
            </h2>
            <p className="text-xs text-text-secondary">
              Concise summary extracted from your resume.
            </p>
          </div>
        </div>

        <textarea
          rows={3}
          value={profile.summary || ''}
          onChange={(e) =>
            setProfile((prev) => ({ ...prev, summary: e.target.value }))
          }
          className="w-full px-4 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="e.g., Software Engineer with 2+ years experience in React and Python..."
        />
      </div>

      {/* 3. Projects Section */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <FolderGit2 className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Featured Projects ({profile.projects?.length || 0})
              </h2>
              <p className="text-xs text-text-secondary">
                Key academic and personal projects mentioned in emails.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={addProject}
          >
            Add Project
          </Button>
        </div>

        <div className="space-y-4">
          {(!profile.projects || profile.projects.length === 0) && (
            <p className="text-xs text-text-tertiary italic py-2">
              No projects added yet. Click &quot;Add Project&quot; above.
            </p>
          )}

          {profile.projects?.map((proj, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-border bg-surface-secondary/40 space-y-3 relative group"
            >
              <button
                type="button"
                onClick={() => removeProject(idx)}
                className="absolute top-3 right-3 text-text-tertiary hover:text-error transition-colors p-1"
                aria-label="Remove project"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Project Title
                  </label>
                  <input
                    type="text"
                    value={proj.title}
                    onChange={(e) => updateProject(idx, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., SmartReach AI"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Tech Stack
                  </label>
                  <input
                    type="text"
                    value={proj.tech_stack || ''}
                    onChange={(e) => updateProject(idx, 'tech_stack', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., React, FastAPI, MongoDB"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Description / Achievements
                </label>
                <textarea
                  rows={2}
                  value={proj.description || ''}
                  onChange={(e) => updateProject(idx, 'description', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Key features built and quantified outcomes..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Work Experience */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Briefcase className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Work / Internship Experience ({profile.experience?.length || 0})
              </h2>
              <p className="text-xs text-text-secondary">
                Roles used to establish industry credibility in outreach.
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={addExperience}
          >
            Add Experience
          </Button>
        </div>

        <div className="space-y-4">
          {(!profile.experience || profile.experience.length === 0) && (
            <p className="text-xs text-text-tertiary italic py-2">
              No work experience added yet.
            </p>
          )}

          {profile.experience?.map((exp, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-border bg-surface-secondary/40 space-y-3 relative group"
            >
              <button
                type="button"
                onClick={() => removeExperience(idx)}
                className="absolute top-3 right-3 text-text-tertiary hover:text-error transition-colors p-1"
                aria-label="Remove experience"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={exp.title}
                    onChange={(e) => updateExperience(idx, 'title', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Software Engineering Intern"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={exp.company}
                    onChange={(e) => updateExperience(idx, 'company', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., TechCorp Solutions"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-secondary mb-1">
                  Responsibilities & Impact
                </label>
                <textarea
                  rows={2}
                  value={exp.description || ''}
                  onChange={(e) => updateExperience(idx, 'description', e.target.value)}
                  className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                  placeholder="Key contributions and technologies..."
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. Education */}
      <div className="bg-surface rounded-xl border border-border shadow-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <GraduationCap className="w-4.5 h-4.5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Education ({profile.education?.length || 0})
              </h2>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={addEducation}
          >
            Add Education
          </Button>
        </div>

        <div className="space-y-4">
          {(!profile.education || profile.education.length === 0) && (
            <p className="text-xs text-text-tertiary italic py-2">
              No education entries added yet.
            </p>
          )}

          {profile.education?.map((edu, idx) => (
            <div
              key={idx}
              className="p-4 rounded-lg border border-border bg-surface-secondary/40 space-y-3 relative group"
            >
              <button
                type="button"
                onClick={() => removeEducation(idx)}
                className="absolute top-3 right-3 text-text-tertiary hover:text-error transition-colors p-1"
                aria-label="Remove education"
              >
                <Trash2 className="w-4 h-4" />
              </button>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Degree & Major
                  </label>
                  <input
                    type="text"
                    value={edu.degree}
                    onChange={(e) => updateEducation(idx, 'degree', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., B.Tech in Computer Science"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1">
                    Institution / University
                  </label>
                  <input
                    type="text"
                    value={edu.institution}
                    onChange={(e) => updateEducation(idx, 'institution', e.target.value)}
                    className="w-full px-3 py-1.5 rounded-md border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="e.g., Vellore Institute of Technology"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <Button
          type="submit"
          loading={saving}
          icon={<Save className="w-4 h-4" />}
          size="md"
        >
          Save Extracted Profile
        </Button>
      </div>
    </form>
  );
}
