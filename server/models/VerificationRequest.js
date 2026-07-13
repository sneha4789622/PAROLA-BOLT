const mongoose = require('mongoose');

const VerificationRequestSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    documentType: {
      type: String,
      enum: ['government_id', 'passport', 'driving_license', 'aadhaar', 'other'],
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

    // OCR-extracted data (Aadhaar submissions only). The raw number itself
    // is never stored here — only what's safe to show an admin reviewer.
    extracted: {
      nameOnDocument: { type: String, default: '' },
      dateOfBirth: { type: Date, default: null },
      age: { type: Number, default: null },
      aadhaarNumberMasked: { type: String, default: '' },
      ocrConfident: { type: Boolean, default: false }, // false = OCR couldn't read it clearly
    },
    // true if the age/duplicate check auto-decided this without a human reviewer
    autoDecision: { type: Boolean, default: false },

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
