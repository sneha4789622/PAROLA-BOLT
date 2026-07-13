import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  MapPin, Link as LinkIcon, UserPlus, UserMinus,
  MessageCircle, ShieldCheck, Upload, Camera, Edit3, X
} from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import PostCard from '../components/PostCard';
import VerifiedBadge from '../components/VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const TABS = [
  { key: 'posts', label: 'Posts' },
  { key: 'reels', label: 'Reels' },
  { key: 'media', label: 'Media' },
  { key: 'saved', label: 'Saved' },
];

const ProfilePage = () => {
  const { username } = useParams();
  const [searchParams] = useSearchParams();
  const { user: me, refreshUser } = useAuth();
  const navigate = useNavigate();

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const [profile, setProfile] = useState(null);
  const [tab, setTab] = useState('posts');
  const [items, setItems] = useState([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [showVerifyForm, setShowVerifyForm] = useState(searchParams.get('verify') === '1');
  const [verifyFiles, setVerifyFiles] = useState({ documentFront: null, documentBack: null, selfie: null });
  const [verifySubmitting, setVerifySubmitting] = useState(false);
  const [verifyNotice, setVerifyNotice] = useState('');
  const [notice, setNotice] = useState('');
  const [listModal, setListModal] = useState(null); // null | 'followers' | 'following'

  const isOwnProfile = me?.username === username;

  const loadProfile = async () => {
    const { data } = await api.get(`/users/${username}`);
    setProfile(data.user);
  };

  useEffect(() => {
    loadProfile();
    setTab('posts');
  }, [username]);

  useEffect(() => {
    if (!profile) return;
    setLoadingItems(true);
    const endpoint =
      tab === 'reels'
        ? `/users/${profile._id}/reels`
        : `/users/${profile._id}/posts?tab=${tab}`;
    api
      .get(endpoint)
      .then((res) => setItems(tab === 'reels' ? res.data.reels : res.data.posts))
      .finally(() => setLoadingItems(false));
  }, [profile, tab]);

  /* ── Upload avatar ── */
  const handleAvatarChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await api.put('/users/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await refreshUser();
      await loadProfile();
      setNotice('Profile photo updated!');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  /* ── Upload cover ── */
  const handleCoverChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingCover(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('cover', file);
      await api.put('/users/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadProfile();
      setNotice('Cover photo updated!');
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not upload cover.');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleFollow = async () => {
    try {
      if (profile.relationship === 'following' || profile.relationship === 'requested') {
        // Unfollow if already following, or cancel the pending outgoing request
        await api.delete(`/users/${profile._id}/follow`);
      } else {
        await api.post(`/users/${profile._id}/follow`);
      }
      await loadProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  const respondToIncomingRequest = async (action) => {
    try {
      await api.put(`/users/friend-request/${profile.incomingRequestId}/respond`, { action });
      await loadProfile();
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed.');
    }
  };

  const startChat = async () => {
    const { data } = await api.post('/chats', { userId: profile._id });
    navigate('/messages', { state: { chatId: data.chat._id } });
  };

  const submitVerification = async () => {
    if (!verifyFiles.documentFront) {
      setVerifyNotice('A front-facing government ID is required.');
      return;
    }
    setVerifySubmitting(true);
    setVerifyNotice('');
    try {
      const formData = new FormData();
      formData.append('documentType', 'government_id');
      formData.append('documentFront', verifyFiles.documentFront);
      if (verifyFiles.documentBack) formData.append('documentBack', verifyFiles.documentBack);
      if (verifyFiles.selfie) formData.append('selfie', verifyFiles.selfie);
      const { data } = await api.post('/users/verification-request', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setVerifyNotice(data.message);
      await refreshUser();
    } catch (err) {
      setVerifyNotice(err.response?.data?.message || 'Could not submit.');
    } finally {
      setVerifySubmitting(false);
    }
  };

  if (!profile) {
    return (
      <div>
        <Topbar title="Profile" />
        <div className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-bolt-200 border-t-bolt-500" />
        </div>
      </div>
    );
  }

  const isFollowing = profile.relationship === 'following';

  /* ── Avatar src ── */
  const avatarSrc =
    profile.avatar?.url ||
    `https://api.dicebear.com/7.x/initials/svg?seed=${profile.username}&backgroundColor=6D5DFC&textColor=ffffff`;

  return (
    <div>
      <Topbar title={`@${profile.username}`} />

      {/* ── Cover photo — compact height ── */}
      <div className="relative h-36 lg:h-48 bg-gradient-to-r from-bolt-600 to-bolt-800 overflow-hidden">
        {profile.coverPhoto?.url && (
          <img src={profile.coverPhoto.url} alt="" className="h-full w-full object-cover" />
        )}

        {/* Cover upload button — own profile only */}
        {isOwnProfile && (
          <>
            <button
              onClick={() => coverInputRef.current?.click()}
              disabled={uploadingCover}
              className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-black/50 hover:bg-black/70 text-white text-xs px-3 py-1.5 backdrop-blur transition"
            >
              {uploadingCover ? (
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Edit3 size={13} />
              )}
              {uploadingCover ? 'Uploading…' : 'Edit cover'}
            </button>
            <input
              ref={coverInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleCoverChange}
            />
          </>
        )}
      </div>

      <div className="max-w-3xl mx-auto px-4">
        {/* ── Avatar row ── */}
        <div className="flex items-end justify-between -mt-12 mb-3 flex-wrap gap-3">

          {/* Avatar with upload overlay */}
          <div className="relative">
            <img
              src={avatarSrc}
              alt={profile.username}
              className="h-24 w-24 rounded-full object-cover border-4 border-cream dark:border-ink-950 bg-bolt-100 shadow-card"
            />
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 hover:opacity-100 transition-opacity"
                  title="Change profile photo"
                >
                  {uploadingAvatar ? (
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                  ) : (
                    <Camera size={22} className="text-white" />
                  )}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleAvatarChange}
                />
                {/* Small camera badge */}
                <span
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-1 right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-bolt-500 border-2 border-cream dark:border-ink-950 shadow"
                >
                  <Camera size={13} className="text-white" />
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          {!isOwnProfile ? (
            <div className="flex gap-2">
              {profile.relationship === 'incoming_request' ? (
                <>
                  <button onClick={() => respondToIncomingRequest('accept')} className="btn-primary text-sm">
                    <UserPlus size={15} /> Accept
                  </button>
                  <button onClick={() => respondToIncomingRequest('decline')} className="btn-secondary text-sm">
                    <UserMinus size={15} /> Reject
                  </button>
                </>
              ) : (
                <button onClick={handleFollow} className="btn-secondary text-sm">
                  {isFollowing ? <UserMinus size={15} /> : <UserPlus size={15} />}
                  {isFollowing ? 'Unfollow' : profile.relationship === 'requested' ? 'Requested' : 'Follow'}
                </button>
              )}
              <button onClick={startChat} className="btn-primary text-sm">
                <MessageCircle size={15} /> Message
              </button>
            </div>
          ) : (
            <button
              onClick={() => navigate('/settings')}
              className="btn-secondary text-sm"
            >
              <Edit3 size={15} /> Edit profile
            </button>
          )}
        </div>

        {/* ── Upload notice ── */}
        {notice && (
          <p className="mb-2 text-xs font-medium text-mint">{notice}</p>
        )}

        {/* ── Profile info ── */}
        <div>
          <h2 className="font-display text-xl font-bold flex items-center gap-1.5 flex-wrap">
            {profile.fullName}
            {profile.isIdentityVerified && <VerifiedBadge size={18} />}
          </h2>
          <p className="text-sm text-ink-700/50 dark:text-cream/40 mb-1">@{profile.username}</p>
          {profile.bio && <p className="text-sm mb-2">{profile.bio}</p>}

          <div className="flex flex-wrap gap-4 text-xs text-ink-700/60 dark:text-cream/50 mb-2">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin size={13} /> {profile.location}
              </span>
            )}
            {profile.website && (
              <a
                href={profile.website}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-bolt-500 hover:underline"
              >
                <LinkIcon size={13} /> {profile.website}
              </a>
            )}
          </div>

          <div className="flex gap-5 text-sm font-medium">
            <span><strong>{profile.postsCount || 0}</strong> <span className="font-normal text-ink-700/60 dark:text-cream/40">Posts</span></span>
            <button onClick={() => setListModal('followers')} className="hover:underline">
              <strong>{profile.followersCount ?? 0}</strong> <span className="font-normal text-ink-700/60 dark:text-cream/40">Followers</span>
            </button>
            <button onClick={() => setListModal('following')} className="hover:underline">
              <strong>{profile.followingCount ?? 0}</strong> <span className="font-normal text-ink-700/60 dark:text-cream/40">Following</span>
            </button>
          </div>
        </div>

        {/* ── Followers / Following list modal ── */}
        {listModal && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setListModal(null)}
          >
            <div
              className="card w-full max-w-sm max-h-[70vh] flex flex-col overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between p-4 border-b border-bolt-100 dark:border-ink-700">
                <h3 className="font-display font-semibold capitalize">{listModal}</h3>
                <button onClick={() => setListModal(null)} className="text-ink-700/50 dark:text-cream/40 hover:text-ink-900 dark:hover:text-cream">
                  <X size={18} />
                </button>
              </div>
              <div className="overflow-y-auto p-2">
                {profile[listModal]?.length ? (
                  profile[listModal].map((u) => (
                    <button
                      key={u._id}
                      onClick={() => {
                        setListModal(null);
                        navigate(`/profile/${u.username}`);
                      }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-bolt-50 dark:hover:bg-ink-800 text-left"
                    >
                      <img
                        src={u.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                        className="h-10 w-10 rounded-full object-cover"
                        alt=""
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate flex items-center gap-1">
                          {u.fullName} {u.isIdentityVerified && <VerifiedBadge size={12} />}
                        </p>
                        <p className="text-xs text-ink-700/50 dark:text-cream/40">@{u.username}</p>
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="text-sm text-center py-8 text-ink-700/50 dark:text-cream/40">
                    No {listModal} yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Verification CTA (own profile, not yet verified) ── */}
        {isOwnProfile && !profile.isIdentityVerified && (
          <div className="mt-4 card p-4">
            {profile.verificationStatus === 'pending' ? (
              <p className="text-sm flex items-center gap-2 text-amber-dark dark:text-amber">
                <ShieldCheck size={16} /> Your verification request is pending review.
              </p>
            ) : (
              <>
                <button onClick={() => setShowVerifyForm((s) => !s)} className="btn-amber text-sm">
                  <ShieldCheck size={16} /> Get verified
                </button>
                {showVerifyForm && (
                  <div className="mt-3 space-y-2">
                    {[
                      { key: 'documentFront', label: 'Government ID — front (required)' },
                      { key: 'documentBack', label: 'Government ID — back (optional)' },
                      { key: 'selfie', label: 'Selfie holding ID (optional)' },
                    ].map((f) => (
                      <label
                        key={f.key}
                        className="flex items-center gap-2 rounded-xl border border-dashed border-bolt-200 dark:border-ink-700 p-3 text-sm cursor-pointer hover:bg-bolt-50 dark:hover:bg-ink-800"
                      >
                        <Upload size={16} className="text-bolt-500 shrink-0" />
                        <span className={verifyFiles[f.key] ? 'text-mint' : ''}>
                          {verifyFiles[f.key]?.name || f.label}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(e) =>
                            setVerifyFiles((v) => ({ ...v, [f.key]: e.target.files[0] }))
                          }
                        />
                      </label>
                    ))}
                    {verifyNotice && (
                      <p className="text-xs text-bolt-600 dark:text-bolt-300">{verifyNotice}</p>
                    )}
                    <button
                      onClick={submitVerification}
                      disabled={verifySubmitting}
                      className="btn-primary text-sm"
                    >
                      {verifySubmitting ? 'Submitting…' : 'Submit for review'}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="mt-5 flex gap-1 border-b border-bolt-100 dark:border-ink-700">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 text-sm font-display font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-bolt-500 text-bolt-600 dark:text-bolt-300'
                  : 'border-transparent text-ink-700/50 dark:text-cream/40 hover:text-ink-700 dark:hover:text-cream/70'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Tab content ── */}
        <div className="py-4">
          {loadingItems ? (
            <div className="flex justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-4 border-bolt-200 border-t-bolt-500" />
            </div>
          ) : tab === 'reels' ? (
            items.length ? (
              <div className="grid grid-cols-3 gap-1.5">
                {items.map((r) => (
                  <div key={r._id} className="aspect-[9/16] rounded-lg overflow-hidden bg-ink-900">
                    <video src={r.video?.url} className="h-full w-full object-cover" muted />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-700/50 dark:text-cream/40 py-8 text-center">No reels yet.</p>
            )
          ) : tab === 'media' ? (
            items.length ? (
              <div className="grid grid-cols-3 gap-1.5">
                {items.flatMap((p) =>
                  p.media.map((m, i) =>
                    m.mediaType === 'video' ? (
                      <video
                        key={`${p._id}-${i}`}
                        src={m.url}
                        className="aspect-square object-cover rounded-lg bg-black"
                        muted
                      />
                    ) : (
                      <img
                        key={`${p._id}-${i}`}
                        src={m.url}
                        alt=""
                        className="aspect-square object-cover rounded-lg"
                      />
                    )
                  )
                )}
              </div>
            ) : (
              <p className="text-sm text-ink-700/50 dark:text-cream/40 py-8 text-center">No media yet.</p>
            )
          ) : items.length ? (
            items.map((post) => <PostCard key={post._id} post={post} onChange={() => {}} />)
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40 py-8 text-center">
              {tab === 'saved' ? 'No saved posts yet.' : 'No posts yet.'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
