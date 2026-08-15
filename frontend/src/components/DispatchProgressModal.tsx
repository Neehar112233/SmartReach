import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  X,
  History,
  Loader2,
  Sparkles,
} from 'lucide-react';
import Button from './ui/Button';
import api from '../services/api';

interface DispatchProgressModalProps {
  isOpen: boolean;
  campaignId: string;
  campaignName: string;
  approvedCount: number;
  onClose: () => void;
  onCompleted: () => void;
}

export default function DispatchProgressModal({
  isOpen,
  campaignId,
  campaignName,
  approvedCount,
  onClose,
  onCompleted,
}: DispatchProgressModalProps) {
  const navigate = useNavigate();
  const [status, setStatus] = useState<'initiating' | 'active' | 'completed' | 'error'>('initiating');
  const [total, setTotal] = useState(approvedCount);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [currentRecipient, setCurrentRecipient] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !campaignId) return;

    let isSubscribed = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    const startDispatch = async () => {
      try {
        setStatus('initiating');
        await api.post(`/api/dispatch/campaign/${campaignId}`);
        if (!isSubscribed) return;
        setStatus('active');

        // Start polling
        pollInterval = setInterval(async () => {
          try {
            const { data } = await api.get(`/api/dispatch/campaign/${campaignId}/status`);
            if (!isSubscribed) return;

            setTotal(data.total || approvedCount);
            setSent(data.sent || 0);
            setFailed(data.failed || 0);
            setCurrentRecipient(data.current_recipient || '');

            if (data.status === 'completed') {
              setStatus('completed');
              if (pollInterval) clearInterval(pollInterval);
              onCompleted();
            }
          } catch {
            // Keep polling
          }
        }, 800);
      } catch (err: unknown) {
        if (!isSubscribed) return;
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setStatus('error');
        setErrorMessage(axiosErr.response?.data?.detail || 'Failed to initiate dispatch.');
      }
    };

    startDispatch();

    return () => {
      isSubscribed = false;
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [isOpen, campaignId]);

  if (!isOpen) return null;

  const processed = sent + failed;
  const pct = total > 0 ? Math.round((processed / total) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-surface rounded-xl border border-border shadow-modal w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center text-primary-600">
              <Send className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">
                Outreach Queue Dispatcher
              </h2>
              <p className="text-xs text-text-tertiary truncate max-w-xs">
                {campaignName}
              </p>
            </div>
          </div>
          {status === 'completed' && (
            <button
              type="button"
              onClick={onClose}
              className="text-text-tertiary hover:text-text-primary p-1 rounded-lg hover:bg-surface-tertiary transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {status === 'initiating' && (
            <div className="text-center py-6 space-y-3">
              <Loader2 className="w-10 h-10 text-primary-600 animate-spin mx-auto" />
              <h3 className="text-sm font-semibold text-text-primary">
                Connecting to Email Dispatcher...
              </h3>
              <p className="text-xs text-text-tertiary">
                Preparing approved emails and applying rate-limiting queue.
              </p>
            </div>
          )}

          {status === 'active' && (
            <div className="space-y-5">
              {/* Animation Graphic */}
              <div className="text-center py-2">
                <div className="w-14 h-14 rounded-2xl bg-primary-50 border border-primary-100 flex items-center justify-center text-primary-600 mx-auto animate-bounce">
                  <Send className="w-7 h-7" />
                </div>
                <h3 className="text-sm font-semibold text-text-primary mt-3">
                  Sending Outreach Batch...
                </h3>
                {currentRecipient && (
                  <p className="text-xs text-primary-600 font-medium mt-1 truncate max-w-sm mx-auto">
                    Delivering to: {currentRecipient}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-text-secondary">
                    Progress ({processed} of {total})
                  </span>
                  <span className="font-bold text-primary-600">{pct}%</span>
                </div>
                <div className="w-full h-3 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-600 rounded-full transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {/* Counter Stats */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <span className="text-xs text-emerald-700 font-medium">Delivered</span>
                  <p className="text-lg font-bold text-emerald-800 mt-0.5">{sent}</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-tertiary border border-border text-center">
                  <span className="text-xs text-text-secondary font-medium">Remaining</span>
                  <p className="text-lg font-bold text-text-primary mt-0.5">{total - processed}</p>
                </div>
              </div>
            </div>
          )}

          {status === 'completed' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Campaign Dispatch Completed!
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Successfully dispatched {sent} personalized cold outreach emails.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-secondary/50 border border-border text-xs text-text-secondary flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-primary-600" />
                <span>Audit logs recorded with timestamps in Delivery History.</span>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="text-center py-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-red-50 border border-red-200 flex items-center justify-center text-red-600 mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Dispatch Failed
                </h3>
                <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-secondary/30 border-t border-border flex items-center justify-end gap-2">
          {status === 'completed' ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<History className="w-3.5 h-3.5" />}
                onClick={() => {
                  onClose();
                  navigate('/history');
                }}
              >
                View History
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onClose}
              >
                Back to Workspace
              </Button>
            </>
          ) : status === 'error' ? (
            <Button
              type="button"
              size="sm"
              onClick={onClose}
            >
              Close
            </Button>
          ) : (
            <p className="text-[11px] text-text-tertiary italic">
              Please keep this window open while sending...
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
