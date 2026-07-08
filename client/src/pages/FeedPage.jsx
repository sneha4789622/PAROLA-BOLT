import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';

const FeedPage = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const sentinelRef = useRef(null);

  const loadPage = useCallback(async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/posts/feed?page=${pageNum}&limit=8`);
      setPosts((prev) => (pageNum === 1 ? data.posts : [...prev, ...data.posts]));
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage((p) => p + 1);
        }
      },
      { threshold: 1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) loadPage(page);
  }, [page, loadPage]);

  return (
    <div>
      <Topbar title="Feed" />
      <div className="max-w-2xl mx-auto p-4">
        <PostComposer onPosted={(post) => setPosts((prev) => [post, ...prev])} />

        {posts.map((post) => (
          <PostCard key={post._id} post={post} onChange={() => loadPage(1)} />
        ))}

        <div ref={sentinelRef} className="h-10 flex items-center justify-center">
          {loading && <span className="text-sm text-ink-700/40 dark:text-cream/30">Loading more…</span>}
          {!hasMore && posts.length > 0 && (
            <span className="text-sm text-ink-700/40 dark:text-cream/30">You're all caught up ✨</span>
          )}
          {!loading && posts.length === 0 && (
            <span className="text-sm text-ink-700/40 dark:text-cream/30">No posts yet. Be the first to share!</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeedPage;
