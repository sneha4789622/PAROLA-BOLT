import { useState } from 'react';
import { Check, CheckCheck, MessageSquareWarning, MoreVertical, Pencil, Trash2, X } from 'lucide-react';
import api from '../api/axios';

const REACTION_EMOJIS = ['❤️', '😂', '👍', '😮', '😢', '🙏'];

const MessageBubble = ({ message, isMine, isRead, onUpdate, onDelete }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.text);
  const [busy, setBusy] = useState(false);

  const react = async (emoji) => {
    try {
      const { data } = await api.put(`/chats/messages/${message._id}/react`, { emoji });
      onUpdate?.({ ...message, reactions: data.reactions });
    } catch {
      // ignore
    }
  };

  // Double-click/double-tap the bubble for a quick "like" (❤️) — toggles
  // off if you already liked it, same as tapping ❤️ in the picker.
  const handleDoubleClick = () => {
    if (message.isDeleted) return;
    react('❤️');
  };

  const startEdit = () => {
    setDraft(message.text);
    setEditing(true);
    setMenuOpen(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setDraft(message.text);
  };

  const saveEdit = async () => {
    if (!draft.trim() || draft.trim() === message.text) {
      setEditing(false);
      return;
    }
    setBusy(true);
    try {
      const { data } = await api.put(`/chats/messages/${message._id}`, { text: draft.trim() });
      onUpdate?.(data.message);
      setEditing(false);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not edit message.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setMenuOpen(false);
    if (!window.confirm('Delete this message for everyone?')) return;
    setBusy(true);
    try {
      await api.delete(`/chats/messages/${message._id}`);
      onDelete?.(message._id);
    } catch (err) {
      alert(err.response?.data?.message || 'Could not delete message.');
    } finally {
      setBusy(false);
    }
  };

  if (message.isDeleted) {
    return (
      <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2`}>
        <div className="max-w-[75%]">
          <div className="rounded-2xl px-3.5 py-2 text-sm italic text-ink-700/40 dark:text-cream/30 bg-bolt-50/50 dark:bg-ink-800/50 border border-dashed border-bolt-100 dark:border-ink-700">
            This message was deleted
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} mb-2 group`}>
      <div className="max-w-[75%]">
        <div
          onDoubleClick={handleDoubleClick}
          className={`rounded-2xl px-3.5 py-2 text-sm relative select-none ${
            isMine ? 'bg-bolt-500 text-white rounded-br-md' : 'bg-bolt-50 dark:bg-ink-800 rounded-bl-md'
          }`}
        >
          {editing ? (
            <div className="flex flex-col gap-2 min-w-[180px]">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); saveEdit(); }
                  if (e.key === 'Escape') cancelEdit();
                }}
                autoFocus
                rows={2}
                className="w-full rounded-lg px-2 py-1 text-sm text-ink-900 dark:text-cream bg-white/90 dark:bg-ink-900 outline-none"
              />
              <div className="flex justify-end gap-2 text-xs">
                <button onClick={cancelEdit} className="opacity-80 hover:opacity-100 flex items-center gap-0.5">
                  <X size={12} /> Cancel
                </button>
                <button onClick={saveEdit} disabled={busy} className="font-semibold flex items-center gap-0.5">
                  <Check size={12} /> Save
                </button>
              </div>
            </div>
          ) : (
            <>
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
              {message.isEdited && (
                <span className="text-[10px] opacity-60 ml-1 align-bottom">(edited)</span>
              )}
            </>
          )}

          {/* Reactions */}
          {message.reactions?.length > 0 && (
            <div className="absolute -bottom-3 right-1 flex gap-0.5 rounded-full bg-white dark:bg-ink-900 border border-bolt-100 dark:border-ink-700 px-1 text-xs shadow">
              {message.reactions.map((r, i) => (
                <span key={i}>{r.emoji}</span>
              ))}
            </div>
          )}

          {!editing && (
            <div className="absolute -top-8 right-0 hidden group-hover:flex items-center gap-1 rounded-full bg-white dark:bg-ink-900 border border-bolt-100 dark:border-ink-700 px-1.5 py-0.5 shadow">
              {/* Quick reaction picker on hover */}
              {REACTION_EMOJIS.map((emoji) => (
                <button key={emoji} onClick={() => react(emoji)} className="text-sm hover:scale-125 transition-transform">
                  {emoji}
                </button>
              ))}

              {/* Edit / delete menu — only for the sender's own messages */}
              {isMine && (
                <div className="relative">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="text-ink-700/60 dark:text-cream/50 hover:text-bolt-500 pl-1"
                  >
                    <MoreVertical size={14} />
                  </button>
                  {menuOpen && (
                    <div className="absolute right-0 top-6 z-10 w-36 rounded-xl bg-white dark:bg-ink-900 border border-bolt-100 dark:border-ink-700 shadow-lg overflow-hidden text-xs">
                      {message.contentType === 'text' && (
                        <button
                          onClick={startEdit}
                          className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bolt-50 dark:hover:bg-ink-800 text-left"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}
                      <button
                        onClick={handleDelete}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-bolt-50 dark:hover:bg-ink-800 text-left text-red-500"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
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
