import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, X } from 'lucide-react';
import api from '../api/axios';
import Topbar from '../components/Topbar';
import ChatList from '../components/ChatList';
import ChatWindow from '../components/ChatWindow';

const MessagesPage = () => {
  const location = useLocation();
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);

  const loadChats = async () => {
    const { data } = await api.get('/chats');
    setChats(data.chats);
    return data.chats;
  };

  useEffect(() => {
    loadChats().then((loaded) => {
      if (location.state?.chatId) {
        const found = loaded.find((c) => c._id === location.state.chatId);
        if (found) setActiveChat(found);
      }
    });
  }, []);

  const handleSearchUsers = async (q) => {
    setSearchQuery(q);
    if (!q.trim()) return setSearchResults([]);
    const { data } = await api.get(`/search?q=${encodeURIComponent(q)}&type=users`);
    setSearchResults(data.results.users || []);
  };

  const startChat = async (userId) => {
    const { data } = await api.post('/chats', { userId });
    setShowNewChat(false);
    setSearchQuery('');
    setSearchResults([]);
    await loadChats();
    setActiveChat(data.chat);
  };

  return (
    <div>
      <Topbar title="Messages" />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Chat list */}
        <div className={`w-full lg:w-80 border-r border-bolt-100 dark:border-ink-700 ${activeChat ? 'hidden lg:block' : ''}`}>
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="font-display font-semibold">Conversations</h3>
            <button onClick={() => setShowNewChat(true)} className="rounded-full bg-bolt-50 dark:bg-ink-800 p-2 text-bolt-600 dark:text-bolt-300">
              <Plus size={18} />
            </button>
          </div>
          <ChatList chats={chats} activeChatId={activeChat?._id} onSelect={setActiveChat} />
        </div>

        {/* Chat window */}
        <div className={`flex-1 ${!activeChat ? 'hidden lg:flex lg:items-center lg:justify-center' : ''}`}>
          {activeChat ? (
            <ChatWindow chat={activeChat} onBack={() => setActiveChat(null)} />
          ) : (
            <p className="text-sm text-ink-700/50 dark:text-cream/40">Select a conversation to start chatting.</p>
          )}
        </div>
      </div>

      {/* New chat modal */}
      {showNewChat && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="card w-full max-w-sm p-5 relative">
            <button onClick={() => setShowNewChat(false)} className="absolute top-3 right-3 text-ink-700/50 dark:text-cream/40">
              <X size={18} />
            </button>
            <h3 className="font-display font-semibold mb-3">New conversation</h3>
            <input
              value={searchQuery}
              onChange={(e) => handleSearchUsers(e.target.value)}
              placeholder="Search by username or name…"
              className="input-field mb-3"
            />
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.map((u) => (
                <button key={u._id} onClick={() => startChat(u._id)} className="flex w-full items-center gap-3 rounded-xl p-2 hover:bg-bolt-50 dark:hover:bg-ink-800">
                  <img
                    src={u.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${u.username}`}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover"
                  />
                  <div className="text-left">
                    <p className="text-sm font-medium">{u.fullName}</p>
                    <p className="text-xs text-ink-700/50 dark:text-cream/40">@{u.username}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MessagesPage;
