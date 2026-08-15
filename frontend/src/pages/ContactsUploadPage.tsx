import { useState, useEffect } from 'react';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Plus,
  Trash2,
  UploadCloud,
  Loader2,
  Download,
} from 'lucide-react';
import Button from '../components/ui/Button';
import ContactUploadZone from '../components/ContactUploadZone';
import ContactsTable from '../components/ContactsTable';
import AddContactModal from '../components/AddContactModal';
import type { Contact, ContactUploadResponse } from '../types';
import api from '../services/api';

interface StatsState {
  total_rows: number;
  valid_count: number;
  invalid_count: number;
  duplicates_count: number;
}

export default function ContactsUploadPage() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<StatsState>({
    total_rows: 0,
    valid_count: 0,
    invalid_count: 0,
    duplicates_count: 0,
  });
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadZone, setShowUploadZone] = useState(true);

  // Fetch contacts and stats on mount
  const loadContacts = async () => {
    try {
      const { data } = await api.get('/api/contacts', {
        params: { limit: 200 },
      });
      // Map API response to Contact frontend type
      const mapped: Contact[] = data.contacts.map((c: any) => ({
        id: c.id,
        campaignId: c.campaign_id || '',
        sno: c.sno,
        name: c.name,
        email: c.email,
        title: c.title || 'HR / Recruiter',
        company: c.company,
        isValid: c.is_valid,
        validationErrors: c.validation_errors || [],
        emailStatus: c.email_status || 'draft',
      }));
      setContacts(mapped);
      if (data.stats) {
        setStats(data.stats);
      }
    } catch {
      // Failed to load
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const handleUploadSuccess = (_res: ContactUploadResponse) => {
    loadContacts();
  };

  const handleContactCreated = (_newContact: Contact) => {
    loadContacts();
  };

  const handleContactUpdated = (updated: Contact) => {
    setContacts((prev) =>
      prev.map((c) => (c.id === updated.id ? updated : c))
    );
    loadContacts();
  };

  const handleContactDeleted = (id: string) => {
    setContacts((prev) => prev.filter((c) => c.id !== id));
    loadContacts();
  };

  const handleBulkDeleted = (ids: string[]) => {
    setContacts((prev) => prev.filter((c) => !ids.includes(c.id)));
    loadContacts();
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to delete ALL contacts?')) return;
    try {
      await api.delete('/api/contacts');
      setContacts([]);
      setStats({ total_rows: 0, valid_count: 0, invalid_count: 0, duplicates_count: 0 });
    } catch {
      alert('Failed to clear contacts.');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/api/contacts/export', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'smartreach_contacts_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      alert('Failed to export contacts CSV.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-7 h-7 text-primary-600 animate-spin" />
      </div>
    );
  }

  const validPct =
    stats.total_rows > 0
      ? Math.round((stats.valid_count / stats.total_rows) * 100)
      : 100;

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">
            Recruiter & HR Contacts
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Upload CSV/Excel spreadsheets or manage target HR contacts for your outreach campaigns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {contacts.length > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={handleExportCSV}
            >
              Export CSV
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            icon={<UploadCloud className="w-3.5 h-3.5" />}
            onClick={() => setShowUploadZone((prev) => !prev)}
          >
            {showUploadZone ? 'Hide Uploader' : 'Upload Spreadsheet'}
          </Button>

          <Button
            type="button"
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setShowAddModal(true)}
          >
            Add Contact
          </Button>

          {contacts.length > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-error hover:bg-error-light hover:text-red-700"
              icon={<Trash2 className="w-3.5 h-3.5" />}
              onClick={handleClearAll}
            >
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contacts */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Total Contacts
            </span>
            <div className="w-7 h-7 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-text-primary mt-2">
            {stats.total_rows}
          </p>
          <span className="text-xs text-text-tertiary">All uploaded records</span>
        </div>

        {/* Valid Contacts */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Ready for Outreach
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-emerald-600 mt-2">
            {stats.valid_count}
          </p>
          <span className="text-xs text-emerald-700 font-medium">
            {validPct}% valid syntax
          </span>
        </div>

        {/* Invalid / Flagged */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Needs Correction
            </span>
            <div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-red-600 mt-2">
            {stats.invalid_count}
          </p>
          <span className="text-xs text-red-600">Fix inline in table</span>
        </div>

        {/* Duplicates */}
        <div className="bg-surface rounded-xl border border-border p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-text-secondary">
              Duplicates Flagged
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600">
              <Copy className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-600 mt-2">
            {stats.duplicates_count}
          </p>
          <span className="text-xs text-text-tertiary">Skipped duplicates</span>
        </div>
      </div>

      {/* Upload Zone Card */}
      {showUploadZone && (
        <div className="animate-in fade-in duration-200">
          <ContactUploadZone onUploadSuccess={handleUploadSuccess} />
        </div>
      )}

      {/* Contacts Table */}
      <ContactsTable
        contacts={contacts}
        onContactUpdated={handleContactUpdated}
        onContactDeleted={handleContactDeleted}
        onBulkDeleted={handleBulkDeleted}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onContactCreated={handleContactCreated}
      />
    </div>
  );
}
