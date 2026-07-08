import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Flag } from 'lucide-react';
import api from '../../api/axios';

const AdminContent = () => {
  const [type, setType] = useState('post');
  const [status, setStatus] = useState('pending');
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await api.get(`/admin/content?type=${type}&status=${status}`);
    setContent(data.content);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [type, status]);

  const decide = async (id, decision) => {
    await api.put(`/admin/content/${type}/${id}`, { decision });
    setContent((prev) => prev.filter((c) => c._id !== id));
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-4">
        <select value={type} onChange={(e) => setType(e.target.value)} className="input-field w-auto">
          <option value="post">Posts</option>
          <option value="reel">Reels</option>
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="input-field w-auto">
          <option value="pending">Pending</option>
          <option value="flagged">Flagged</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
      ) : content.length === 0 ? (
        <p className="text-sm text-ink-700/50 dark:text-cream/40">No content in this queue.</p>
      ) : (
        <div className="space-y-3">
          {content.map((item) => {
            const author = item.author || item.creator;
            return (
              <div key={item._id} className="card p-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div className="flex-1">
                  <p className="text-sm font-medium">{author?.fullName} (@{author?.username})</p>
                  <p className="text-sm text-ink-700/70 dark:text-cream/60 mt-1">{item.caption || '(no caption)'}</p>
                  {item.moderation?.reasons?.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {item.moderation.reasons.map((r) => (
                        <span key={r} className="flex items-center gap-1 rounded-full bg-amber/15 text-amber-dark dark:text-amber text-xs px-2 py-0.5">
                          <Flag size={10} /> {r.replace(/_/g, ' ')}
                        </span>
                      ))}
                    </div>
                  )}
                  {item.media?.[0] && (
                    <img src={item.media[0].url} alt="" className="mt-2 h-24 w-24 object-cover rounded-lg" />
                  )}
                  {item.video?.url && <video src={item.video.url} className="mt-2 h-24 w-24 object-cover rounded-lg" muted />}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => decide(item._id, 'approve')} className="btn-secondary text-xs">
                    <CheckCircle size={14} className="text-mint" /> Approve
                  </button>
                  <button onClick={() => decide(item._id, 'flag')} className="btn-secondary text-xs">
                    <Flag size={14} className="text-amber" /> Flag
                  </button>
                  <button onClick={() => decide(item._id, 'reject')} className="btn-secondary text-xs">
                    <XCircle size={14} className="text-red-500" /> Reject
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminContent;
