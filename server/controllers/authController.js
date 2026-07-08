const User = require('../models/User');
const { generateAccessToken, generateRefreshToken, verifyToken } = require('../utils/token');
const { hashBiometricToken, generateDeviceFingerprint } = require('../utils/biometric');
const { calculateAge } = require('../middleware/validation');
const { normalizeMobile } = require('../utils/phoneUtils');

const setTokenCookie = (res, token) => {
  const days = Number(process.env.JWT_COOKIE_EXPIRES_DAYS) || 7;
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: days * 24 * 60 * 60 * 1000,
  });
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

/** POST /api/auth/biometric/register */
const registerBiometric = async (req, res, next) => {
  try {
    const { faceCaptureToken } = req.body;
    const userId = req.user._id;

    if (!faceCaptureToken) {
      return res.status(400).json({ success: false, message: 'Face capture token is required.' });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (user.biometric.isRegistered) {
      // Already registered — just issue tokens so they can proceed
      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);
      user.refreshTokens = user.refreshTokens.slice(-4); // keep max 5
      user.refreshTokens.push(refreshToken);
      await user.save();
      setTokenCookie(res, accessToken);
      return res.status(200).json({
        success: true,
        message: 'Biometric already registered. Welcome back!',
        accessToken,
        refreshToken,
        user: user.toSafeObject(),
      });
    }

    const faceTemplateHash = hashBiometricToken(faceCaptureToken);
    const deviceFingerprint = req.body.deviceFingerprint || generateDeviceFingerprint(req);

    const duplicate = await User.findOne({
      'biometric.faceTemplateHash': faceTemplateHash,
      _id: { $ne: user._id },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This biometric identity is already linked to another account.',
      });
    }

    user.biometric = {
      isRegistered: true,
      deviceFingerprint,
      faceTemplateHash,
      registeredAt: new Date(),
    };

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens = [refreshToken];
    await user.save();

    setTokenCookie(res, accessToken);

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

    if (!user.biometric.isRegistered) {
      const pendingToken = generateAccessToken(user._id, 'pending_biometric');
      return res.status(403).json({
        success: false,
        message: 'Biometric verification has not been completed for this account.',
        pendingToken,
        nextStep: 'biometric_verification',
      });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);

    // Keep max 5 refresh tokens (multi-device), purge older ones
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    setTokenCookie(res, accessToken);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      accessToken,
      refreshToken,
      user: user.toSafeObject(),
    });
  } catch (err) {
    next(err);
  }
};

/** POST /api/auth/biometric/login */
const biometricLogin = async (req, res, next) => {
  try {
    const { faceCaptureToken } = req.body;
    if (!faceCaptureToken) {
      return res.status(400).json({ success: false, message: 'Face capture token is required.' });
    }

    const faceTemplateHash = hashBiometricToken(faceCaptureToken);
    const user = await User.findOne({ 'biometric.faceTemplateHash': faceTemplateHash });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Biometric login failed. No matching identity found.' });
    }

    const accessToken = generateAccessToken(user._id, user.role);
    const refreshToken = generateRefreshToken(user._id);
    user.refreshTokens = user.refreshTokens.slice(-4);
    user.refreshTokens.push(refreshToken);
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    setTokenCookie(res, accessToken);

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

module.exports = {
  signup,
  registerBiometric,
  reRegisterBiometric,
  login,
  biometricLogin,
  refreshAccessToken,
  logout,
  getMe,
};

/**
 * PUT /api/auth/biometric/re-register
 * For an ALREADY LOGGED-IN user (protect middleware required).
 * Overwrites the existing biometric hash — used when:
 *   - User switched devices/browsers and localStorage token was lost
 *   - User wants to refresh their Face ID registration
 * Unlike registerBiometric (signup flow), this does NOT block on isRegistered=true.
 */
async function reRegisterBiometric(req, res, next) {
  try {
    const { faceCaptureToken } = req.body;
    if (!faceCaptureToken) {
      return res.status(400).json({ success: false, message: 'Face capture token is required.' });
    }

    const user = req.user; // set by protect middleware — user is already authenticated

    const faceTemplateHash = hashBiometricToken(faceCaptureToken);
    const deviceFingerprint = req.body.deviceFingerprint || generateDeviceFingerprint(req);

    // Make sure this new biometric isn't already claimed by a DIFFERENT account
    const duplicate = await User.findOne({
      'biometric.faceTemplateHash': faceTemplateHash,
      _id: { $ne: user._id },
    });
    if (duplicate) {
      return res.status(409).json({
        success: false,
        message: 'This biometric identity is already linked to another account.',
      });
    }

    user.biometric = {
      isRegistered: true,
      deviceFingerprint,
      faceTemplateHash,
      registeredAt: new Date(),
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
}
