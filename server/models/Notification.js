const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    type: {
      type: String,
      enum: [
        'like',
        'comment',
        'share',
        'friend_request',
        'friend_request_accepted',
        'message',
        'verification_update',
        'content_flagged',
        'system',
      ],
      required: true,
    },

    text: { type: String, required: true, maxlength: 300 },

    // Optional polymorphic reference
    relatedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    relatedReel: { type: mongoose.Schema.Types.ObjectId, ref: 'Reel', default: null },
    relatedChat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', default: null },

    isRead: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', NotificationSchema);
