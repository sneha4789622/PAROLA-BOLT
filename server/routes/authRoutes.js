const express = require('express');
const router = express.Router();
const {
  signup,
  registerBiometric,
  login,
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

// Standard login (email / username / mobile + password)
router.post('/login', authLimiter, validateLogin, login);

// Biometric (Face ID) login
router.post('/biometric/login', authLimiter, biometricLogin);

router.post('/refresh', refreshAccessToken);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

module.exports = router;
