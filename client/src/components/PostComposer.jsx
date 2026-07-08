import { useRef, useState } from 'react';
import { Image as ImageIcon, X, Send } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PostComposer = ({ onPosted }) => {
  const { user } = useAuth();
  const [caption, setCaption] = useState('');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [posting, setPosting] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInputRef = useRef(null);

  const handleFiles = (e) => {
    const selected = Array.from(e.target.files).slice(0, 10);
    setFiles(selected);
    setPreviews(selected.map((f) => ({ url: URL.createObjectURL(f), type: f.type })));
  };

  const removeFile = (index) => {
    setFiles((f) => f.filter((_, i) => i !== index));
    setPreviews((p) => p.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!caption.trim() && files.length === 0) return;
    setPosting(true);
    setNotice('');
    try {
      const formData = new FormData();
      formData.append('caption', caption);
      files.forEach((f) => formData.append('media', f));

      const { data } = await api.post('/posts', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setNotice(data.message);
      setCaption('');
      setFiles([]);
      setPreviews([]);
      onPosted?.(data.post);
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not create post.');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="card p-4 mb-4">
      <div className="flex gap-3">
        <img
          src={user?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${user?.username}`}
          alt=""
          className="h-10 w-10 rounded-full object-cover shrink-0"
        />
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Share something positive with Parola Bolt…"
          rows={2}
          className="input-field flex-1 resize-none"
        />
      </div>

      {previews.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-black/5">
              {p.type.startsWith('video') ? (
                <video src={p.url} className="h-full w-full object-cover" />
              ) : (
                <img src={p.url} alt="" className="h-full w-full object-cover" />
              )}
              <button
                onClick={() => removeFile(i)}
                className="absolute top-1 right-1 rounded-full bg-black/50 text-white p-1"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {notice && <p className="mt-2 text-xs text-bolt-600 dark:text-bolt-300">{notice}</p>}

      <div className="mt-3 flex items-center justify-between">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-bolt-600 dark:text-bolt-300 hover:bg-bolt-50 dark:hover:bg-ink-800"
        >
          <ImageIcon size={18} /> Photo / Video
        </button>
        <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple hidden onChange={handleFiles} />

        <button onClick={handleSubmit} disabled={posting} className="btn-primary text-sm px-4 py-2">
          <Send size={16} /> {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  );
};

export default PostComposer;
