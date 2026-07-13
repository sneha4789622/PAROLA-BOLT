const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const {
  isValidDescriptor,
  encryptDescriptor,
  findClosestFaceMatch,
  matchesUserFace,
  generateDeviceFingerprint,
} = require('../utils/biometric');
const { calculateAge } = require('../middleware/validation');
const { normalizeMobile } = require('../utils/phoneUtils');

const FACE_LOCKOUT_MINUTES = 15;
const MAX_FACE_ATTEMPTS = 3;

const setTokenCookie = (res, token) => {
  const days = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 7;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000,
  });
};

const issueSession = async (res, user) => {
  const accessToken = generateAccessToken(user._id, user.role);
  const refreshToken = generateRefreshToken(user._id);
  user.refreshTokens = user.refreshTokens.slice(-4); // keep max 5
  user.refreshTokens.push(refreshToken);
  user.isOnline = true;
  user.lastSeen = new Date();
  await user.save();
  setTokenCookie(res, accessToken);
  return { accessToken, refreshToken };
};

/** POST /api/auth/signup */
const signup = async (req, res, next) => {
  try {
    const { fullName, username, email, mobileNumber, dateOfBirth, password } = req.body;
    const normalizedMobile = normalizeMobile(mobileNumber);

    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      return res.status(403).json({
        success: false,
        message: 'Signup rejected: Parola Bolt requires all users to be 18 years or older.',
      });
    }

    const existing = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: username.toLowerCase() }, { mobileNumber: normalizedMobile }],
    });
    if (existing) {
      let field = 'account';
      if (existing.email === email.toLowerCase()) field = 'email';
      else if (existing.username === username.toLowerCase()) field = 'username';
      else if (existing.mobileNumber === normalizedMobile) field = 'mobile number';
      return res.status(409).json({ success: false, message: `This ${field} is already registered.` });
    }

    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      mobileNumber: normalizedMobile,
      dateOfBirth,
      password,
      isAgeVerified: true,
      verificationStatus: 'unverified',
    });

    const pendingToken = generateAccessToken(user._id, 'pending_biometric');

    res.status(201).json({
      success: true,
      message: 'Account created. Please complete one-time biometric verification to continue.',
      pendingToken,
      userId: user._id,
      nextStep: 'biometric_verification',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/biometric/register
 * One-time enrollment (signup flow). Expects:
 *   - faceDescriptor: number[128]  (from face-api.js, captured on-device)
 *   - livenessPassed: boolean      (client-side blink/liveness check result)
 *   - deviceFingerprint?: string
 */
const registerBiometric = async (req, res, next) => {
  try {
    const { faceDescriptor, livenessPassed } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select('+biometric.faceDescriptor');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.biometric.isRegistered) {
      // Already registered — just issue tokens so they can proceed
      const { accessToken, refreshToken } = await issueSession(res, user);
      return res.status(200).json({
        success: true,
        message: 'Biometric already registered. Welcome back!',
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      });
    }

    if (!livenessPassed) {
      return res.status(400).json({
        success: false,
        message: 'Liveness check did not complete. Please hold still in frame and try again.',
      });
    }

    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Could not read a valid face capture. Please retry the scan in good lighting.',
      });
    }

    const deviceFingerprint = req.body.deviceFingerprint || generateDeviceFingerprint(req);

    // Compare against every other registered face — reject duplicates
    const duplicate = await findClosestFaceMatch(User, faceDescriptor, user._id);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This face is already registered with another Parola Bolt account.',
      });
    }

    user.biometric = {
      isRegistered: true,
      deviceFingerprint,
      faceDescriptor: encryptDescriptor(faceDescriptor),
      registeredAt: new Date(),
      livenessVerifiedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
    };

    const { accessToken, refreshToken } = await issueSession(res, user);

    res.status(200).json({
      success: true,
      message: 'Biometric verification complete. Welcome to Parola Bolt!',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/login */
const login = async (req, res, next) => {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier.toLowerCase() },
        { mobileNumber: normalizeMobile(identifier) },
      ],
    }).select('+password');

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials.' });
    }

    // Admin and seed/demo accounts skip biometric verification entirely
    const isExempt = user.biometric.exempt || user.role === 'admin';
    if (isExempt) {
      const { accessToken, refreshToken } = await issueSession(res, user);
      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      });
    }

    if (!user.biometric.isRegistered) {
      const pendingToken = generateAccessToken(user._id, 'pending_biometric');
      return res.status(403).json({
        success: false,
        message: 'Biometric verification has not been completed for this account.',
        pendingToken,
        nextStep: 'biometric_verification',
      });
    }

    // Face verification lockout check
    if (user.biometric.lockedUntil && user.biometric.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.biometric.lockedUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Too many failed verification attempts. Please try again after ${minutesLeft} minute(s) or use account recovery.`,
      });
    }

    // Credentials are correct — do NOT log in yet. Require a live Face ID
    // match against this specific account before issuing session tokens.
    const pendingToken = generateAccessToken(user._id, 'pending_face_verification');
    return res.status(200).json({
      success: true,
      message: 'Credentials verified. Please complete Face ID verification to continue.',
      pendingToken,
      nextStep: 'face_verification',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/biometric/verify
 * Login-time face verification AGAINST A KNOWN ACCOUNT (password already
 * validated by /login). Requires the pendingToken issued by /login.
 * Enforces max 3 attempts, then a 15-minute lockout.
 */
const verifyFaceLogin = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId).select('+biometric.faceDescriptor');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.biometric.lockedUntil && user.biometric.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.biometric.lockedUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Too many failed verification attempts. Please try again after ${minutesLeft} minute(s) or use account recovery.`,
      });
    }

    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Could not read a valid face capture. Please retry the scan in good lighting.',
      });
    }

    const { match } = matchesUserFace(faceDescriptor, user.biometric.faceDescriptor);

    if (!match) {
      user.biometric.failedAttempts = (user.biometric.failedAttempts || 0) + 1;

      if (user.biometric.failedAttempts >= MAX_FACE_ATTEMPTS) {
        user.biometric.lockedUntil = new Date(Date.now() + FACE_LOCKOUT_MINUTES * 60 * 1000);
        user.biometric.failedAttempts = 0;
        await user.save();
        return res.status(403).json({
          success: false,
          message: `Too many failed verification attempts. Please try again after ${FACE_LOCKOUT_MINUTES} minutes or use account recovery.`,
        });
      }

      await user.save();
      return res.status(401).json({
        success: false,
        message: 'Face verification failed. Please try again.',
        attemptsRemaining: MAX_FACE_ATTEMPTS - user.biometric.failedAttempts,
      });
    }

    // Success — reset attempt counter and issue the real session
    user.biometric.failedAttempts = 0;
    user.biometric.lockedUntil = null;
    const { accessToken, refreshToken } = await issueSession(res, user);

    res.status(200).json({
      success: true,
      message: 'Face verified. Login successful.',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/auth/biometric/login
 * "Face ID" quick-login button (no identifier typed first). Scans all
 * registered faces to find whose account matches the live capture.
 */
const biometricLogin = async (req, res, next) => {
  try {
    const { faceDescriptor } = req.body;

    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Could not read a valid face capture. Please retry the scan in good lighting.',
      });
    }

    const bestMatch = await findClosestFaceMatch(User, faceDescriptor);
    if (!bestMatch) {
      return res.status(401).json({ success: false, message: 'Biometric login failed. No matching identity found.' });
    }

    const user = bestMatch.user;

    if (user.biometric.lockedUntil && user.biometric.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.biometric.lockedUntil - new Date()) / 60000);
      return res.status(403).json({
        success: false,
        message: `Too many failed verification attempts. Please try again after ${minutesLeft} minute(s) or use account recovery.`,
      });
    }

    const { accessToken, refreshToken } = await issueSession(res, user);

    res.status(200).json({
      success: true,
      message: 'Biometric login successful.',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/refresh */
const refreshAccessToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
        code: 'NO_REFRESH_TOKEN',
      });
    }

    // Verify the token signature + expiry
    let decoded;
    try {
      decoded = verifyToken(refreshToken);
    } catch (tokenErr) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'REFRESH_TOKEN_EXPIRED',
      });
    }

    const user = await User.findById(decoded.id);

    // Token not in user's whitelist (old seed / already used / logged out)
    if (!user || !user.refreshTokens.includes(refreshToken)) {
      if (user) {
        user.refreshTokens = []; // wipe all stale tokens
        await user.save();
      }
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please log in again.',
        code: 'REFRESH_TOKEN_INVALID',
      });
    }

    // Rotate: remove old, issue new
    const newRefreshToken = generateRefreshToken(user._id);
    user.refreshTokens = user.refreshTokens
      .filter((t) => t !== refreshToken)
      .concat(newRefreshToken);
    await user.save();

    const accessToken = generateAccessToken(user._id, user.role);
    setTokenCookie(res, accessToken);

    res.status(200).json({ success: true, accessToken, refreshToken: newRefreshToken });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/logout */
const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const user = req.user;

    if (refreshToken && user) {
      user.refreshTokens = user.refreshTokens.filter((t) => t !== refreshToken);
    }
    if (user) {
      user.isOnline = false;
      user.lastSeen = new Date();
      await user.save();
    }

    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

/** GET /api/auth/me */
const getMe = async (req, res, next) => {
  try {
    res.status(200).json({ success: true, user: req.user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/auth/biometric/re-register
 * For an ALREADY LOGGED-IN user (protect middleware required).
 * Overwrites the existing face descriptor — used when:
 *   - User switched devices/browsers
 *   - User wants to refresh their Face ID registration
 * Unlike registerBiometric (signup flow), this does NOT block on isRegistered=true.
 */
const reRegisterBiometric = async (req, res, next) => {
  try {
    const { faceDescriptor, livenessPassed } = req.body;
    const user = req.user; // set by protect middleware — user is already authenticated

    if (!livenessPassed) {
      return res.status(400).json({
        success: false,
        message: 'Liveness check did not complete. Please hold still in frame and try again.',
      });
    }
    if (!isValidDescriptor(faceDescriptor)) {
      return res.status(400).json({
        success: false,
        message: 'Could not read a valid face capture. Please retry the scan in good lighting.',
      });
    }

    const deviceFingerprint = req.body.deviceFingerprint || generateDeviceFingerprint(req);

    // Make sure this new face isn't already claimed by a DIFFERENT account
    const duplicate = await findClosestFaceMatch(User, faceDescriptor, user._id);
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This face is already registered with another Parola Bolt account.',
      });
    }

    user.biometric = {
      isRegistered: true,
      deviceFingerprint,
      faceDescriptor: encryptDescriptor(faceDescriptor),
      registeredAt: user.biometric?.registeredAt || new Date(),
      livenessVerifiedAt: new Date(),
      failedAttempts: 0,
      lockedUntil: null,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Biometric re-registered successfully. You can now use Face ID login on this device.',
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  signup,
  registerBiometric,
  reRegisterBiometric,
  login,
  verifyFaceLogin,
  biometricLogin,
  refreshAccessToken,
  logout,
  getMe,
};
