const Chat = require('../models/Chat');
const Message = require('../models/Message');
const { isUserOnline } = require('../sockets/socketHandler');
const { sendSimulatedSMS, simulateDeliveryConfirmation } = require('../utils/smsFallback');
const { analyzeText } = require('../utils/contentModeration');

/**
 * GET /api/chats/:chatId/messages?page=1&limit=30
 */
const getMessages = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });
    if (!chat.participants.some((id) => String(id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this chat.' });
    }

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 30, 50);
    const skip = (page - 1) * limit;

    const messages = await Message.find({ chat: chat._id, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('sender', 'username fullName avatar');

    res.status(200).json({ success: true, page, messages: messages.reverse() });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/chats/:chatId/messages  (multipart for media/voice notes)
 * Body: { text?, contentType? }
 *
 * Implements the "Offline Messaging" feature: if the recipient(s) are
 * not currently connected via Socket.IO, the message is additionally
 * routed through the simulated SMS fallback channel.
 */
const sendMessage = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId).populate('participants', 'mobileNumber username');
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });
    if (!chat.participants.some((p) => String(p._id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'You are not a participant in this chat.' });
    }

    const { text = '', contentType = 'text' } = req.body;

    if (contentType === 'text') {
      const analysis = analyzeText(text);
      if (analysis.status === 'rejected') {
        return res.status(400).json({ success: false, message: 'Message blocked: contains offensive language or spam.' });
      }
    }

    const media = req.file ? { url: req.file.path, publicId: req.file.filename } : undefined;

    const message = await Message.create({
      chat: chat._id,
      sender: req.user._id,
      contentType,
      text,
      media,
      deliveredTo: [req.user._id],
      readBy: [req.user._id],
    });

    // Determine recipients
    const recipients = chat.participants.filter((p) => String(p._id) !== String(req.user._id));
    const anyOffline = recipients.some((p) => !isUserOnline(p._id));

    if (anyOffline) {
      message.deliveryChannel = 'sms_fallback';
      message.smsFallback.attempted = true;
      message.smsFallback.status = 'queued';

      // Simulate sending SMS to each offline recipient
      for (const recipient of recipients) {
        if (!isUserOnline(recipient._id)) {
          await sendSimulatedSMS({
            toMobileNumber: recipient.mobileNumber,
            body: text || `[${contentType}] New message on Parola Bolt from ${req.user.username}`,
          });
        }
      }
      message.smsFallback.status = 'sent';
    }

    await message.save();

    chat.lastMessage = message._id;
    // Increment unread counts for recipients
    recipients.forEach((p) => {
      const current = chat.unreadCounts.get(String(p._id)) || 0;
      chat.unreadCounts.set(String(p._id), current + 1);
    });
    await chat.save();

    const populated = await message.populate('sender', 'username fullName avatar');

    // Broadcast via socket (handled in route layer via req.io)
    if (req.io) {
      req.io.to(`chat:${chat._id}`).emit('message:new', populated);
      if (anyOffline) {
        req.io.to(`chat:${chat._id}`).emit('message:sms_status_update', {
          messageId: message._id,
          status: 'sent',
        });
        simulateDeliveryConfirmation(message, req.io);
      }
    }

    res.status(201).json({ success: true, message: populated, deliveryChannel: message.deliveryChannel });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/messages/:messageId/react
 * Body: { emoji }
 */
const reactToMessage = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ success: false, message: 'Emoji is required.' });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ success: false, message: 'Message not found.' });

    const existingIndex = message.reactions.findIndex((r) => String(r.user) === String(req.user._id));
    if (existingIndex !== -1) {
      if (message.reactions[existingIndex].emoji === emoji) {
        message.reactions.splice(existingIndex, 1); // toggle off
      } else {
        message.reactions[existingIndex].emoji = emoji;
      }
    } else {
      message.reactions.push({ user: req.user._id, emoji });
    }

    await message.save();

    if (req.io) {
      req.io.to(`chat:${message.chat}`).emit('message:reaction_update', {
        messageId: message._id,
        reactions: message.reactions,
      });
    }

    res.status(200).json({ success: true, reactions: message.reactions });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/chats/:chatId/read
 * Marks all messages in a chat as read by the current user and resets unread count.
 */
const markChatAsRead = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat) return res.status(404).json({ success: false, message: 'Chat not found.' });

    await Message.updateMany(
      { chat: chat._id, readBy: { $ne: req.user._id } },
      { $addToSet: { readBy: req.user._id, deliveredTo: req.user._id } }
    );

    chat.unreadCounts.set(String(req.user._id), 0);
    await chat.save();

    if (req.io) {
      req.io.to(`chat:${chat._id}`).emit('message:read_receipt', { chatId: chat._id, readerId: req.user._id });
    }

    res.status(200).json({ success: true, message: 'Chat marked as read.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getMessages, sendMessage, reactToMessage, markChatAsRead };
