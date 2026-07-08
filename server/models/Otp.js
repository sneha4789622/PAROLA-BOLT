const mongoose = require('mongoose');
const crypto = require('crypto');

const OtpSchema = new mongoose.Schema(
  {
    // Who this OTP belongs to (can be email or mobile)
    identifier: { type: String, required: true, lowercase: true, trim: true },
    identifierType: { type: String, enum: ['email', 'mobile'], required: true },

    // Hashed OTP (never store plain OTP)
    otpHash: { type: String, required: true, select: false },

    purpose: {
      type: String,
      enum: ['login', 'forgot_password', 'verify_email', 'verify_mobile'],
      required: true,
    },

    // Link to user if known
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },

    // Attempt tracking (brute force protection)
    attempts: { type: Number, default: 0 },
    maxAttempts: { type: Number, default: 5 },
  },
  { timestamps: true }
);

// Auto-delete expired OTPs
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ identifier: 1, purpose: 1 });

OtpSchema.statics.hashOtp = (plainOtp) => {
  return crypto.createHash('sha256').update(String(plainOtp)).digest('hex');
};

OtpSchema.methods.verify = function (plainOtp) {
  const hash = crypto.createHash('sha256').update(String(plainOtp)).digest('hex');
  return hash === this.otpHash;
};

OtpSchema.methods.isExpired = function () {
  return new Date() > this.expiresAt;
};

OtpSchema.methods.isMaxAttemptsReached = function () {
  return this.attempts >= this.maxAttempts;
};

module.exports = mongoose.model('Otp', OtpSchema);
