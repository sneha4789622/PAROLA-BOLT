import { useEffect, useState } from 'react';
import api from '../../api/axios';
import VerifiedBadge from '../../components/VerifiedBadge';

const STATUS_COLORS = {
  active: 'bg-mint/15 text-mint-dark',
  suspended: 'bg-amber/15 text-amber-dark',
  banned: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async (query = '') => {
    setLoading(true);
    const { data } = await api.get(`/admin/users?limit=50${query ? `&q=${encodeURIComponent(query)}` : ''}`);
    setUsers(data.users);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const updateStatus = async (userId, status) => {
    await api.put(`/admin/users/${userId}/status`, { status });
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, status } : u)));
  };

  const updateRole = async (userId, role) => {
    await api.put(`/admin/users/${userId}/role`, { role });
    setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role } : u)));
  };

  return (
    <div className="card overflow-hidden">
      <div className="p-4 border-b border-bolt-100 dark:border-ink-700">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load(q)}
          placeholder="Search by username, name, or email…"
          className="input-field max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-bolt-50 dark:bg-ink-800 text-left">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Email</th>
              <th className="p-3">Status</th>
              <th className="p-3">Role</th>
              <th className="p-3">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-bolt-100 dark:divide-ink-700">
            {loading ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-ink-700/50 dark:text-cream/40">
                  Loading…
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <tr key={u._id}>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <img
                        src={u.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div>
                        <p className="font-medium flex items-center gap-1">{u.fullName} {u.isIdentityVerified && <VerifiedBadge size={12} />}</p>
                        <p className="text-xs text-ink-700/50 dark:text-cream/40">@{u.username}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-ink-700/70 dark:text-cream/60">{u.email}</td>
                  <td className="p-3">
                    <select
                      value={u.status}
                      onChange={(e) => updateStatus(u._id, e.target.value)}
                      className={`rounded-lg px-2 py-1 text-xs font-medium border-0 ${STATUS_COLORS[u.status]}`}
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="banned">Banned</option>
                    </select>
                  </td>
                  <td className="p-3">
                    <select
                      value={u.role}
                      onChange={(e) => updateRole(u._id, e.target.value)}
                      className="rounded-lg px-2 py-1 text-xs font-medium bg-bolt-50 dark:bg-ink-800 border-0"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td className="p-3">{u.isIdentityVerified ? <VerifiedBadge /> : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
