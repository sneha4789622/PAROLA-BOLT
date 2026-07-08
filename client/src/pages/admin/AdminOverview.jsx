import { useEffect, useState } from 'react';
import { Users, FileText, Clapperboard, Flag, ShieldQuestion, Activity, Ban } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../../api/axios';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="card p-4 flex items-center gap-3">
    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
      <Icon size={20} className="text-white" />
    </span>
    <div>
      <p className="text-2xl font-display font-bold">{value ?? '—'}</p>
      <p className="text-xs text-ink-700/50 dark:text-cream/40">{label}</p>
    </div>
  </div>
);

const AdminOverview = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then((res) => setStats(res.data.stats));
    api.get('/admin/analytics').then((res) => setAnalytics(res.data.analytics));
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total users" value={stats?.totalUsers} color="bg-bolt-500" />
        <StatCard icon={FileText} label="Total posts" value={stats?.totalPosts} color="bg-mint" />
        <StatCard icon={Clapperboard} label="Total reels" value={stats?.totalReels} color="bg-amber" />
        <StatCard icon={Flag} label="Reported content" value={stats?.reportedContent} color="bg-red-500" />
        <StatCard icon={ShieldQuestion} label="Pending verifications" value={stats?.pendingVerifications} color="bg-bolt-700" />
        <StatCard icon={Activity} label="Active users" value={stats?.activeUsers} color="bg-mint-dark" />
        <StatCard icon={Ban} label="Banned users" value={stats?.bannedUsers} color="bg-ink-700" />
        <StatCard icon={Flag} label="Flagged posts" value={stats?.flaggedPosts} color="bg-amber-dark" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-display font-semibold mb-3">New users (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics?.newUsersPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#6D5DFC" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-4">
          <h3 className="font-display font-semibold mb-3">New posts &amp; reels (last 14 days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={analytics?.newPostsPerDay || []}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#2EC4B6" strokeWidth={2} dot={false} name="Posts" data={analytics?.newPostsPerDay} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminOverview;
