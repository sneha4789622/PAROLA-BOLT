const User = require('../models/User');
const Otp = require('../models/Otp');
const { generateOtp, sendOtpEmail, sendOtpSms } = require('../utils/emailService');
const { generateAccessToken, generateRefreshToken } = require('../utils/token');
const { normalizeMobile } = require('../utils/phoneUtils');

const OTP_EXPIRY_MINUTES = 5;
const IS_DEV = process.env.NODE_ENV !== 'production';

const setTokenCookie = (res, token) => {
  const days = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 7;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};

/**
 * Normalize an identifier based on its type before using it for
 * lookups or as the OTP record key. Email -> lowercase/trim.
 * Mobile -> strip formatting (spaces/dashes/parens) so "+91 987..."
 * and "+919876543210" resolve to the same OTP record / user.
 */
const normalizeIdentifier = (identifier, identifierType) => {
  if (identifierType === 'mobile') return normalizeMobile(identifier);
  return String(identifier).toLowerCase().trim();
};

/**
 * Internal helper — generate, hash, store, and send OTP.
 * Returns the plain OTP in development so the controller can expose it.
 */
const issueOtp = async ({ identifier, identifierType, purpose, userId = null, fullName = '' }) => {
  const normalized = normalizeIdentifier(identifier, identifierType);

  // Invalidate previous unused OTPs for same identifier+purpose
  await Otp.deleteMany({ identifier: normalized, purpose, isUsed: false });

  const plain = generateOtp();
  const otpHash = Otp.hashOtp(plain);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await Otp.create({ identifier: normalized, identifierType, otpHash, purpose, userId, expiresAt });

  let result;
  if (identifierType === 'email') {
    result = await sendOtpEmail({ to: identifier, otp: plain, purpose, fullName });
  } else {
    result = await sendOtpSms({ to: normalized, otp: plain, purpose });
  }

  // If simulated (dev mode), return the plain OTP so API response can include it
  return result?.simulated ? plain : null;
};

/**
 * Find a user by email or mobile, applying the SAME normalization used
 * when the value was stored, so formatting differences never cause a
 * false "user not found".
 */
const findUserByIdentifier = (identifier, identifierType) => {
  if (identifierType === 'mobile') {
    return User.findOne({ mobileNumber: normalizeMobile(identifier) });
  }
  return User.findOne({ email: String(identifier).toLowerCase().trim() });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/send
// ─────────────────────────────────────────────────────────────────────────────
const sendLoginOtp = async (req, res, next) => {
  try {
    const { identifier, identifierType = 'email' } = req.body;
    if (!identifier || !String(identifier).trim()) {
      return res.status(400).json({ success: false, message: 'Email ya mobile number required hai.' });
    }

    // Basic mobile format sanity check (after normalization)
    if (identifierType === 'mobile') {
      const normalized = normalizeMobile(identifier);
      if (normalized.replace(/\D/g, '').length < 7) {
        return res.status(400).json({ success: false, message: 'Mobile number invalid hai. Country code ke saath poora number daalo (e.g. +919876543210).' });
      }
    }

    const user = await findUserByIdentifier(identifier, identifierType);

    if (!user) {
      // Don't leak whether account exists — same generic response either way
      return res.status(200).json({
        success: true,
        message: `OTP bheja gaya — agar is ${identifierType === 'email' ? 'email' : 'mobile number'} pe account hai toh.`,
      });
    }

    const devOtp = await issueOtp({
      identifier: identifierType === 'email' ? user.email : user.mobileNumber,
      identifierType,
      purpose: 'login',
      userId: user._id,
      fullName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: `OTP bheja gaya aapke ${identifierType === 'email' ? 'email' : 'mobile number'} pe. ${OTP_EXPIRY_MINUTES} minutes mein expire hoga.`,
      // Dev mode: OTP directly in response (easy testing without SMS/email setup)
      ...(IS_DEV && devOtp && {
        devOtp,
        devNote: '⚠️ DEV MODE ONLY — yeh field production mein nahi aayega. Email/SMS provider setup karo real OTP ke liye.',
      }),
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/verify-login
// ─────────────────────────────────────────────────────────────────────────────
const verifyLoginOtp = async (req, res, next) => {
  try {
    const { identifier, identifierType = 'email', otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier aur OTP dono required hain.' });
    }

    const normalized = normalizeIdentifier(identifier, identifierType);

    const record = await Otp.findOne({
      identifier: normalized,
      purpose: 'login',
      isUsed: false,
    }).select('+otpHash');

    if (!record) {
      return res.status(400).json({ success: false, message: 'Koi active OTP nahi mila. Naya OTP request karo.' });
    }

    record.attempts += 1;

    if (record.isMaxAttemptsReached()) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'Zyada galat attempts. Naya OTP mangao.' });
    }

    if (record.isExpired()) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'OTP expire ho gaya. Naya OTP mangao.' });
    }

    if (!record.verify(otp)) {
      await record.save();
      const remaining = record.maxAttempts - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Galat OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} baaki hain.`,
      });
    }

    record.isUsed = true;
    await record.save();

    const user = await findUserByIdentifier(identifier, identifierType);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User nahi mila.' });
    }

    if (!user.biometric.isRegistered) {
      const pendingToken = generateAccessToken(user._id, 'pending_biometric');
      return res.status(403).json({
        success: false,
        message: 'Biometric verification required hai.',
        pendingToken,
        nextStep: 'biometric_verification',
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    setTokenCookie(res, accessToken);

    return res.status(200).json({
      success: true,
      message: 'OTP verified! Login successful.',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/resend
// ─────────────────────────────────────────────────────────────────────────────
const resendOtp = async (req, res, next) => {
  try {
    const { identifier, identifierType = 'email', purpose = 'login' } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Identifier required hai.' });

    const normalized = normalizeIdentifier(identifier, identifierType);

    // Prevent spam — min 60 second gap
    const recent = await Otp.findOne({
      identifier: normalized,
      purpose,
      isUsed: false,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recent) {
      const waitSeconds = Math.ceil((recent.createdAt.getTime() + 60000 - Date.now()) / 1000);
      return res.status(429).json({
        success: false,
        message: `${waitSeconds} second baad try karo.`,
        waitSeconds,
      });
    }

    const user = await findUserByIdentifier(identifier, identifierType);

    if (!user) {
      return res.status(200).json({ success: true, message: 'Agar account hai toh OTP bheja gaya.' });
    }

    const devOtp = await issueOtp({
      identifier: identifierType === 'email' ? user.email : user.mobileNumber,
      identifierType,
      purpose,
      userId: user._id,
      fullName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: `Naya OTP bheja gaya. ${OTP_EXPIRY_MINUTES} minutes mein expire hoga.`,
      ...(IS_DEV && devOtp && { devOtp, devNote: '⚠️ DEV MODE ONLY' }),
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/forgot-password/send
// ─────────────────────────────────────────────────────────────────────────────
const forgotPasswordSendOtp = async (req, res, next) => {
  try {
    const { identifier, identifierType = 'email' } = req.body;
    if (!identifier) return res.status(400).json({ success: false, message: 'Email ya mobile required hai.' });

    const user = await findUserByIdentifier(identifier, identifierType);

    const genericMsg = `Password reset OTP bheja gaya — agar is ${identifierType === 'email' ? 'email' : 'mobile number'} pe account hai toh.`;
    if (!user) return res.status(200).json({ success: true, message: genericMsg });

    const devOtp = await issueOtp({
      identifier: identifierType === 'email' ? user.email : user.mobileNumber,
      identifierType,
      purpose: 'forgot_password',
      userId: user._id,
      fullName: user.fullName,
    });

    return res.status(200).json({
      success: true,
      message: genericMsg,
      ...(IS_DEV && devOtp && { devOtp, devNote: '⚠️ DEV MODE ONLY — email/SMS setup karo real OTP ke liye.' }),
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/forgot-password/verify
// ─────────────────────────────────────────────────────────────────────────────
const forgotPasswordVerifyOtp = async (req, res, next) => {
  try {
    const { identifier, identifierType = 'email', otp } = req.body;
    if (!identifier || !otp) {
      return res.status(400).json({ success: false, message: 'Identifier aur OTP required hain.' });
    }

    const normalized = normalizeIdentifier(identifier, identifierType);

    const record = await Otp.findOne({
      identifier: normalized,
      purpose: 'forgot_password',
      isUsed: false,
    }).select('+otpHash');

    if (!record) return res.status(400).json({ success: false, message: 'Koi active password reset OTP nahi mila.' });

    record.attempts += 1;

    if (record.isExpired()) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'OTP expire ho gaya. Dobara try karo.' });
    }

    if (record.isMaxAttemptsReached()) {
      await record.deleteOne();
      return res.status(400).json({ success: false, message: 'Zyada galat attempts. Dobara start karo.' });
    }

    if (!record.verify(otp)) {
      await record.save();
      const remaining = record.maxAttempts - record.attempts;
      return res.status(400).json({
        success: false,
        message: `Galat OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} baaki hain.`,
      });
    }

    record.isUsed = true;
    await record.save();

    const jwt = require('jsonwebtoken');
    const resetToken = jwt.sign(
      { id: record.userId, purpose: 'password_reset' },
      process.env.JWT_SECRET,
      { expiresIn: '10m' }
    );

    return res.status(200).json({
      success: true,
      message: 'OTP verified! Ab naya password set karo.',
      resetToken,
    });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/otp/forgot-password/reset
// ─────────────────────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { resetToken, newPassword, confirmPassword } = req.body;
    if (!resetToken || !newPassword) {
      return res.status(400).json({ success: false, message: 'Reset token aur naya password required hain.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords match nahi kar rahe.' });
    }

    const { validatePassword } = require('../middleware/validation');
    const errors = validatePassword(newPassword);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });

    const jwt = require('jsonwebtoken');
    let decoded;
    try {
      decoded = jwt.verify(resetToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ success: false, message: 'Reset token expire ho gaya ya invalid hai. Dobara start karo.' });
    }

    if (decoded.purpose !== 'password_reset') {
      return res.status(400).json({ success: false, message: 'Invalid reset token.' });
    }

    const user = await User.findById(decoded.id);
    if (!user) return res.status(404).json({ success: false, message: 'User nahi mila.' });

    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password reset ho gaya! Ab naye password se login karo.',
    });
  } catch (err) { next(err); }
};

module.exports = {
  sendLoginOtp,
  verifyLoginOtp,
  resendOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
};
