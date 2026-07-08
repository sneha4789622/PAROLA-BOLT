const Chat = require('../models/Chat');
const User = require('../models/User');
const Message = require('../models/Message');

/**
 * POST /api/chats  - get or create a 1:1 chat
 * Body: { userId }
 */
const getOrCreateOneToOneChat = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required.' });
    if (String(userId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot chat with yourself.' });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    let chat = await Chat.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate('participants', 'username fullName avatar isOnline lastSeen isIdentityVerified')
      .populate('lastMessage');

    if (!chat) {
      chat = await Chat.create({ isGroup: false, participants: [req.user._id, userId] });
      chat = await chat.populate('participants', 'username fullName avatar isOnline lastSeen isIdentityVerified');
    }

    res.status(200).json({ success: true, chat });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/chats/group
 * Body: { name, participantIds: [] }
 */
const createGroupChat = async (req, res, next) => {
  try {
    const { name, participantIds = [] } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Group name is required.' });
    if (!Array.isArray(participantIds) || participantIds.length < 2) {
      return res.status(400).json({ success: false, message: 'A group needs at least 2 other participants.' });
    }

    const participants = [...new Set([String(req.user._id), ...participantIds.map(String)])];

    const chat = await Chat.create({
      isGroup: true,
      name: name.trim(),
      participants,
      admins: [req.user._id],
    });

    const populated = await chat.populate('participants', 'username fullName avatar isOnline lastSeen isIdentityVerified');
    res.status(201).json({ success: true, message: 'Group created.', chat: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/chats
 * List all chats for the current user, sorted by latest activity.
 */
const getMyChats = async (req, res, next) => {
  try {
    const chats = await Chat.find({ participants: req.user._id })
      .populate('participants', 'username fullName avatar isOnline lastSeen isIdentityVerified')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });

    const chatsWithUnread = chats.map((chat) => {
      const obj = chat.toObject();
      obj.unreadCount = chat.unreadCounts?.get(String(req.user._id)) || 0;
      return obj;
    });

    res.status(200).json({ success: true, count: chats.length, chats: chatsWithUnread });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/chats/:chatId/group/add
 * Body: { userIds: [] }
 */
const addGroupMembers = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ success: false, message: 'Group not found.' });

    if (!chat.admins.some((id) => String(id) === String(req.user._id))) {
      return res.status(403).json({ success: false, message: 'Only group admins can add members.' });
    }

    const { userIds = [] } = req.body;
    userIds.forEach((id) => {
      if (!chat.participants.some((p) => String(p) === String(id))) chat.participants.push(id);
    });
    await chat.save();

    const populated = await chat.populate('participants', 'username fullName avatar isOnline lastSeen isIdentityVerified');
    res.status(200).json({ success: true, message: 'Members added.', chat: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/chats/:chatId/group/leave
 */
const leaveGroup = async (req, res, next) => {
  try {
    const chat = await Chat.findById(req.params.chatId);
    if (!chat || !chat.isGroup) return res.status(404).json({ success: false, message: 'Group not found.' });

    chat.participants = chat.participants.filter((id) => String(id) !== String(req.user._id));
    chat.admins = chat.admins.filter((id) => String(id) !== String(req.user._id));
    await chat.save();

    res.status(200).json({ success: true, message: 'You left the group.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOrCreateOneToOneChat, createGroupChat, getMyChats, addGroupMembers, leaveGroup };
