import React, { useState, useRef } from 'react';
import {
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Button from './ui/Button';
import type { ExtractedProfile, ResumeUploadResponse } from '../types';
import api from '../services/api';

interface ResumeUploaderProps {
  resumeUploaded: boolean;
  resumeFilename?: string;
  extractedProfile: ExtractedProfile | null;
  onUploadSuccess: (data: ResumeUploadResponse) => void;
  onDeleteSuccess: () => void;
}

export default function ResumeUploader({
  resumeUploaded,
  resumeFilename,
  extractedProfile,
  onUploadSuccess,
  onDeleteSuccess,
}: ResumeUploaderProps) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
    setError('');
    setSuccessMsg('');

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Please upload a PDF document (.pdf).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('File size exceeds the 10MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await api.post<ResumeUploadResponse>(
        '/api/resume/upload',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      setSuccessMsg(data.message || 'Resume uploaded and analyzed successfully!');
      onUploadSuccess(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to upload and parse resume. Please try again.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to remove your uploaded resume?')) {
      return;
    }
    setError('');
    setSuccessMsg('');
    try {
      await api.delete('/api/resume');
      setSuccessMsg('Resume removed successfully.');
      onDeleteSuccess();
    } catch {
      setError('Failed to delete resume.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Status Messages */}
      {successMsg && (
        <div className="bg-success-light border border-emerald-200 rounded-lg px-4 py-3 flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4.5 h-4.5 text-success shrink-0" />
          <p className="text-sm text-emerald-700 font-medium">{successMsg}</p>
        </div>
      )}

      {error && (
        <div className="bg-error-light border border-red-200 rounded-lg px-4 py-3 flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle className="w-4.5 h-4.5 text-error shrink-0" />
          <p className="text-sm text-red-700 font-medium">{error}</p>
        </div>
      )}

      {/* Upload Box */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200
          ${
            dragActive
              ? 'border-primary-500 bg-primary-50/50 scale-[1.005]'
              : 'border-border hover:border-primary-300 bg-surface'
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleChange}
          className="hidden"
          id="resume-file-input"
          disabled={uploading}
        />

        {uploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">
                Analyzing & Parsing Resume with AI...
              </p>
              <p className="text-xs text-text-secondary">
                Extracting skills, projects, and education via PyMuPDF & Gemini
              </p>
            </div>
          </div>
        ) : resumeUploaded ? (
          <div className="py-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 text-left">
              <div className="w-12 h-12 rounded-xl bg-primary-100/70 flex items-center justify-center text-primary-600 shrink-0">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-text-primary">
                    {resumeFilename || 'Uploaded Resume.pdf'}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    Parsed
                  </span>
                </div>
                <p className="text-xs text-text-tertiary mt-0.5">
                  {extractedProfile?.skills?.length || 0} skills •{' '}
                  {extractedProfile?.projects?.length || 0} projects •{' '}
                  {extractedProfile?.experience?.length || 0} work entries extracted
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<RefreshCw className="w-3.5 h-3.5" />}
                onClick={() => fileInputRef.current?.click()}
              >
                Re-upload
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-error hover:bg-error-light hover:text-red-700"
                icon={<Trash2 className="w-3.5 h-3.5" />}
                onClick={handleDelete}
              >
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-text-primary">
                Drag and drop your resume PDF here, or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-700 underline font-medium cursor-pointer"
                >
                  browse file
                </button>
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Supports PDF up to 10MB. Fast, automated ATS parsing.
              </p>
            </div>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-tertiary text-xs text-text-secondary border border-border">
              <Sparkles className="w-3.5 h-3.5 text-primary-500" />
              Auto-extracts skills, projects, and contact info
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
