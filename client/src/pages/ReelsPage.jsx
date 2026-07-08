import { useEffect, useRef, useState } from 'react';
import { Plus, X, Upload } from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ReelCard from '../components/ReelCard';

const ReelsPage = () => {
  const [reels, setReels] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);
  const sentinelRef = useRef(null);

  const loadPage = async (pageNum) => {
    setLoading(true);
    try {
      const { data } = await api.get(`/reels/feed?page=${pageNum}&limit=5`);
      setReels((prev) => (pageNum === 1 ? data.reels : [...prev, ...data.reels]));
      setHasMore(data.hasMore);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPage(1);
  }, []);

  useEffect(() => {
    if (page > 1) loadPage(page);
  }, [page]);

  useEffect(() => {
    if (!sentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) setPage((p) => p + 1);
      },
      { threshold: 1 }
    );
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading]);

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('caption', caption);
      const { data } = await api.post('/reels', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setReels((prev) => [data.reel, ...prev]);
      setShowUpload(false);
      setFile(null);
      setCaption('');
    } catch (err) {
      alert(err.response?.data?.message || 'Could not upload reel.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <Topbar title="Reels" />

      <div className="relative">
        <div className="snap-y snap-mandatory overflow-y-scroll h-[calc(100vh-4rem)] lg:h-[calc(100vh-4rem)] py-2 space-y-4 px-2">
          {reels.map((reel) => (
            <ReelCard key={reel._id} reel={reel} />
          ))}
          <div ref={sentinelRef} className="h-10 flex items-center justify-center">
            {loading && <span className="text-sm text-ink-700/40 dark:text-cream/30">Loading more reels…</span>}
            {!hasMore && reels.length === 0 && (
              <span className="text-sm text-ink-700/40 dark:text-cream/30">No reels yet. Upload the first one!</span>
            )}
          </div>
        </div>

        <button
          onClick={() => setShowUpload(true)}
          className="fixed bottom-24 lg:bottom-8 right-6 lg:right-12 btn-amber rounded-full p-4 shadow-card z-30"
          aria-label="Upload reel"
        >
          <Plus size={22} />
        </button>
      </div>

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-5 relative">
            <button onClick={() => setShowUpload(false)} className="absolute top-3 right-3 text-ink-700/50 dark:text-cream/40">
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold mb-3">Upload a reel</h3>

            <label className="flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-bolt-200 dark:border-ink-700 p-6 cursor-pointer mb-3">
              <Upload size={24} className="text-bolt-500" />
              <span className="text-sm text-ink-700/60 dark:text-cream/50">
                {file ? file.name : 'Tap to select a vertical video'}
              </span>
              <input type="file" accept="video/*" hidden onChange={(e) => setFile(e.target.files[0])} />
            </label>

            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption…"
              rows={2}
              className="input-field resize-none mb-3"
            />

            <button onClick={handleUpload} disabled={!file || uploading} className="btn-primary w-full">
              {uploading ? 'Uploading…' : 'Post reel'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReelsPage;
