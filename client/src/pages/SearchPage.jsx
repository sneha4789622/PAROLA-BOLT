import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import VerifiedBadge from '../components/VerifiedBadge';
import PostCard from '../components/PostCard';

const SearchPage = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/search?q=${encodeURIComponent(query)}&type=all`);
      setResults(data.results);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Topbar title="Search" />
      <div className="max-w-2xl mx-auto p-4">
        <form onSubmit={handleSearch} className="relative mb-4">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700/40 dark:text-cream/30" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users, posts, reels, #hashtags…"
            className="input-field pl-10"
          />
        </form>

        {loading && <p className="text-sm text-ink-700/50 dark:text-cream/40">Searching…</p>}

        {results && (
          <div className="space-y-6">
            {results.users?.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-2">People</h3>
                <div className="card divide-y divide-bolt-100 dark:divide-ink-700">
                  {results.users.map((u) => (
                    <Link key={u._id} to={`/profile/${u.username}`} className="flex items-center gap-3 p-3 hover:bg-bolt-50 dark:hover:bg-ink-800">
                      <img
                        src={u.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                        alt=""
                        className="h-9 w-9 rounded-full object-cover"
                      />
                      <div>
                        <p className="text-sm font-medium flex items-center gap-1">
                          {u.fullName} {u.isIdentityVerified && <VerifiedBadge size={12} />}
                        </p>
                        <p className="text-xs text-ink-700/50 dark:text-cream/40">@{u.username}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {results.posts?.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-2">Posts</h3>
                {results.posts.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </section>
            )}

            {(results.hashtagPosts?.length > 0 || results.hashtagReels?.length > 0) && (
              <section>
                <h3 className="font-display font-semibold mb-2">Hashtag results</h3>
                {results.hashtagPosts?.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </section>
            )}

            {results.reels?.length > 0 && (
              <section>
                <h3 className="font-display font-semibold mb-2">Reels</h3>
                <div className="grid grid-cols-3 gap-2">
                  {results.reels.map((r) => (
                    <div key={r._id} className="aspect-[9/16] rounded-lg overflow-hidden bg-black">
                      <video src={r.video?.url} className="h-full w-full object-cover" muted />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {!results.users?.length && !results.posts?.length && !results.reels?.length && (
              <p className="text-sm text-ink-700/50 dark:text-cream/40">No results found for "{query}".</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchPage;
