const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    documentType: {
      type: String,
      enum: ['government_id', 'passport', 'driving_license', 'other'],
      required: true,
    },
    documentFront: {
      url: { type: String, required: true },
      publicId: { type: String, required: true },
    },
    documentBack: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    selfie: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
      index: true,
    },
    rejectionReason: { type: String, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('VerificationRequest', VerificationRequestSchema);
