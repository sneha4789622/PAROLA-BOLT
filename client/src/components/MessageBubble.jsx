import { Check, CheckCheck, MessageSquareWarning } from 'lucide-react';
import api from '../api/axios';

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

const MessageBubble = ({ message, isMine, isRead }) => {
  const react = async (emoji) => {
    try {
      await api.put(`/chats/messages/${message._id}/react`, { emoji });
    } catch {
      // ignore
    }
  };

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className="max-w-[75%]">
        <div
          className={`rounded-2xl px-3.5 py-2 text-sm relative ${
            isMine ? 'bg-bolt-500 text-white rounded-br-md' : 'bg-bolt-50 dark:bg-ink-800 rounded-bl-md'
          }`}
        >
          {message.contentType === 'text' && <p className="whitespace-pre-wrap">{message.text}</p>}
          {message.contentType === 'image' && <img src={message.media?.url} alt="" className="rounded-lg max-w-xs" />}
          {message.contentType === 'video' && <video src={message.media?.url} controls className="rounded-lg max-w-xs" />}
          {(message.contentType === 'audio' || message.contentType === 'voice_note') && (
            <audio src={message.media?.url} controls className="max-w-[200px]" />
          )}
          {message.contentType === 'file' && (
            <a href={message.media?.url} target="_blank" rel="noreferrer" className="underline text-sm">
              Download file
            </a>
          )}

          {/* Reactions */}
          {message.reactions?.length > 0 && (
            <div className="absolute -bottom-3 right-1 flex gap-0.5 rounded-full bg-white dark:bg-ink-900 border border-bolt-100 dark:border-ink-700 px-1 text-xs shadow">
              {message.reactions.map((r, i) => (
                <span key={i}>{r.emoji}</span>
              ))}
            </div>
          )}

          {/* Quick reaction picker on hover */}
          <div className="absolute -top-8 right-0 hidden group-hover:flex gap-1 rounded-full bg-white dark:bg-ink-900 border border-bolt-100 dark:border-ink-700 px-1.5 py-0.5 shadow">
            {REACTION_EMOJIS.map((emoji) => (
              <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition-transform">
                {emoji}
              </button>
            ))}
          </div>
        </div>

        <div className={`mt-1 flex items-center gap-1 text-[11px] text-ink-700/40 dark:text-cream/30 ${isMine ? 'justify-end' : ''}`}>
          <span>{new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>

          {message.deliveryChannel === 'sms_fallback' && (
            <span className="flex items-center gap-0.5 text-amber-dark dark:text-amber" title="Delivered via SMS fallback">
              <MessageSquareWarning size={11} />
              SMS {message.smsFallback?.status}
            </span>
          )}

          {isMine && message.deliveryChannel !== 'sms_fallback' && (
            isRead ? <CheckCheck size={13} className="text-mint" /> : <Check size={13} />
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
