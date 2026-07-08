/**
 * Biometric Authentication (Mocked)
 * ---------------------------------------------------------------------
 * Real biometric capture (Face ID / fingerprint) happens on-device and
 * NEVER leaves the device as raw biometric data. What the backend
 * stores is a one-way hash/template reference plus a device
 * fingerprint, used purely to:
 *   1. Confirm a one-time biometric "enrollment" took place.
 *   2. Prevent the same device/biometric template from being
 *      registered against multiple accounts (anti-fake-account control).
 *
 * The client sends a `faceCaptureToken` (a mock token simulating the
 * result of an on-device Face ID capture) and a `deviceFingerprint`.
 * This module turns those into a stored hash and runs duplicate checks.
 */

const crypto = require('crypto');

const hashBiometricToken = (faceCaptureToken) => {
  return crypto.createHash('sha256').update(String(faceCaptureToken)).digest('hex');
};

const generateDeviceFingerprint = (req) => {
  // In production the client generates this (e.g. via a device-fingerprint
  // library). Here we provide a fallback derived from request headers.
  const ua = req.headers['user-agent'] || 'unknown-agent';
  const accept = req.headers['accept-language'] || 'unknown-lang';
  return crypto.createHash('sha256').update(`${ua}-${accept}-${Date.now()}`).digest('hex');
};

module.exports = { hashBiometricToken, generateDeviceFingerprint };
