const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, maxlength: 500 },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  { timestamps: true }
);

const PostSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    type: {
      type: String,
      enum: ['text', 'photo', 'video', 'reel'],
      default: 'text',
      index: true,
    },

    caption: { type: String, maxlength: 2200, default: '' },
    media: [
      {
        url: String,
        publicId: String,
        mediaType: { type: String, enum: ['image', 'video'] },
      },
    ],

    hashtags: [{ type: String, lowercase: true, index: true }],

    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    comments: [CommentSchema],
    shares: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    savedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // For reels: extra engagement metrics
    views: { type: Number, default: 0 },

    // Content verification / moderation
    moderation: {
      status: {
        type: String,
        enum: ['pending', 'approved', 'flagged', 'rejected'],
        default: 'pending',
        index: true,
      },
      isPositive: { type: Boolean, default: true },
      spamScore: { type: Number, default: 0 },
      offensiveLanguageDetected: { type: Boolean, default: false },
      misinformationWarning: { type: Boolean, default: false },
      reasons: [{ type: String }],
      reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
      reviewedAt: { type: Date, default: null },
    },
  },
  { timestamps: true }
);

PostSchema.index({ caption: 'text', hashtags: 'text' });
PostSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Post', PostSchema);
