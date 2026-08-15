import React, { useState } from 'react';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  Edit2,
  Check,
  X,
  Building2,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import Button from './ui/Button';
import type { Contact } from '../types';
import api from '../services/api';

interface ContactsTableProps {
  contacts: Contact[];
  onContactUpdated: (updated: Contact) => void;
  onContactDeleted: (id: string) => void;
  onBulkDeleted: (ids: string[]) => void;
}

export default function ContactsTable({
  contacts,
  onContactUpdated,
  onContactDeleted,
  onBulkDeleted,
}: ContactsTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'valid' | 'invalid'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Contact>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(100);

  // Reset page when filter or search changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, pageSize]);

  // Filter contacts by search query and validity status
  const filteredContacts = contacts.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.title.toLowerCase().includes(searchTerm.toLowerCase());

    const isContactValid = c.is_valid ?? c.isValid ?? true;
    if (!matchesSearch) return false;
    if (statusFilter === 'valid') return isContactValid;
    if (statusFilter === 'invalid') return !isContactValid;
    return true;
  });

  const totalPages = pageSize > 0 ? Math.max(1, Math.ceil(filteredContacts.length / pageSize)) : 1;
  const startIndex = pageSize > 0 ? (currentPage - 1) * pageSize : 0;
  const endIndex = pageSize > 0 ? Math.min(startIndex + pageSize, filteredContacts.length) : filteredContacts.length;
  const paginatedContacts = pageSize > 0 ? filteredContacts.slice(startIndex, endIndex) : filteredContacts;

  const validCount = contacts.filter((c) => c.is_valid ?? c.isValid ?? true).length;
  const invalidCount = contacts.length - validCount;

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredContacts.map((c) => c.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Inline editing handlers
  const startEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setEditForm({
      name: contact.name,
      email: contact.email,
      company: contact.company,
      title: contact.title,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (id: string) => {
    setSavingEdit(true);
    try {
      const { data } = await api.put<Contact>(`/api/contacts/${id}`, editForm);
      onContactUpdated(data);
      setEditingId(null);
      setEditForm({});
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { detail?: string } } };
      alert(axiosErr.response?.data?.detail || 'Failed to update contact.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this contact?')) return;
    try {
      await api.delete(`/api/contacts/${id}`);
      onContactDeleted(id);
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    } catch {
      alert('Failed to delete contact.');
    }
  };

  const handleBulkDelete = async () => {
    if (
      !window.confirm(
        `Are you sure you want to delete ${selectedIds.length} selected contacts?`
      )
    )
      return;
    try {
      for (const id of selectedIds) {
        await api.delete(`/api/contacts/${id}`);
      }
      onBulkDeleted(selectedIds);
      setSelectedIds([]);
    } catch {
      alert('Failed to delete some contacts.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Controls: Search, Tabs, Bulk Action */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search name, email, company..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Status Filters */}
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
            All ({contacts.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('valid')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'valid'
                ? 'bg-surface text-emerald-700 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
            Valid ({validCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('invalid')}
            className={`px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              statusFilter === 'invalid'
                ? 'bg-surface text-red-700 shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-error" />
            Issues ({invalidCount})
          </button>
        </div>

        {/* Bulk Delete */}
        {selectedIds.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-error hover:bg-error-light hover:text-red-700 border border-error/20"
            icon={<Trash2 className="w-3.5 h-3.5" />}
            onClick={handleBulkDelete}
          >
            Delete ({selectedIds.length})
          </Button>
        )}
      </div>

      {/* Table Card */}
      <div className="bg-surface rounded-xl border border-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-secondary/70 border-b border-border text-xs text-text-secondary font-medium uppercase tracking-wider">
              <tr>
                <th className="p-3 w-10 text-center">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={
                      filteredContacts.length > 0 &&
                      selectedIds.length === filteredContacts.length
                    }
                    className="rounded border-border text-primary-600 focus:ring-primary-500 cursor-pointer"
                  />
                </th>
                <th className="px-3 py-3 w-12 text-center">#</th>
                <th className="px-4 py-3">Contact Name</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Company & Role</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredContacts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-text-tertiary">
                    No contacts found. Upload a spreadsheet or add contacts manually.
                  </td>
                </tr>
              ) : (
                paginatedContacts.map((contact, idx) => {
                  const isEditing = editingId === contact.id;
                  const isSelected = selectedIds.includes(contact.id);

                  return (
                    <tr
                      key={contact.id}
                      className={`hover:bg-surface-secondary/30 transition-colors ${
                        isSelected ? 'bg-primary-50/30' : ''
                      }`}
                    >
                      {/* Select Checkbox */}
                      <td className="p-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectOne(contact.id)}
                          className="rounded border-border text-primary-600 focus:ring-primary-500 cursor-pointer"
                        />
                      </td>

                      {/* S.No */}
                      <td className="px-3 py-3 text-xs text-text-tertiary text-center font-mono">
                        {contact.sno || startIndex + idx + 1}
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <input
                            type="text"
                            value={editForm.name || ''}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                name: e.target.value,
                              }))
                            }
                            className="px-2 py-1 rounded border border-border text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                            <span className="font-medium text-text-primary">
                              {contact.name}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 font-mono text-xs">
                        {isEditing ? (
                          <input
                            type="email"
                            value={editForm.email || ''}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                email: e.target.value,
                              }))
                            }
                            className="px-2 py-1 rounded border border-border text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                          />
                        ) : (
                          <div className="flex items-center gap-1.5 text-text-secondary">
                            <Mail className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                            <span>{contact.email}</span>
                          </div>
                        )}
                      </td>

                      {/* Company & Role */}
                      <td className="px-4 py-3">
                        {isEditing ? (
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={editForm.company || ''}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  company: e.target.value,
                                }))
                              }
                              placeholder="Company"
                              className="px-2 py-1 rounded border border-border text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <input
                              type="text"
                              value={editForm.title || ''}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  title: e.target.value,
                                }))
                              }
                              placeholder="Role"
                              className="px-2 py-1 rounded border border-border text-xs w-full focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                          </div>
                        ) : (
                          <div>
                            <div className="flex items-center gap-1.5 text-text-primary font-medium">
                              <Building2 className="w-3.5 h-3.5 text-text-tertiary shrink-0" />
                              <span>{contact.company}</span>
                            </div>
                            <p className="text-xs text-text-tertiary pl-5">
                              {contact.title}
                            </p>
                          </div>
                        )}
                      </td>

                      {/* Status / Errors */}
                      <td className="px-4 py-3">
                        {(contact.is_valid ?? contact.isValid ?? true) ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Valid
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700 border border-red-200/60">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              Needs Fix
                            </span>
                            {(contact.validation_errors || contact.validationErrors || []).map((err, i) => (
                              <p key={i} className="text-[11px] text-red-600 font-medium leading-tight">
                                • {err}
                              </p>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => saveEdit(contact.id)}
                              disabled={savingEdit}
                              className="p-1 rounded text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
                              title="Save changes"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={cancelEdit}
                              className="p-1 rounded text-text-tertiary hover:bg-surface-tertiary transition-colors cursor-pointer"
                              title="Cancel edit"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => startEdit(contact)}
                              className="p-1.5 rounded text-text-tertiary hover:text-primary-600 hover:bg-primary-50 transition-colors cursor-pointer"
                              title="Edit contact info"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(contact.id)}
                              className="p-1.5 rounded text-text-tertiary hover:text-error hover:bg-error-light transition-colors cursor-pointer"
                              title="Delete contact"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Rows Selector Footer */}
        {filteredContacts.length > 0 && (
          <div className="px-4 py-3 bg-surface-secondary/40 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-text-secondary">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong className="text-text-primary">{startIndex + 1}</strong> to{' '}
                <strong className="text-text-primary">{endIndex}</strong> of{' '}
                <strong className="text-text-primary">{filteredContacts.length}</strong> contacts
              </span>

              <span className="text-border">|</span>

              <label className="flex items-center gap-1.5">
                <span>Show:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-surface border border-border rounded px-2 py-1 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer"
                >
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                  <option value={250}>250 per page</option>
                  <option value={500}>500 per page</option>
                  <option value={1000}>1,000 per page</option>
                  <option value={3000}>All (up to 3,000)</option>
                </select>
              </label>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-medium text-text-primary">
                  Page {currentPage} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-secondary disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
