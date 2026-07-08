import { useEffect, useState } from 'react';
import { TicketCheck, Clock, CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import api from '../../api/axios';

const STATUS_COLORS = {
  open: 'bg-bolt-100 dark:bg-bolt-900/30 text-bolt-700 dark:text-bolt-300',
  in_progress: 'bg-amber/15 text-amber-dark dark:text-amber',
  resolved: 'bg-mint/15 text-mint-dark dark:text-mint',
  closed: 'bg-ink-700/10 dark:bg-ink-700/30 text-ink-700/60 dark:text-cream/40',
};

const PRIORITY_COLORS = {
  low: 'text-mint',
  medium: 'text-amber',
  high: 'text-red-500',
  urgent: 'text-red-700 font-bold',
};

const AdminSupport = () => {
  const [stats, setStats] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [statusFilter, setStatusFilter] = useState('open');
  const [activeTicket, setActiveTicket] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/support/admin/stats').then((r) => setStats(r.data.stats));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get(`/support/admin/tickets?status=${statusFilter}`)
      .then((r) => setTickets(r.data.tickets))
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const loadTicket = async (id) => {
    const { data } = await api.get(`/support/tickets/${id}`);
    setActiveTicket(data.ticket);
    setReplyText('');
  };

  const updateTicket = async (id, updates) => {
    await api.put(`/support/admin/tickets/${id}`, updates);
    setTickets((prev) => prev.map((t) => (t._id === id ? { ...t, ...updates } : t)));
    if (activeTicket?._id === id) setActiveTicket((t) => ({ ...t, ...updates }));
  };

  const submitReply = async () => {
    if (!replyText.trim()) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('text', replyText);
      const { data } = await api.post(`/support/admin/tickets/${activeTicket._id}/reply`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setActiveTicket((t) => ({ ...t, messages: data.messages }));
      setReplyText('');
    } catch { /* ignore */ }
    finally { setSubmitting(false); }
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="card p-4 flex items-center gap-3">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${color}`}>
        <Icon size={18} className="text-white" />
      </span>
      <div>
        <p className="text-xl font-display font-bold">{value ?? '—'}</p>
        <p className="text-xs text-ink-700/50 dark:text-cream/40">{label}</p>
      </div>
    </div>
  );

  return (
    <div>
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
          <StatCard icon={TicketCheck} label="Total" value={stats.total} color="bg-bolt-500" />
          <StatCard icon={Clock} label="Open" value={stats.open} color="bg-amber" />
          <StatCard icon={TrendingUp} label="In Progress" value={stats.inProgress} color="bg-bolt-600" />
          <StatCard icon={CheckCircle2} label="Resolved" value={stats.resolved} color="bg-mint" />
          <StatCard icon={XCircle} label="Closed" value={stats.closed} color="bg-ink-700" />
        </div>
      )}

      <div className="flex gap-4">
        {/* Ticket list */}
        <div className={`${activeTicket ? 'hidden lg:block lg:w-96' : 'w-full'}`}>
          <div className="flex gap-2 mb-3 overflow-x-auto">
            {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
              <button key={s} onClick={() => setStatusFilter(s)}
                className={`rounded-full px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  statusFilter === s ? 'bg-bolt-500 text-white' : 'bg-bolt-50 dark:bg-ink-800 text-ink-700/60 dark:text-cream/50'
                }`}>
                {s.replace('_', ' ')}
              </button>
            ))}
          </div>

          {loading ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40 p-4">Loading…</p>
          ) : tickets.length === 0 ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40 p-4">No {statusFilter} tickets.</p>
          ) : (
            <div className="space-y-2">
              {tickets.map((t) => (
                <button key={t._id} onClick={() => loadTicket(t._id)}
                  className={`card p-3 w-full text-left hover:bg-bolt-50 dark:hover:bg-ink-800 transition-colors ${
                    activeTicket?._id === t._id ? 'ring-2 ring-bolt-500' : ''
                  }`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold truncate">{t.subject}</p>
                      <p className="text-xs text-ink-700/50 dark:text-cream/40 mt-0.5">
                        #{t.ticketNumber} · @{t.user?.username}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={`text-xs font-medium rounded-full px-2 py-0.5 ${STATUS_COLORS[t.status]}`}>
                        {t.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</span>
                    </div>
                  </div>
                  {t.hasUnreadUserReply && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-bolt-500 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-bolt-500" /> User replied
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Ticket detail */}
        {activeTicket && (
          <div className="flex-1 min-w-0">
            <div className="card p-4 mb-3">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-display font-semibold">{activeTicket.subject}</h3>
                  <p className="text-xs text-ink-700/50 dark:text-cream/40 mt-0.5">
                    #{activeTicket.ticketNumber} · @{activeTicket.user?.username} · {activeTicket.category?.replace(/_/g, ' ')}
                  </p>
                </div>
                <button onClick={() => setActiveTicket(null)} className="text-ink-700/40 dark:text-cream/30 lg:hidden">✕</button>
              </div>

              {/* Controls */}
              <div className="flex flex-wrap gap-2 mb-3">
                <select
                  value={activeTicket.status}
                  onChange={(e) => updateTicket(activeTicket._id, { status: e.target.value })}
                  className="input-field w-auto text-sm py-1.5"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <select
                  value={activeTicket.priority}
                  onChange={(e) => updateTicket(activeTicket._id, { priority: e.target.value })}
                  className="input-field w-auto text-sm py-1.5"
                >
                  <option value="low">Low priority</option>
                  <option value="medium">Medium priority</option>
                  <option value="high">High priority</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>

              <p className="text-sm text-ink-700/70 dark:text-cream/60 border-t border-bolt-100 dark:border-ink-700 pt-3">
                {activeTicket.description}
              </p>
            </div>

            {/* Messages */}
            <div className="space-y-3 mb-3 max-h-80 overflow-y-auto">
              {activeTicket.messages?.map((msg) => {
                const isSupport = ['admin', 'support'].includes(msg.senderRole);
                return (
                  <div key={msg._id} className={`flex gap-2 ${isSupport ? 'flex-row-reverse' : ''}`}>
                    <img src={msg.sender?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${msg.sender?.username}`}
                      alt="" className="h-7 w-7 rounded-full object-cover shrink-0" />
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                      isSupport ? 'bg-bolt-500 text-white rounded-tr-sm' : 'bg-bolt-50 dark:bg-ink-800 rounded-tl-sm'
                    }`}>
                      {isSupport && <p className="text-xs font-semibold text-bolt-200 mb-0.5">Support</p>}
                      <p>{msg.text}</p>
                    </div>
                  </div>
                );
              })}
              {(!activeTicket.messages || activeTicket.messages.length === 0) && (
                <p className="text-sm text-center text-ink-700/50 dark:text-cream/40 py-4">No messages yet.</p>
              )}
            </div>

            {/* Reply box */}
            {activeTicket.status !== 'closed' && (
              <div className="card p-3 flex gap-2">
                <textarea value={replyText} onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Reply to user as support team…" rows={2}
                  className="input-field flex-1 resize-none text-sm" />
                <button onClick={submitReply} disabled={submitting || !replyText.trim()} className="btn-primary px-4 self-end">
                  {submitting ? '…' : 'Send'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSupport;
