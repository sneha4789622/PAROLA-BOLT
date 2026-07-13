import { useEffect, useRef, useState } from 'react';
import { Send, Paperclip, Mic, Square, ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import MessageBubble from './MessageBubble';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useOfflineQueue } from '../hooks/useOfflineQueue';

const getOtherParticipant = (chat, myId) => chat.participants.find((p) => p._id !== myId);

const ChatWindow = ({ chat, onBack }) => {
  const { user } = useAuth();
  const { socket, onlineUserIds, connectionStatus, isInternetOnline } = useSocket();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [typingUser, setTypingUser] = useState(null);
  const [recording, setRecording] = useState(false);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const { enqueue } = useOfflineQueue(isInternetOnline);

  const other = chat.isGroup ? null : getOtherParticipant(chat, user._id);
  const isOtherOnline = other && onlineUserIds.has(String(other._id));

  const loadMessages = async () => {
    const { data } = await api.get(`/chats/${chat._id}/messages`);
    setMessages(data.messages);
    await api.put(`/chats/${chat._id}/read`);
  };

  useEffect(() => {
    loadMessages();
    socket?.emit('chat:join', chat._id);
    return () => socket?.emit('chat:leave', chat._id);
  }, [chat._id, socket]);

  useEffect(() => {
    if (!socket) return;

    const onNewMessage = (msg) => {
      if (msg.chat === chat._id || msg.chat?._id === chat._id) {
        setMessages((prev) => [...prev, msg]);
        api.put(`/chats/${chat._id}/read`).catch(() => {});
      }
    };
    const onTyping = ({ chatId, userId, isTyping }) => {
      if (chatId === chat._id && userId !== user._id) {
        setTypingUser(isTyping ? userId : null);
      }
    };
    const onSmsUpdate = ({ messageId, status }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, smsFallback: { ...m.smsFallback, status } } : m)));
    };
    const onReaction = ({ messageId, reactions }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, reactions } : m)));
    };
    const onEdited = (updated) => {
      setMessages((prev) => prev.map((m) => (m._id === updated._id ? updated : m)));
    };
    const onDeleted = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (m._id === messageId ? { ...m, isDeleted: true, text: '', media: {}, reactions: [] } : m))
      );
    };
    const onReadReceipt = ({ readerId }) => {
      setMessages((prev) => prev.map((m) => ({ ...m, readBy: [...new Set([...(m.readBy || []), readerId])] })));
    };

    socket.on('message:new', onNewMessage);
    socket.on('typing:update', onTyping);
    socket.on('message:sms_status_update', onSmsUpdate);
    socket.on('message:reaction_update', onReaction);
    socket.on('message:edited', onEdited);
    socket.on('message:deleted', onDeleted);
    socket.on('message:read_receipt', onReadReceipt);

    return () => {
      socket.off('message:new', onNewMessage);
      socket.off('typing:update', onTyping);
      socket.off('message:sms_status_update', onSmsUpdate);
      socket.off('message:reaction_update', onReaction);
      socket.off('message:edited', onEdited);
      socket.off('message:deleted', onDeleted);
      socket.off('message:read_receipt', onReadReceipt);
    };
  }, [socket, chat._id, user._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = (value) => {
    setText(value);
    socket?.emit('typing:start', { chatId: chat._id });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => socket?.emit('typing:stop', { chatId: chat._id }), 1500);
  };

  const sendTextMessage = async () => {
    if (!text.trim()) return;
    const messageText = text.trim();
    setText('');

    if (connectionStatus === 'sms_fallback') {
      // Offline: queue locally, will sync (and SMS-fallback) when reconnected
      enqueue(chat._id, messageText);
      setMessages((prev) => [
        ...prev,
        {
          _id: `local-${crypto.randomUUID()}`,
          chat: chat._id,
          sender: { _id: user._id, fullName: user.fullName },
          contentType: 'text',
          text: messageText,
          createdAt: new Date().toISOString(),
          deliveryChannel: 'sms_fallback',
          smsFallback: { status: 'queued' },
          readBy: [user._id],
        },
      ]);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('text', messageText);
      formData.append('contentType', 'text');
      await api.post(`/chats/${chat._id}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      alert(err.response?.data?.message || 'Could not send message.');
    }
  };

  const sendMediaMessage = async (file, contentType) => {
    try {
      const formData = new FormData();
      formData.append('media', file);
      formData.append('contentType', contentType);
      await api.post(`/chats/${chat._id}/messages`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
    } catch (err) {
      alert(err.response?.data?.message || 'Could not send media.');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const contentType = file.type.startsWith('image') ? 'image' : file.type.startsWith('video') ? 'video' : 'file';
    sendMediaMessage(file, contentType);
  };

  const toggleRecording = async () => {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        sendMediaMessage(file, 'voice_note');
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert('Microphone access is required to record a voice note.');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-bolt-100 dark:border-ink-700 px-4 py-3">
        <button onClick={onBack} className="lg:hidden text-ink-700/60 dark:text-cream/50">
          <ArrowLeft size={20} />
        </button>
        <img
          src={chat.groupAvatar?.url || other?.avatar?.url || `https://api.dicebear.com/7.x/initials/svg?seed=${chat.isGroup ? chat.name : other?.username}`}
          alt=""
          className="h-9 w-9 rounded-full object-cover"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold truncate">{chat.isGroup ? chat.name : other?.fullName}</p>
          <p className="text-xs text-ink-700/50 dark:text-cream/40">
            {typingUser ? 'Typing…' : chat.isGroup ? `${chat.participants.length} members` : isOtherOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.map((m) => (
          <MessageBubble
            key={m._id}
            message={m}
            isMine={(m.sender?._id || m.sender) === user._id}
            isRead={m.readBy?.some((id) => id !== user._id && id !== (m.sender?._id || m.sender))}
            onUpdate={(updated) => setMessages((prev) => prev.map((msg) => (msg._id === updated._id ? updated : msg)))}
            onDelete={(messageId) =>
              setMessages((prev) =>
                prev.map((msg) => (msg._id === messageId ? { ...msg, isDeleted: true, text: '', media: {}, reactions: [] } : msg))
              )
            }
          />
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer */}
      <div className="border-t border-bolt-100 dark:border-ink-700 p-3 flex items-center gap-2">
        <button onClick={() => fileInputRef.current?.click()} className="text-ink-700/50 dark:text-cream/40 hover:text-bolt-500">
          <Paperclip size={20} />
        </button>
        <input ref={fileInputRef} type="file" hidden onChange={handleFileSelect} />

        <input
          value={text}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendTextMessage()}
          placeholder="Type a message…"
          className="input-field flex-1"
        />

        <button
          onClick={toggleRecording}
          className={`rounded-full p-2 ${recording ? 'bg-red-500 text-white' : 'text-ink-700/50 dark:text-cream/40 hover:text-bolt-500'}`}
        >
          {recording ? <Square size={18} /> : <Mic size={20} />}
        </button>

        <button onClick={sendTextMessage} className="btn-primary px-3 py-2">
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;
