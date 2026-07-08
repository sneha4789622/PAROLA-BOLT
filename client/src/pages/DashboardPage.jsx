import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, ShieldQuestion, UserPlus, Flame, MessageCircle } from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const verificationConfig = {
  verified: { icon: ShieldCheck, color: 'text-mint', label: 'Verified account' },
  pending: { icon: ShieldQuestion, color: 'text-amber', label: 'Verification pending review' },
  unverified: { icon: ShieldAlert, color: 'text-ink-700/40 dark:text-cream/30', label: 'Not yet verified' },
  rejected: { icon: ShieldAlert, color: 'text-red-500', label: 'Verification rejected' },
};

const DashboardPage = () => {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/users/dashboard')
      .then((res) => setData(res.data.dashboard))
      .finally(() => setLoading(false));
  }, []);

  const vConfig = verificationConfig[data?.verificationStatus || 'unverified'];

  return (
    <div>
      <Topbar title={`Welcome back, ${user?.fullName?.split(' ')[0] || ''}`} />

      <div className="p-4 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile completion + verification */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5 lg:col-span-1">
          <h3 className="font-display font-semibold mb-3">Profile completion</h3>
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 36 36" className="h-20 w-20 -rotate-90">
                <circle cx="18" cy="18" r="16" fill="none" stroke="currentColor" strokeWidth="3" className="text-bolt-100 dark:text-ink-700" />
                <circle
                  cx="18"
                  cy="18"
                  r="16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(data?.profileCompletion || 0)} 100`}
                  strokeLinecap="round"
                  className="text-bolt-500"
                  pathLength="100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center font-display font-bold text-lg">
                {loading ? '…' : `${data?.profileCompletion || 0}%`}
              </div>
            </div>
            <div className="text-sm text-ink-700/70 dark:text-cream/60">
              Complete your profile photo, cover photo, bio, and verification to unlock the verified badge and
              build trust with other members.
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-bolt-50 dark:bg-ink-800 px-3 py-2.5">
            {vConfig && <vConfig.icon size={18} className={vConfig.color} />}
            <span className="text-sm font-medium">{vConfig?.label}</span>
            {user?.isIdentityVerified && <VerifiedBadge className="ml-auto" />}
          </div>

          {!user?.isIdentityVerified && data?.verificationStatus !== 'pending' && (
            <Link to={`/profile/${user?.username}?verify=1`} className="btn-amber w-full mt-3 text-sm">
              Get verified
            </Link>
          )}
        </motion.div>

        {/* Friend requests */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <UserPlus size={18} className="text-bolt-500" /> Friend requests
          </h3>
          {loading ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
          ) : data?.friendRequests?.length ? (
            <ul className="space-y-3">
              {data.friendRequests.map((fr) => (
                <li key={fr._id} className="flex items-center gap-3">
                  <img
                    src={fr.sender?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${fr.sender?.username}`}
                    className="h-9 w-9 rounded-full object-cover"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate flex items-center gap-1">
                      {fr.sender?.fullName} {fr.sender?.isIdentityVerified && <VerifiedBadge size={12} />}
                    </p>
                    <p className="text-xs text-ink-700/50 dark:text-cream/40">@{fr.sender?.username}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">No pending friend requests.</p>
          )}
        </motion.div>

        {/* Suggested friends */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-5">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <Flame size={18} className="text-amber" /> Suggested for you
          </h3>
          {loading ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
          ) : data?.suggestedFriends?.length ? (
            <ul className="space-y-3">
              {data.suggestedFriends.map((sf) => (
                <li key={sf._id}>
                  <Link to={`/profile/${sf.username}`} className="flex items-center gap-3 hover:opacity-80">
                    <img
                      src={sf.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${sf.username}`}
                      className="h-9 w-9 rounded-full object-cover"
                      alt=""
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate flex items-center gap-1">
                        {sf.fullName} {sf.isIdentityVerified && <VerifiedBadge size={12} />}
                      </p>
                      <p className="text-xs text-ink-700/50 dark:text-cream/40">@{sf.username}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">No suggestions right now.</p>
          )}
        </motion.div>

        {/* Recent posts */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-5 lg:col-span-2">
          <h3 className="font-display font-semibold mb-3 flex items-center gap-2">
            <MessageCircle size={18} className="text-bolt-500" /> Latest from people you follow
          </h3>
          {loading ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
          ) : data?.recentPosts?.length ? (
            <ul className="space-y-4">
              {data.recentPosts.map((post) => (
                <li key={post._id} className="flex gap-3 border-b border-bolt-100 dark:border-ink-700 pb-3 last:border-0 last:pb-0">
                  <img
                    src={post.author?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.username}`}
                    className="h-9 w-9 rounded-full object-cover shrink-0"
                    alt=""
                  />
                  <div className="min-w-0">
                    <p className="text-sm font-medium flex items-center gap-1">
                      {post.author?.fullName} {post.author?.isIdentityVerified && <VerifiedBadge size={12} />}
                    </p>
                    <p className="text-sm text-ink-700/70 dark:text-cream/60 line-clamp-2">{post.caption}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">
              Follow people to see their posts here. Visit the <Link to="/feed" className="text-bolt-500 underline">feed</Link> to discover content.
            </p>
          )}
        </motion.div>

        {/* Trending reels */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-5">
          <h3 className="font-display font-semibold mb-3">Trending reels</h3>
          {loading ? (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">Loading…</p>
          ) : data?.trendingReels?.length ? (
            <div className="grid grid-cols-3 gap-2">
              {data.trendingReels.map((reel) => (
                <Link
                  key={reel._id}
                  to="/reels"
                  className="aspect-[9/16] rounded-lg overflow-hidden bg-ink-800 relative group"
                >
                  {reel.video?.thumbnailUrl ? (
                    <img src={reel.video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="h-full w-full flex items-center justify-center text-cream/40 text-xs">Reel</div>
                  )}
                  <span className="absolute bottom-1 left-1 text-[10px] text-white bg-black/40 rounded px-1">
                    {reel.views} views
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">No reels yet. Be the first to post one!</p>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default DashboardPage;
