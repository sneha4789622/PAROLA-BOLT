import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import api from '../../api/axios';
import VerifiedBadge from '../../components/VerifiedBadge';

const AdminVerification = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [rejectionText, setRejectionText] = useState({});

  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/admin/verification-requests?status=${statusFilter}`);
    setRequests(data.requests);
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  // const review = async (id, action, rejectionReason = '') => {
  //   await api.put(`/admin/verification-requests/${id}`, { action, rejectionReason });
  //   setRequests((prev) => prev.filter((r) => r._id !== id));
  // };
  const review = async (id, action, rejectionReason = '') => {
  try {
    await api.put(`/admin/verification-requests/${id}`, { action, rejectionReason });
    setRequests((prev) => prev.filter((r) => r._id !== id));
  } catch (err) {
    console.error('Status:', err.response?.status);
    console.error('Error:', err.response?.data);
    alert(err.response?.data?.message || 'Action failed — check console');
  }
};

  return (
    <div>
      <div className="mb-4">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input-field w-auto">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">No {statusFilter} verification requests.</p>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div key={req._id} className="card p-4">
              <div className="flex items-center gap-3 mb-3">
                <img
                  src={req.user?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${req.user?.username}`}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
                <div>
                  <p className="font-medium flex items-center gap-1">
                    {req.user?.fullName} {req.user?.isIdentityVerified && <VerifiedBadge size={12} />}
                  </p>
                  <p className="text-xs text-ink-700/50 dark:text-cream/40">@{req.user?.username} · {req.documentType}</p>
                </div>
                <span className={`ml-auto text-xs font-medium rounded-full px-2.5 py-1 ${
                  req.status === 'pending' ? 'bg-amber/15 text-amber-dark dark:text-amber' :
                  req.status === 'approved' ? 'bg-mint/15 text-mint-dark' :
                  'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {req.status}
                </span>
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                {req.documentFront?.url && (
                  <a href={req.documentFront.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-bolt-500 underline">
                    <ExternalLink size={12} /> ID Front
                  </a>
                )}
                {req.documentBack?.url && (
                  <a href={req.documentBack.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-bolt-500 underline">
                    <ExternalLink size={12} /> ID Back
                  </a>
                )}
                {req.selfie?.url && (
                  <a href={req.selfie.url} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1 text-xs text-bolt-500 underline">
                    <ExternalLink size={12} /> Selfie
                  </a>
                )}
              </div>

              {req.status === 'pending' && (
                <div className="space-y-2">
                  <input
                    value={rejectionText[req._id] || ''}
                    onChange={(e) => setRejectionText((p) => ({ ...p, [req._id]: e.target.value }))}
                    placeholder="Rejection reason (required if rejecting)"
                    className="input-field text-sm"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => review(req._id, 'approve')} className="btn-secondary text-xs">
                      <CheckCircle size={14} className="text-mint" /> Approve
                    </button>
                    <button
                      onClick={() => review(req._id, 'reject', rejectionText[req._id] || '')}
                      className="btn-secondary text-xs"
                    >
                      <XCircle size={14} className="text-red-500" /> Reject
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

export default AdminVerification;
