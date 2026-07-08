import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Heart, MessageCircle, Share2, Bookmark, Flag, AlertTriangle,
  MoreVertical, Edit3, Trash2, X, Check,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../api/axios';
import VerifiedBadge from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'hate_speech', label: 'Hate speech' },
  { value: 'harassment', label: 'Harassment' },
  { value: 'nudity', label: 'Nudity / sexual content' },
  { value: 'violence', label: 'Violence' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
];

// ─── Delete confirmation modal ────────────────────────────────────────────────
const DeleteModal = ({ onConfirm, onCancel }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
  >
    <motion.div
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.9, opacity: 0 }}
      className="card w-full max-w-sm p-5"
    >
      <div className="flex items-center gap-3 mb-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <Trash2 size={18} className="text-red-500" />
        </span>
        <div>
          <h3 className="font-display font-semibold">Delete post?</h3>
          <p className="text-xs text-ink-700/50 dark:text-cream/40">This action cannot be undone.</p>
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={onCancel} className="btn-secondary flex-1">Cancel</button>
        <button onClick={onConfirm} className="flex-1 rounded-xl bg-red-500 text-white font-display font-semibold px-4 py-2.5 text-sm hover:bg-red-600 transition-colors">
          Delete
        </button>
      </div>
    </motion.div>
  </motion.div>
);

// ─── Comment item with edit/delete ───────────────────────────────────────────
const CommentItem = ({ comment, postId, currentUserId, userRole, onUpdate }) => {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.text);
  const [saving, setSaving] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const isOwner = (comment.user?._id || comment.user) === currentUserId;
  const isMod = ['admin', 'moderator'].includes(userRole);
  const canEdit = isOwner;
  const canDelete = isOwner || isMod;

  const saveEdit = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      const { data } = await api.put(`/posts/${postId}/comments/${comment._id}`, { text });
      onUpdate(data.comments);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not update comment.');
    } finally { setSaving(false); }
  };

  const deleteComment = async () => {
    try {
      const { data } = await api.delete(`/posts/${postId}/comments/${comment._id}`);
      onUpdate(data.comments);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete comment.');
    }
    setShowDeleteModal(false);
  };

  return (
    <>
      <AnimatePresence>{showDeleteModal && <DeleteModal onConfirm={deleteComment} onCancel={() => setShowDeleteModal(false)} />}</AnimatePresence>
      <div className="flex gap-2 group">
        <img
          src={comment.user?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${comment.user?.username}`}
          alt="" className="h-7 w-7 rounded-full object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <input value={text} onChange={(e) => setText(e.target.value)}
                className="input-field flex-1 text-sm py-1.5" autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') setEditing(false); }}
              />
              <button onClick={saveEdit} disabled={saving} className="text-mint"><Check size={16} /></button>
              <button onClick={() => { setEditing(false); setText(comment.text); }} className="text-ink-700/50"><X size={16} /></button>
            </div>
          ) : (
            <div className="flex items-start gap-1">
              <p className="text-sm flex-1">
                <span className="font-semibold mr-1">{comment.user?.fullName}</span>{comment.text}
              </p>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {canEdit && (
                  <button onClick={() => setEditing(true)} className="text-ink-700/40 dark:text-cream/30 hover:text-bolt-500">
                    <Edit3 size={12} />
                  </button>
                )}
                {canDelete && (
                  <button onClick={() => setShowDeleteModal(true)} className="text-ink-700/40 dark:text-cream/30 hover:text-red-500">
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

// ─── Main PostCard ────────────────────────────────────────────────────────────
const PostCard = ({ post, onChange }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(post.likes?.some((id) => (id?._id || id) === user?._id));
  const [likesCount, setLikesCount] = useState(post.likes?.length || 0);
  const [savedState, setSavedState] = useState(post.savedBy?.some((id) => (id?._id || id) === user?._id));
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(post.comments || []);
  const [commentText, setCommentText] = useState('');
  const [showReport, setShowReport] = useState(false);
  const [shareCount, setShareCount] = useState(post.shares?.length || 0);
  const [showMenu, setShowMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editCaption, setEditCaption] = useState(post.caption || '');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [saving, setSaving] = useState(false);

  const isOwner = (post.author?._id || post.author) === user?._id;
  const isAdmin = ['admin', 'moderator'].includes(user?.role);

  if (deleted) return null;

  const toggleLike = async () => {
    setLiked((l) => !l);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try { await api.put(`/posts/${post._id}/like`); }
    catch { setLiked((l) => !l); setLikesCount((c) => (liked ? c + 1 : c - 1)); }
  };

  const toggleSave = async () => {
    setSavedState((s) => !s);
    try { await api.put(`/posts/${post._id}/save`); }
    catch { setSavedState((s) => !s); }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/posts/${post._id}/comments`, { text: commentText });
      setComments(data.comments);
      setCommentText('');
    } catch (err) { alert(err.response?.data?.message || 'Could not post comment.'); }
  };

  const handleShare = async () => {
    try { const { data } = await api.post(`/posts/${post._id}/share`); setShareCount(data.sharesCount); }
    catch { /* ignore */ }
  };

  const submitReport = async (reason) => {
    try { await api.post(`/posts/${post._id}/report`, { reason }); setShowReport(false); onChange?.(); }
    catch (err) { alert(err.response?.data?.message || 'Could not submit report.'); }
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      await api.put(`/posts/${post._id}`, { caption: editCaption });
      setEditing(false);
      onChange?.();
    } catch (err) { alert(err.response?.data?.message || 'Could not update post.'); }
    finally { setSaving(false); }
  };

  const deletePost = async () => {
    try { await api.delete(`/posts/${post._id}`); setDeleted(true); onChange?.(); }
    catch (err) { alert(err.response?.data?.message || 'Could not delete post.'); }
    setShowDeleteModal(false);
  };

  return (
    <>
      <AnimatePresence>
        {showDeleteModal && <DeleteModal onConfirm={deletePost} onCancel={() => setShowDeleteModal(false)} />}
      </AnimatePresence>

      <motion.article initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card overflow-hidden mb-4">
        {/* Header */}
        <div className="flex items-center gap-3 p-4">
          <Link to={`/profile/${post.author?.username}`}>
            <img
              src={post.author?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${post.author?.username}`}
              alt="" className="h-10 w-10 rounded-full object-cover"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link to={`/profile/${post.author?.username}`} className="text-sm font-semibold flex items-center gap-1 hover:underline">
              {post.author?.fullName} {post.author?.isIdentityVerified && <VerifiedBadge size={13} />}
            </Link>
            <p className="text-xs text-ink-700/50 dark:text-cream/40">@{post.author?.username}</p>
          </div>

          {/* Three-dot menu */}
          <div className="relative">
            <button onClick={() => setShowMenu((s) => !s)} className="p-2 rounded-full hover:bg-bolt-50 dark:hover:bg-ink-800 text-ink-700/50 dark:text-cream/40">
              <MoreVertical size={17} />
            </button>
            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  className="absolute right-0 top-8 z-20 w-44 card py-1 shadow-card"
                >
                  {(isOwner) && (
                    <button onClick={() => { setEditing(true); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-bolt-50 dark:hover:bg-ink-800">
                      <Edit3 size={14} className="text-bolt-500" /> Edit post
                    </button>
                  )}
                  {(isOwner || isAdmin) && (
                    <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                      <Trash2 size={14} /> Delete post
                    </button>
                  )}
                  <button onClick={() => { setShowReport((s) => !s); setShowMenu(false); }}
                    className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-bolt-50 dark:hover:bg-ink-800">
                    <Flag size={14} /> Report post
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Moderation flag */}
        {post.moderation?.status === 'flagged' && (
          <div className="flex items-center gap-2 bg-amber/10 text-amber-dark dark:text-amber px-4 py-2 text-xs font-medium">
            <AlertTriangle size={14} /> This post has been flagged for review.
          </div>
        )}

        {/* Caption — edit mode or display */}
        {editing ? (
          <div className="px-4 pb-3">
            <textarea value={editCaption} onChange={(e) => setEditCaption(e.target.value)}
              rows={3} className="input-field resize-none w-full text-sm" autoFocus />
            <div className="flex gap-2 mt-2">
              <button onClick={saveEdit} disabled={saving} className="btn-primary text-sm px-4 py-2">
                <Check size={14} /> {saving ? 'Saving…' : 'Save'}
              </button>
              <button onClick={() => { setEditing(false); setEditCaption(post.caption || ''); }} className="btn-secondary text-sm px-4 py-2">
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          post.caption && <p className="px-4 pb-3 text-sm whitespace-pre-wrap">{editCaption || post.caption}</p>
        )}

        {/* Media */}
        {post.media?.length > 0 && (
          <div className={`grid ${post.media.length > 1 ? 'grid-cols-2 gap-0.5' : ''}`}>
            {post.media.map((m, i) =>
              m.mediaType === 'video' ? (
                <video key={i} src={m.url} controls className="w-full max-h-[480px] object-cover bg-black" />
              ) : (
                <img key={i} src={m.url} alt="" className="w-full max-h-[480px] object-cover" />
              )
            )}
          </div>
        )}

        {/* Report reasons */}
        {showReport && (
          <div className="px-4 py-2 border-t border-bolt-100 dark:border-ink-700">
            <p className="text-xs font-medium mb-2 text-ink-700/60 dark:text-cream/50">Select reason for reporting:</p>
            <div className="flex flex-wrap gap-2">
              {REPORT_REASONS.map((r) => (
                <button key={r.value} onClick={() => submitReport(r.value)}
                  className="text-xs rounded-full bg-bolt-50 dark:bg-ink-800 px-3 py-1 hover:bg-bolt-100 dark:hover:bg-ink-700">
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-1 px-2 py-2 border-t border-bolt-100 dark:border-ink-700">
          <button onClick={toggleLike} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-bolt-50 dark:hover:bg-ink-800">
            <Heart size={18} className={liked ? 'fill-red-500 text-red-500' : ''} /> {likesCount}
          </button>
          <button onClick={() => setShowComments((s) => !s)} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-bolt-50 dark:hover:bg-ink-800">
            <MessageCircle size={18} /> {comments.length}
          </button>
          <button onClick={handleShare} className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm hover:bg-bolt-50 dark:hover:bg-ink-800">
            <Share2 size={18} /> {shareCount}
          </button>
          <button onClick={toggleSave} className="ml-auto rounded-lg px-3 py-1.5 hover:bg-bolt-50 dark:hover:bg-ink-800">
            <Bookmark size={18} className={savedState ? 'fill-bolt-500 text-bolt-500' : ''} />
          </button>
        </div>

        {/* Comments */}
        {showComments && (
          <div className="border-t border-bolt-100 dark:border-ink-700 px-4 py-3 space-y-3">
            {comments.map((c) => (
              <CommentItem
                key={c._id}
                comment={c}
                postId={post._id}
                currentUserId={user?._id}
                userRole={user?.role}
                onUpdate={setComments}
              />
            ))}
            {comments.length === 0 && (
              <p className="text-xs text-ink-700/50 dark:text-cream/40">No comments yet. Be the first!</p>
            )}
            <div className="flex gap-2 pt-1">
              <input value={commentText} onChange={(e) => setCommentText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitComment()}
                placeholder="Write a positive comment…"
                className="input-field flex-1 text-sm"
              />
              <button onClick={submitComment} className="btn-secondary text-sm px-3 py-2">Post</button>
            </div>
          </div>
        )}
      </motion.article>
    </>
  );
};

export default PostCard;
