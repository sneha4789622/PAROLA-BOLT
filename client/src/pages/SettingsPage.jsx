import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Lock, Bell, Shield, Camera, Eye, EyeOff,
  Save, AlertTriangle, CheckCircle2, ChevronRight, HelpCircle,
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import { useAuth } from '../context/AuthContext';

const PASSWORD_RULES = [
  { label: 'At least 12 characters', test: (p) => p.length >= 12 },
  { label: 'Uppercase letter', test: (p) => /[A-Z]/.test(p) },
  { label: 'Lowercase letter', test: (p) => /[a-z]/.test(p) },
  { label: 'Number', test: (p) => /[0-9]/.test(p) },
  { label: 'Special character', test: (p) => /[!@#$%^&*(),.?":{}|<>_\-]/.test(p) },
];

const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'password', label: 'Password', icon: Lock },
  { key: 'privacy', label: 'Privacy', icon: Shield },
  { key: 'notifications', label: 'Notifications', icon: Bell },
];

const Toast = ({ message, type = 'success' }) => (
  <motion.div
    initial={{ opacity: 0, y: -10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    className={`fixed top-4 right-4 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-card ${
      type === 'success' ? 'bg-mint text-white' : 'bg-red-500 text-white'
    }`}
  >
    {type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
    {message}
  </motion.div>
);

const SettingsPage = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const avatarRef = useRef(null);
  const coverRef = useRef(null);

  const [tab, setTab] = useState('profile');
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({
    fullName: '', username: '', email: '', mobileNumber: '', bio: '', location: '', website: '',
  });

  // Password form
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });

  // Privacy
  const [privacy, setPrivacy] = useState({
    profileVisibility: 'public', showOnlineStatus: true,
    allowMessagesFrom: 'everyone', showFollowersList: true,
  });

  // Notifications
  const [notifs, setNotifs] = useState({
    likes: true, comments: true, shares: true, friendRequests: true,
    messages: true, systemAlerts: true, emailNotifications: true, smsNotifications: false,
  });

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await api.get('/settings');
        const u = data.user;
        setProfile({
          fullName: u.fullName || '', username: u.username || '',
          email: u.email || '', mobileNumber: u.mobileNumber || '',
          bio: u.bio || '', location: u.location || '', website: u.website || '',
        });
        if (u.privacySettings) setPrivacy((p) => ({ ...p, ...u.privacySettings }));
        if (u.notificationSettings) setNotifs((n) => ({ ...n, ...u.notificationSettings }));
      } catch {
        showToast('Could not load settings.', 'error');
      }
    };
    load();
  }, []);

  const saveProfile = async () => {
    setLoading(true);
    try {
      await api.put('/settings/basic', profile);
      await refreshUser();
      showToast('Profile updated successfully!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not update profile.', 'error');
    } finally { setLoading(false); }
  };

  const savePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      return showToast('All password fields are required.', 'error');
    }
    setLoading(true);
    try {
      await api.put('/settings/password', passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      showToast('Password changed! Please log in again.');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not change password.', 'error');
    } finally { setLoading(false); }
  };

  const savePrivacy = async () => {
    setLoading(true);
    try {
      await api.put('/settings/privacy', privacy);
      showToast('Privacy settings saved!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save privacy settings.', 'error');
    } finally { setLoading(false); }
  };

  const saveNotifications = async () => {
    setLoading(true);
    try {
      await api.put('/settings/notifications', notifs);
      showToast('Notification preferences saved!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not save notification settings.', 'error');
    } finally { setLoading(false); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('avatar', file);
    try {
      await api.put('/settings/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      showToast('Profile photo updated!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    }
  };

  const uploadCover = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('cover', file);
    try {
      await api.put('/settings/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      showToast('Cover photo updated!');
    } catch (err) {
      showToast(err.response?.data?.message || 'Upload failed.', 'error');
    }
  };

  const Toggle = ({ value, onChange, label, description }) => (
    <div className="flex items-center justify-between py-3 border-b border-bolt-100 dark:border-ink-700 last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description && <p className="text-xs text-ink-700/50 dark:text-cream/40">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!value)}
        className={`relative h-6 w-11 rounded-full transition-colors ${value ? 'bg-bolt-500' : 'bg-ink-700/20 dark:bg-ink-700'}`}
      >
        <span className={`absolute top-1 left-1 h-4 w-4 rounded-full bg-white transition-transform ${value ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );

  return (
    <div>
      <Topbar title="Account Settings" />

      <AnimatePresence>{toast && <Toast message={toast.message} type={toast.type} />}</AnimatePresence>

      <div className="max-w-3xl mx-auto p-4 lg:p-8">
        {/* Tab navigation */}
        <div className="flex gap-1 bg-bolt-50 dark:bg-ink-900 rounded-xl p-1 mb-6 overflow-x-auto">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 flex-1 min-w-max rounded-lg px-3 py-2 text-sm font-display font-medium transition-colors ${
                tab === key
                  ? 'bg-white dark:bg-ink-800 text-bolt-600 dark:text-bolt-300 shadow'
                  : 'text-ink-700/60 dark:text-cream/50 hover:text-ink-700 dark:hover:text-cream/80'
              }`}
            >
              <Icon size={15} /> {label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {/* ── PROFILE TAB ── */}
          {tab === 'profile' && (
            <motion.div key="profile" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              {/* Avatar + Cover upload */}
              <div className="card p-5 mb-5">
                <h3 className="font-display font-semibold mb-4">Photos</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Avatar */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="relative">
                      <img
                        src={user?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}&backgroundColor=6D5DFC&textColor=ffffff`}
                        alt=""
                        className="h-20 w-20 rounded-full object-cover border-2 border-bolt-200 dark:border-ink-700"
                      />
                      <button
                        onClick={() => avatarRef.current?.click()}
                        className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <Camera size={20} className="text-white" />
                      </button>
                    </div>
                    <button onClick={() => avatarRef.current?.click()} className="btn-secondary text-xs px-3 py-1.5">
                      <Camera size={13} /> Change photo
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
                  </div>

                  {/* Cover */}
                  <div className="flex-1 flex flex-col gap-2">
                    <div
                      className="relative h-24 rounded-xl overflow-hidden bg-gradient-to-r from-bolt-500 to-bolt-700 cursor-pointer group"
                      onClick={() => coverRef.current?.click()}
                    >
                      {user?.coverPhoto?.url && <img src={user.coverPhoto.url} alt="" className="h-full w-full object-cover" />}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Camera size={20} className="text-white" />
                      </div>
                    </div>
                    <button onClick={() => coverRef.current?.click()} className="btn-secondary text-xs px-3 py-1.5 self-start">
                      <Camera size={13} /> Change cover
                    </button>
                    <input ref={coverRef} type="file" accept="image/*" hidden onChange={uploadCover} />
                  </div>
                </div>
              </div>

              {/* Basic info form */}
              <div className="card p-5 space-y-4">
                <h3 className="font-display font-semibold">Basic Information</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Full name</label>
                    <input value={profile.fullName} onChange={(e) => setProfile((p) => ({ ...p, fullName: e.target.value }))}
                      placeholder="Your full name" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Username</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40 dark:text-cream/30 text-sm">@</span>
                      <input value={profile.username} onChange={(e) => setProfile((p) => ({ ...p, username: e.target.value.toLowerCase() }))}
                        placeholder="username" className="input-field pl-7" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Email</label>
                    <input type="email" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                      placeholder="you@example.com" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Mobile number</label>
                    <input type="tel" value={profile.mobileNumber} onChange={(e) => setProfile((p) => ({ ...p, mobileNumber: e.target.value }))}
                      placeholder="+91 98765 43210" className="input-field" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Bio</label>
                  <textarea value={profile.bio} onChange={(e) => setProfile((p) => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell the world about yourself…" rows={3} maxLength={250} className="input-field resize-none" />
                  <p className="text-xs text-ink-700/40 dark:text-cream/30 mt-1 text-right">{profile.bio.length}/250</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Location</label>
                    <input value={profile.location} onChange={(e) => setProfile((p) => ({ ...p, location: e.target.value }))}
                      placeholder="City, Country" className="input-field" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">Website</label>
                    <input value={profile.website} onChange={(e) => setProfile((p) => ({ ...p, website: e.target.value }))}
                      placeholder="https://yourwebsite.com" className="input-field" />
                  </div>
                </div>

                <button onClick={saveProfile} disabled={loading} className="btn-primary">
                  <Save size={16} /> {loading ? 'Saving…' : 'Save changes'}
                </button>
              </div>

              {/* Help Center shortcut */}
              <button onClick={() => navigate('/help')} className="card p-4 mt-4 w-full flex items-center justify-between hover:bg-bolt-50 dark:hover:bg-ink-800 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-bolt-100 dark:bg-ink-700">
                    <HelpCircle size={18} className="text-bolt-500" />
                  </span>
                  <div className="text-left">
                    <p className="text-sm font-medium">Help Center & Support</p>
                    <p className="text-xs text-ink-700/50 dark:text-cream/40">FAQs, support tickets, feedback</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-ink-700/40 dark:text-cream/30" />
              </button>
            </motion.div>
          )}

          {/* ── PASSWORD TAB ── */}
          {tab === 'password' && (
            <motion.div key="password" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="card p-5 space-y-4">
                <h3 className="font-display font-semibold">Change Password</h3>
                <p className="text-sm text-ink-700/60 dark:text-cream/50">
                  Choose a strong password with at least 12 characters including uppercase, lowercase, number, and special character.
                </p>

                {[
                  { key: 'currentPassword', label: 'Current password', placeholder: 'Your current password' },
                  { key: 'newPassword', label: 'New password', placeholder: 'New strong password' },
                  { key: 'confirmPassword', label: 'Confirm new password', placeholder: 'Re-enter new password' },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium mb-1.5 text-ink-700/70 dark:text-cream/60">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[key === 'currentPassword' ? 'current' : key === 'newPassword' ? 'new' : 'confirm'] ? 'text' : 'password'}
                        value={passwords[key]}
                        onChange={(e) => setPasswords((p) => ({ ...p, [key]: e.target.value }))}
                        placeholder={placeholder}
                        className="input-field pr-10"
                      />
                      <button type="button"
                        onClick={() => setShowPw((p) => ({ ...p, [key === 'currentPassword' ? 'current' : key === 'newPassword' ? 'new' : 'confirm']: !p[key === 'currentPassword' ? 'current' : key === 'newPassword' ? 'new' : 'confirm'] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-700/50 dark:text-cream/40">
                        {showPw[key === 'currentPassword' ? 'current' : key === 'newPassword' ? 'new' : 'confirm'] ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {key === 'newPassword' && passwords.newPassword && (
                      <ul className="mt-2 grid grid-cols-2 gap-1 text-xs">
                        {PASSWORD_RULES.map((r) => (
                          <li key={r.label} className={r.test(passwords.newPassword) ? 'text-mint' : 'text-ink-700/40 dark:text-cream/30'}>
                            {r.test(passwords.newPassword) ? '✓' : '•'} {r.label}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}

                <button onClick={savePassword} disabled={loading} className="btn-primary">
                  <Lock size={16} /> {loading ? 'Changing…' : 'Change password'}
                </button>

                <div className="pt-2 border-t border-bolt-100 dark:border-ink-700">
                  <p className="text-xs text-ink-700/50 dark:text-cream/40">
                    Forgot your current password?{' '}
                    <button onClick={() => navigate('/forgot-password')} className="text-bolt-500 hover:underline">
                      Reset via OTP
                    </button>
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* ── PRIVACY TAB ── */}
          {tab === 'privacy' && (
            <motion.div key="privacy" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="card p-5 mb-4">
                <h3 className="font-display font-semibold mb-3">Privacy Settings</h3>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5">Profile visibility</label>
                  <select value={privacy.profileVisibility} onChange={(e) => setPrivacy((p) => ({ ...p, profileVisibility: e.target.value }))}
                    className="input-field">
                    <option value="public">Public — anyone can see</option>
                    <option value="followers">Followers only</option>
                    <option value="private">Private</option>
                  </select>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1.5">Who can message me</label>
                  <select value={privacy.allowMessagesFrom} onChange={(e) => setPrivacy((p) => ({ ...p, allowMessagesFrom: e.target.value }))}
                    className="input-field">
                    <option value="everyone">Everyone</option>
                    <option value="followers">Followers only</option>
                    <option value="none">No one</option>
                  </select>
                </div>

                <Toggle value={privacy.showOnlineStatus} onChange={(v) => setPrivacy((p) => ({ ...p, showOnlineStatus: v }))}
                  label="Show online status" description="Let others see when you're active" />
                <Toggle value={privacy.showFollowersList} onChange={(v) => setPrivacy((p) => ({ ...p, showFollowersList: v }))}
                  label="Show followers list" description="Make your followers/following lists visible to others" />

                <button onClick={savePrivacy} disabled={loading} className="btn-primary mt-4">
                  <Save size={16} /> {loading ? 'Saving…' : 'Save privacy settings'}
                </button>
              </div>

              {/* Danger zone */}
              <div className="card p-5 border border-red-200 dark:border-red-900/50">
                <h3 className="font-display font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                  <AlertTriangle size={16} /> Danger Zone
                </h3>
                <p className="text-sm text-ink-700/60 dark:text-cream/50 mb-3">
                  Deactivating your account will hide your profile and content. You can restore it by contacting support.
                </p>
                <button onClick={() => navigate('/settings/deactivate')} className="text-sm text-red-500 hover:underline font-medium">
                  Deactivate account
                </button>
              </div>
            </motion.div>
          )}

          {/* ── NOTIFICATIONS TAB ── */}
          {tab === 'notifications' && (
            <motion.div key="notifications" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
              <div className="card p-5">
                <h3 className="font-display font-semibold mb-4">Notification Preferences</h3>

                <p className="text-xs font-medium text-ink-700/50 dark:text-cream/40 uppercase tracking-wider mb-2">Activity</p>
                <Toggle value={notifs.likes} onChange={(v) => setNotifs((n) => ({ ...n, likes: v }))}
                  label="Likes" description="When someone likes your post or reel" />
                <Toggle value={notifs.comments} onChange={(v) => setNotifs((n) => ({ ...n, comments: v }))}
                  label="Comments" description="When someone comments on your content" />
                <Toggle value={notifs.shares} onChange={(v) => setNotifs((n) => ({ ...n, shares: v }))}
                  label="Shares" description="When someone shares your post" />
                <Toggle value={notifs.friendRequests} onChange={(v) => setNotifs((n) => ({ ...n, friendRequests: v }))}
                  label="Friend requests" description="New friend requests and acceptances" />
                <Toggle value={notifs.messages} onChange={(v) => setNotifs((n) => ({ ...n, messages: v }))}
                  label="Messages" description="New direct messages" />
                <Toggle value={notifs.systemAlerts} onChange={(v) => setNotifs((n) => ({ ...n, systemAlerts: v }))}
                  label="System alerts" description="Account updates, verification status, support replies" />

                <p className="text-xs font-medium text-ink-700/50 dark:text-cream/40 uppercase tracking-wider mt-4 mb-2">Delivery</p>
                <Toggle value={notifs.emailNotifications} onChange={(v) => setNotifs((n) => ({ ...n, emailNotifications: v }))}
                  label="Email notifications" description="Receive notifications via email" />
                <Toggle value={notifs.smsNotifications} onChange={(v) => setNotifs((n) => ({ ...n, smsNotifications: v }))}
                  label="SMS notifications" description="Receive notifications via SMS (uses SMS fallback credits)" />

                <button onClick={saveNotifications} disabled={loading} className="btn-primary mt-4">
                  <Save size={16} /> {loading ? 'Saving…' : 'Save notification settings'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SettingsPage;
