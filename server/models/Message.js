const mongoose = require('mongoose');

const ReactionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    emoji: { type: String, required: true },
  },
  { _id: false }
);

const MessageSchema = new mongoose.Schema(
  {
    chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    contentType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'voice_note', 'file'],
      default: 'text',
    },
    text: { type: String, maxlength: 5000, default: '' },
    media: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
      duration: { type: Number, default: 0 }, // for voice notes
    },

    reactions: [ReactionSchema],

    // Delivery / read tracking
    deliveredTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    readBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Offline / SMS fallback tracking
    deliveryChannel: {
      type: String,
      enum: ['online', 'sms_fallback'],
      default: 'online',
    },
    smsFallback: {
      attempted: { type: Boolean, default: false },
      status: {
        type: String,
        enum: ['none', 'queued', 'sent', 'delivered', 'failed'],
        default: 'none',
      },
      simulatedAt: { type: Date, default: null },
    },

    isDeleted: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    editedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

MessageSchema.index({ chat: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
