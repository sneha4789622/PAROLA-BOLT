const mongoose = require('mongoose');

const FeedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['general', 'feature_request', 'rating'],
      default: 'general',
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    title: { type: String, maxlength: 200, default: '' },
    description: { type: String, required: true, maxlength: 3000 },
    status: {
      type: String,
      enum: ['received', 'under_review', 'planned', 'completed', 'declined'],
      default: 'received',
    },
  },
  { timestamps: true }
);

const BugReportSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    description: { type: String, required: true, maxlength: 3000 },
    deviceInfo: { type: String, maxlength: 500, default: '' },
    browserInfo: { type: String, maxlength: 300, default: '' },
    screenshot: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['reported', 'confirmed', 'in_progress', 'fixed', 'wont_fix'],
      default: 'reported',
    },
  },
  { timestamps: true }
);

module.exports = {
  Feedback: mongoose.model('Feedback', FeedbackSchema),
  BugReport: mongoose.model('BugReport', BugReportSchema),
};
