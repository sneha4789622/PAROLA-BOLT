const express = require('express');
const router = express.Router();
const {
  sendLoginOtp,
  verifyLoginOtp,
  resendOtp,
  forgotPasswordSendOtp,
  forgotPasswordVerifyOtp,
  resetPassword,
} = require('../controllers/otpController');
const { authLimiter } = require('../middleware/rateLimiter');

// OTP Login
router.post('/send', authLimiter, sendLoginOtp);
router.post('/verify-login', authLimiter, verifyLoginOtp);
router.post('/resend', authLimiter, resendOtp);

// Forgot Password
router.post('/forgot-password/send', authLimiter, forgotPasswordSendOtp);
router.post('/forgot-password/verify', authLimiter, forgotPasswordVerifyOtp);
router.post('/forgot-password/reset', authLimiter, resetPassword);

module.exports = router;
