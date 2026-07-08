const mongoose = require('mongoose');

const ChatSchema = new mongoose.Schema(
  {
    isGroup: { type: Boolean, default: false },
    name: { type: String, trim: true, maxlength: 100, default: '' }, // group name
    groupAvatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // for group chats

    lastMessage: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },

    // Per-user unread counters: { userId: count }
    unreadCounts: {
      type: Map,
      of: Number,
      default: {},
    },
  },
  { timestamps: true }
);

ChatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', ChatSchema);
