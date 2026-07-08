import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import api from '../../api/axios';

const REASON_LABELS = {
  spam: 'Spam',
  hate_speech: 'Hate speech',
  harassment: 'Harassment',
  nudity: 'Nudity',
  violence: 'Violence',
  misinformation: 'Misinformation',
  fake_account: 'Fake account',
  other: 'Other',
};

const AdminReports = () => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionText, setActionText] = useState({});

  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/admin/reports?status=${statusFilter}`);
    setReports(data.reports);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const reviewReport = async (id, action, contentDecision) => {
    await api.put(`/admin/reports/${id}`, {
      action,
      actionTaken: actionText[id] || '',
      contentDecision,
    });
    setReports((prev) => prev.filter((r) => r._id !== id));
  };

  return (
    <div>
      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
          <option value="action_taken">Action taken</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">No {statusFilter} reports.</p>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div key={report._id} className="card p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle size={18} className="text-amber mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {REASON_LABELS[report.reason] || report.reason}
                    <span className="ml-2 text-xs text-ink-700/50 dark:text-cream/40">
                      on {report.targetType} · by @{report.reporter?.username}
                    </span>
                  </p>
                  {report.details && (
                    <p className="text-sm text-ink-700/60 dark:text-cream/50 mt-1">"{report.details}"</p>
                  )}
                  <p className="text-xs text-ink-700/40 dark:text-cream/30 mt-1">
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              {report.status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <input
                    value={actionText[report._id] || ''}
                    onChange={(e) => setActionText((p) => ({ ...p, [report._id]: e.target.value }))}
                    placeholder="Notes on action taken (optional)"
                    className="input-field text-sm"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => reviewReport(report._id, 'action_taken', 'reject')} className="btn-secondary text-xs">
                      <XCircle size={13} className="text-red-500" /> Remove content
                    </button>
                    <button onClick={() => reviewReport(report._id, 'action_taken', 'flag')} className="btn-secondary text-xs">
                      <AlertTriangle size={13} className="text-amber" /> Flag content
                    </button>
                    <button onClick={() => reviewReport(report._id, 'dismiss')} className="btn-secondary text-xs">
                      <CheckCircle size={13} className="text-mint" /> Dismiss
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminReports;
