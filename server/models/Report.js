const mongoose = require('mongoose');

const ReportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    targetType: {
      type: String,
      enum: ['post', 'reel', 'comment', 'user', 'message'],
      required: true,
    },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },

    reason: {
      type: String,
      enum: [
        'spam',
        'hate_speech',
        'harassment',
        'nudity',
        'violence',
        'misinformation',
        'fake_account',
        'other',
      ],
      required: true,
    },
    details: { type: String, maxlength: 500, default: '' },

    status: {
      type: String,
      enum: ['pending', 'reviewed', 'action_taken', 'dismissed'],
      default: 'pending',
      index: true,
    },

    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
    actionTaken: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Report', ReportSchema);
