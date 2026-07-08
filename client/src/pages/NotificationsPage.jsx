import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, UserPlus, ShieldCheck, Bell, CheckCheck } from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';

const ICONS = {
  like: Heart,
  comment: MessageCircle,
  share: Share2,
  friend_request: UserPlus,
  friend_request_accepted: UserPlus,
  message: MessageCircle,
  verification_update: ShieldCheck,
  content_flagged: Bell,
  system: Bell,
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data } = await api.get('/notifications');
    setNotifications(data.notifications);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const markAllRead = async () => {
    await api.put('/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markRead = async (id) => {
    await api.put(`/notifications/${id}/read`);
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)));
  };

  return (
    <div>
      <Topbar title="Notifications" />
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex justify-end mb-2">
          <button onClick={markAllRead} className="btn-secondary text-xs">
            <CheckCheck size={14} /> Mark all as read
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
        ) : notifications.length === 0 ? (
          <p className="text-sm text-ink-700/50 dark:text-cream/40">You're all caught up.</p>
        ) : (
          <ul className="card divide-y divide-bolt-100 dark:divide-ink-700">
            {notifications.map((n) => {
              const Icon = ICONS[n.type] || Bell;
              return (
                <li
                  key={n._id}
                  onClick={() => !n.isRead && markRead(n._id)}
                  className={`flex items-start gap-3 p-4 cursor-pointer ${!n.isRead ? 'bg-bolt-50/50 dark:bg-ink-800/50' : ''}`}
                >
                  {n.sender?.username ? (
                    <Link to={`/profile/${n.sender.username}`}>
                      <img
                        src={n.sender.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${n.sender.username}`}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                    </Link>
                  ) : (
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-bolt-100 dark:bg-ink-700">
                      <Icon size={16} className="text-bolt-500" />
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm">{n.text}</p>
                    <p className="text-xs text-ink-700/40 dark:text-cream/30 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                  {!n.isRead && <span className="ml-auto h-2 w-2 rounded-full bg-bolt-500 shrink-0 mt-1.5" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default NotificationsPage;
