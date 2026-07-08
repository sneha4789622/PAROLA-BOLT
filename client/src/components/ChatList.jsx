import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';

const getOtherParticipant = (chat, myId) => chat.participants.find((p) => p._id !== myId);

const ChatList = ({ chats, activeChatId, onSelect }) => {
  const { user } = useAuth();
  const { onlineUserIds } = useSocket();

  return (
    <div className="h-full overflow-y-auto">
      {chats.length === 0 && (
        <p className="p-4 text-sm text-ink-700/50 dark:text-cream/40">
          No conversations yet. Visit a profile and tap "Message" to start one.
        </p>
      )}
      {chats.map((chat) => {
        const other = chat.isGroup ? null : getOtherParticipant(chat, user._id);
        const name = chat.isGroup ? chat.name : other?.fullName;
        const avatarSeed = chat.isGroup ? chat.name : other?.username;
        const isOnline = !chat.isGroup && onlineUserIds.has(String(other?._id));

        return (
          <button
            key={chat._id}
            onClick={() => onSelect(chat)}
            className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bolt-50 dark:hover:bg-ink-800 ${
              activeChatId === chat._id ? 'bg-bolt-50 dark:bg-ink-800' : ''
            }`}
          >
            <div className="relative shrink-0">
              <img
                src={chat.groupAvatar?.url || other?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${avatarSeed}`}
                alt=""
                className="h-11 w-11 rounded-full object-cover"
              />
              {isOnline && <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-mint border-2 border-white dark:border-ink-900" />}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold truncate">{name}</p>
              <p className="text-xs text-ink-700/50 dark:text-cream/40 truncate">
                {chat.lastMessage?.contentType === 'text'
                  ? chat.lastMessage?.text
                  : chat.lastMessage
                  ? `[${chat.lastMessage?.contentType}]`
                  : 'No messages yet'}
              </p>
            </div>
            {chat.unreadCount > 0 && (
              <span className="shrink-0 rounded-full bg-bolt-500 text-white text-xs font-semibold px-2 py-0.5">
                {chat.unreadCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ChatList;
