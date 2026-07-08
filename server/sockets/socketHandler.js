const { verifyToken } = require('../utils/token');
const User = require('../models/User');
const Chat = require('../models/Chat');

// In-memory map of userId -> Set of socket ids (supports multiple devices/tabs)
const onlineUsers = new Map();

const isUserOnline = (userId) => onlineUsers.has(String(userId)) && onlineUsers.get(String(userId)).size > 0;

const getOnlineUserIds = () => Array.from(onlineUsers.keys());

const initSocket = (io) => {
  // Authenticate socket connections using the JWT access token
  io.use((socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.split(' ')[1];

      if (!token) return next(new Error('Authentication required.'));

      const decoded = verifyToken(token);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token.'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = String(socket.userId);

    // Track presence
    if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
    onlineUsers.get(userId).add(socket.id);

    await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

    // Join a personal room (for notifications/messages targeted at this user)
    socket.join(`user:${userId}`);

    // Join all chat rooms this user belongs to
    const chats = await Chat.find({ participants: userId }).select('_id');
    chats.forEach((chat) => socket.join(`chat:${chat._id}`));

    // Broadcast presence update
    io.emit('presence:update', { userId, isOnline: true });

    /**
     * Join a specific chat room (e.g. when opening a conversation)
     */
    socket.on('chat:join', (chatId) => {
      socket.join(`chat:${chatId}`);
    });

    socket.on('chat:leave', (chatId) => {
      socket.leave(`chat:${chatId}`);
    });

    /**
     * Typing indicators
     */
    socket.on('typing:start', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId, isTyping: true });
    });

    socket.on('typing:stop', ({ chatId }) => {
      socket.to(`chat:${chatId}`).emit('typing:update', { chatId, userId, isTyping: false });
    });

    /**
     * Read receipts
     */
    socket.on('message:read', ({ chatId, messageIds }) => {
      socket.to(`chat:${chatId}`).emit('message:read_receipt', { chatId, messageIds, readerId: userId });
    });

    /**
     * Disconnect - update presence
     */
    socket.on('disconnect', async () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
          io.emit('presence:update', { userId, isOnline: false, lastSeen: new Date() });
        }
      }
    });
  });
};

module.exports = { initSocket, isUserOnline, getOnlineUserIds, onlineUsers };
