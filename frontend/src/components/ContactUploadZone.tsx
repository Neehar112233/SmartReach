import React, { useState, useRef } from 'react';
import {
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Button from './ui/Button';
import type { ContactUploadResponse } from '../types';
import api from '../services/api';

interface ContactUploadZoneProps {
  onUploadSuccess: (res: ContactUploadResponse) => void;
}

export default function ContactUploadZone({
  onUploadSuccess,
}: ContactUploadZoneProps) {
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
    const nameLower = file.name.toLowerCase();

    if (!nameLower.endsWith('.csv') && !nameLower.endsWith('.xlsx') && !nameLower.endsWith('.xls')) {
      setError('Please upload a valid .csv or .xlsx spreadsheet.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploading(true);
    try {
      const { data } = await api.post<ContactUploadResponse>(
        '/api/contacts/upload',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      setSuccessMsg(data.message);
      onUploadSuccess(data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      setError(
        axiosErr.response?.data?.detail || 'Failed to process spreadsheet.'
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const downloadSampleTemplate = async () => {
    try {
      const response = await api.get('/api/contacts/sample-template', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartreach_sample_contacts.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setError('Failed to download sample template.');
    }
  };

  return (
    <div className="space-y-3">
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

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200
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
          accept=".csv, .xlsx, .xls"
          onChange={handleChange}
          className="hidden"
          disabled={uploading}
        />

        {uploading ? (
          <div className="py-6 flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary-50 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-primary-600 animate-spin" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-text-primary">
                Processing & Validating Contacts...
              </p>
              <p className="text-xs text-text-secondary">
                Checking emails, normalizing headers, and identifying duplicate records
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-xl bg-primary-50 flex items-center justify-center text-primary-600">
              <FileSpreadsheet className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-semibold text-text-primary">
                Drag and drop your HR contacts (.csv or .xlsx), or{' '}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-primary-600 hover:text-primary-700 underline font-medium cursor-pointer"
                >
                  browse file
                </button>
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Auto-detects columns for Name, Email, Company, Title, Location, and LinkedIn.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-tertiary text-xs text-text-secondary border border-border">
                <Sparkles className="w-3.5 h-3.5 text-primary-500" />
                Automatic Duplicate & Syntax Filtering
              </span>

              <Button
                type="button"
                variant="ghost"
                size="sm"
                icon={<Download className="w-3.5 h-3.5" />}
                onClick={downloadSampleTemplate}
              >
                Download Sample CSV
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
