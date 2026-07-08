const mongoose = require('mongoose');

const ReelCommentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const ReelSchema = new mongoose.Schema(
  {
    creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    video: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      duration: { type: Number, default: 0 }, // seconds
      thumbnailUrl: { type: String, default: '' },
    },

    caption: { type: String, maxlength: 500, default: '' },
    audioLabel: { type: String, default: 'Original Audio' },
    hashtags: [{ type: String, lowercase: true, index: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [ReelCommentSchema],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    views: { type: Number, default: 0 },

    moderation: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'rejected'],
        default: 'pending',
        index: true,
      },
      isPositive: { type: Boolean, default: true },
      reasons: [{ type: String }],
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

ReelSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Reel', ReelSchema);
