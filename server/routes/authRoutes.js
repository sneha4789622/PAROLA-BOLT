const express = require('express');
const router = express.Router();
const {
  signup,
  registerBiometric,
  reRegisterBiometric,
  login,
  verifyFaceLogin,
  biometricLogin,
  refreshAccessToken,
  logout,
  getMe,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { validateSignup, validateLogin } = require('../middleware/validation');
const { authLimiter } = require('../middleware/rateLimiter');

// Step 1: create account (pending biometric verification)
router.post('/signup', authLimiter, validateSignup, signup);

// Step 2: complete one-time biometric onboarding (requires pending token)
router.post('/biometric/register', protect, registerBiometric);

// Re-register / refresh Face ID for an already-logged-in user
router.put('/biometric/re-register', protect, reRegisterBiometric);

// Standard login (email / username / mobile + password) — always followed
// by a live Face ID check against the matched account before a session
// is issued (see /biometric/verify).
router.post('/login', authLimiter, validateLogin, login);

// Login-time face verification (uses the pendingToken from /login)
router.post('/biometric/verify', authLimiter, protect, verifyFaceLogin);

// Face ID quick login (no identifier typed first — matches across accounts)
router.post('/biometric/login', authLimiter, biometricLogin);

router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
