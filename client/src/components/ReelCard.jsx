import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle, Share2, Volume2, VolumeX } from 'lucide-react';
import api from '../api/axios';
import VerifiedBadge from './VerifiedBadge';
import { useAuth } from '../context/AuthContext';

const ReelCard = ({ reel }) => {
  const { user } = useAuth();
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const [liked, setLiked] = useState(reel.likes?.some((id) => id === user?._id || id?._id === user?._id));
  const [likesCount, setLikesCount] = useState(reel.likes?.length || 0);
  const [muted, setMuted] = useState(true);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState(reel.comments || []);
  const [commentText, setCommentText] = useState('');
  const [shareCount, setShareCount] = useState(reel.shares?.length || 0);
  const viewedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          video.play().catch(() => {});
          if (!viewedRef.current) {
            viewedRef.current = true;
            api.put(`/reels/${reel._id}/view`).catch(() => {});
          }
        } else {
          video.pause();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(video);
    return () => observer.disconnect();
  }, [reel._id]);

  const toggleLike = async () => {
    setLiked((l) => !l);
    setLikesCount((c) => (liked ? c - 1 : c + 1));
    try {
      await api.put(`/reels/${reel._id}/like`);
    } catch {
      setLiked((l) => !l);
      setLikesCount((c) => (liked ? c + 1 : c - 1));
    }
  };

  const submitComment = async () => {
    if (!commentText.trim()) return;
    try {
      const { data } = await api.post(`/reels/${reel._id}/comments`, { text: commentText });
      setComments(data.comments);
      setCommentText('');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not post comment.');
    }
  };

  const handleShare = async () => {
    try {
      const { data } = await api.post(`/reels/${reel._id}/share`);
      setShareCount(data.sharesCount);
    } catch {
      // ignore
    }
  };

  return (
    <div ref={containerRef} className="relative h-[calc(100vh-4rem)] lg:h-[80vh] w-full max-w-sm mx-auto snap-start rounded-2xl overflow-hidden bg-black">
      <video
        ref={videoRef}
        src={reel.video?.url}
        loop
        muted={muted}
        playsInline
        className="h-full w-full object-cover"
        onClick={() => {
          const v = videoRef.current;
          if (v.paused) v.play();
          else v.pause();
        }}
      />

      {/* Gradient overlay + info */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-white">
        <Link to={`/profile/${reel.creator?.username}`} className="flex items-center gap-2 mb-2">
          <img
            src={reel.creator?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${reel.creator?.username}`}
            alt=""
            className="h-9 w-9 rounded-full object-cover border border-white/30"
          />
          <span className="text-sm font-semibold flex items-center gap-1">
            @{reel.creator?.username} {reel.creator?.isIdentityVerified && <VerifiedBadge size={12} />}
          </span>
        </Link>
        {reel.caption && <p className="text-sm mb-1 line-clamp-2">{reel.caption}</p>}
        <p className="text-xs text-white/60">🎵 {reel.audioLabel}</p>
      </div>

      {/* Right action rail */}
      <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5 text-white">
        <button onClick={toggleLike} className="flex flex-col items-center gap-1">
          <Heart size={26} className={liked ? 'fill-red-500 text-red-500' : ''} />
          <span className="text-xs">{likesCount}</span>
        </button>
        <button onClick={() => setShowComments(true)} className="flex flex-col items-center gap-1">
          <MessageCircle size={26} />
          <span className="text-xs">{comments.length}</span>
        </button>
        <button onClick={handleShare} className="flex flex-col items-center gap-1">
          <Share2 size={26} />
          <span className="text-xs">{shareCount}</span>
        </button>
        <button onClick={() => setMuted((m) => !m)} className="flex flex-col items-center gap-1">
          {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
        </button>
      </div>

      {/* Comments sheet */}
      {showComments && (
        <div className="absolute inset-x-0 bottom-0 max-h-[60%] rounded-t-2xl bg-white dark:bg-ink-900 text-ink-900 dark:text-cream p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-display font-semibold">Comments</h4>
            <button onClick={() => setShowComments(false)} className="text-sm text-ink-700/50 dark:text-cream/40">
              Close
            </button>
          </div>
          <div className="space-y-2 mb-3">
            {comments.map((c) => (
              <div key={c._id} className="text-sm">
                <span className="font-semibold mr-1">{c.user?.fullName}</span>
                {c.text}
              </div>
            ))}
            {comments.length === 0 && <p className="text-sm text-ink-700/50 dark:text-cream/40">No comments yet.</p>}
          </div>
          <div className="flex gap-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitComment()}
              placeholder="Add a comment…"
              className="input-field flex-1 text-sm"
            />
            <button onClick={submitComment} className="btn-secondary text-sm px-3">
              Post
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelCard;
