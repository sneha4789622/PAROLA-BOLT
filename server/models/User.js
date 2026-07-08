const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 60,
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: 3,
      maxlength: 30,
      match: [/^[a-z0-9._]+$/, 'Username can only contain lowercase letters, numbers, dots and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    mobileNumber: {
      type: String,
      required: [true, 'Mobile number is required'],
      unique: true,
      trim: true,
      // Auto-normalize on every set/save: strip spaces, dashes, parens —
      // keep only a leading "+" and digits. Prevents "+91 987..." vs
      // "+919876543210" from being treated as two different numbers.
      set: (v) => {
        if (!v) return v;
        const trimmed = String(v).trim();
        const hasPlus = trimmed.startsWith('+');
        const digitsOnly = trimmed.replace(/\D/g, '');
        return hasPlus ? `+${digitsOnly}` : digitsOnly;
      },
    },
    dateOfBirth: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 12,
      select: false,
    },

    // Profile
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    coverPhoto: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    bio: { type: String, maxlength: 250, default: '' },
    location: { type: String, maxlength: 100, default: '' },
    website: { type: String, maxlength: 200, default: '' },

    // Social graph
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    // Verification / trust
    isEmailVerified: { type: Boolean, default: false },
    isMobileVerified: { type: Boolean, default: false },
    isAgeVerified: { type: Boolean, default: false },
    isIdentityVerified: { type: Boolean, default: false }, // overall "verified badge"
    verificationStatus: {
      type: String,
      enum: ['unverified', 'pending', 'verified', 'rejected'],
      default: 'unverified',
    },

    // Biometric onboarding
    biometric: {
      isRegistered: { type: Boolean, default: false },
      deviceFingerprint: { type: String, default: '', index: true },
      faceTemplateHash: { type: String, default: '' }, // mock hash, never raw biometric data
      registeredAt: { type: Date, default: null },
    },

    // Role-based access control
    role: {
      type: String,
      enum: ['user', 'moderator', 'admin'],
      default: 'user',
    },
    status: {
      type: String,
      enum: ['active', 'suspended', 'banned'],
      default: 'active',
    },

    // Presence
    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },

    // Theme preference (also stored client-side, but persisted for cross-device)
    themePreference: { type: String, enum: ['light', 'dark', 'system'], default: 'system' },

    // Counters maintained for fast profile reads
    postsCount: { type: Number, default: 0 },

    // Security
    passwordChangedAt: Date,
    refreshTokens: [{ type: String }],

    // Privacy settings
    privacySettings: {
      profileVisibility: { type: String, enum: ["public","followers","private"], default: "public" },
      showOnlineStatus: { type: Boolean, default: true },
      allowMessagesFrom: { type: String, enum: ["everyone","followers","none"], default: "everyone" },
      showFollowersList: { type: Boolean, default: true },
    },

    // Notification settings
    notificationSettings: {
      likes: { type: Boolean, default: true },
      comments: { type: Boolean, default: true },
      shares: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      messages: { type: Boolean, default: true },
      systemAlerts: { type: Boolean, default: true },
      emailNotifications: { type: Boolean, default: true },
      smsNotifications: { type: Boolean, default: false },
    },
  },
  { timestamps: true }
);

// Text index for global search
UserSchema.index({ username: 'text', fullName: 'text' });
// Note: email and mobileNumber indexes are auto-created by unique:true above

// Hash password before save
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  if (!this.isNew) this.passwordChangedAt = Date.now() - 1000;
  next();
});

UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Virtual: profile completion percentage
UserSchema.methods.getProfileCompletion = function () {
  const fields = [
    this.avatar?.url,
    this.coverPhoto?.url,
    this.bio,
    this.location,
    this.website,
    this.isEmailVerified,
    this.isMobileVerified,
    this.biometric?.isRegistered,
    this.isIdentityVerified,
  ];
  const filled = fields.filter(Boolean).length;
  return Math.round((filled / fields.length) * 100);
};

// Compute age from DOB
UserSchema.methods.getAge = function () {
  const today = new Date();
  const dob = new Date(this.dateOfBirth);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
};

UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.biometric?.faceTemplateHash;
  obj.profileCompletion = this.getProfileCompletion();
  obj.followersCount = this.followers?.length || 0;
  obj.followingCount = this.following?.length || 0;
  return obj;
};

module.exports = mongoose.model('User', UserSchema);
