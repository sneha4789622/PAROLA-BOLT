/**
 * Biometric Authentication — Real Face Verification
 * ---------------------------------------------------------------------
 * The client (browser) runs on-device face detection + recognition
 * (face-api.js / TensorFlow.js) and never uploads raw images. What it
 * sends to the server is a 128-length face descriptor (a numeric
 * embedding of the detected face) plus a flag confirming an on-device
 * liveness check (blink detection) passed.
 *
 * This module:
 *   1. Encrypts descriptors at rest (AES-256-GCM) — only ciphertext is
 *      stored in MongoDB, never a raw/plaintext embedding.
 *   2. Computes similarity between two descriptors (Euclidean distance)
 *      so the same face captured twice (slightly different lighting/
 *      angle each time) is still recognized as a match.
 *   3. Finds duplicate/matching accounts by scanning stored descriptors.
 */

const crypto = require('crypto');

const DESCRIPTOR_LENGTH = 128; // face-api.js FaceRecognitionNet output size

// Anything below this Euclidean distance is considered "the same face".
// face-api.js's own docs suggest ~0.6 as the boundary between different
// people; we use a slightly stricter threshold to reduce false-accepts.
const FACE_MATCH_THRESHOLD = 0.5;

const getEncryptionKey = () => {
  const raw = process.env.FACE_ENCRYPTION_KEY || process.env.JWT_SECRET || 'parola-bolt-dev-fallback-key';
  // Derive a fixed 32-byte key regardless of the raw secret's length.
  return crypto.createHash('sha256').update(String(raw)).digest();
};

/**
 * Validates that a value is a usable face descriptor: a plain array of
 * finite numbers of the expected length.
 */
const isValidDescriptor = (descriptor) => {
  return (
    Array.isArray(descriptor) &&
    descriptor.length === DESCRIPTOR_LENGTH &&
    descriptor.every((n) => typeof n === 'number' && Number.isFinite(n))
  );
};

/**
 * Encrypts a face descriptor (array of floats) into a single string
 * safe to store in MongoDB: `iv:authTag:ciphertext` (all hex).
 */
const encryptDescriptor = (descriptor) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard IV size
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const plaintext = Buffer.from(JSON.stringify(descriptor), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

/**
 * Decrypts a stored descriptor string back into an array of floats.
 * Returns null if the value is missing/malformed rather than throwing,
 * so a single corrupt record can't break a full-table scan.
 */
const decryptDescriptor = (encrypted) => {
  try {
    if (!encrypted || typeof encrypted !== 'string') return null;
    const [ivHex, tagHex, dataHex] = encrypted.split(':');
    if (!ivHex || !tagHex || !dataHex) return null;

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));

    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    const parsed = JSON.parse(decrypted.toString('utf8'));
    return isValidDescriptor(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

/** Euclidean distance between two equal-length numeric descriptors. */
const euclideanDistance = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
};

/**
 * Scans all users with a registered face and returns the closest match
 * for the given descriptor, if any is within FACE_MATCH_THRESHOLD.
 *
 * @param {import('mongoose').Model} UserModel
 * @param {number[]} descriptor
 * @param {string|null} excludeUserId - skip this user (e.g. self, when checking for duplicates)
 * @returns {Promise<{ user: object, distance: number } | null>}
 */
const findClosestFaceMatch = async (UserModel, descriptor, excludeUserId = null) => {
  const query = { 'biometric.isRegistered': true, 'biometric.faceDescriptor': { $ne: '' } };
  if (excludeUserId) query._id = { $ne: excludeUserId };

  const candidates = await UserModel.find(query).select('+biometric.faceDescriptor');

  let best = null;
  for (const candidate of candidates) {
    const stored = decryptDescriptor(candidate.biometric?.faceDescriptor);
    if (!stored) continue;
    const distance = euclideanDistance(descriptor, stored);
    if (distance <= FACE_MATCH_THRESHOLD && (!best || distance < best.distance)) {
      best = { user: candidate, distance };
    }
  }
  return best;
};

/**
 * Compares a freshly captured descriptor against ONE specific user's
 * stored descriptor (used during login-time face verification, where
 * the account is already known from the password step).
 */
const matchesUserFace = (descriptor, storedEncryptedDescriptor) => {
  const stored = decryptDescriptor(storedEncryptedDescriptor);
  if (!stored) return { match: false, distance: Infinity };
  const distance = euclideanDistance(descriptor, stored);
  return { match: distance <= FACE_MATCH_THRESHOLD, distance };
};

const generateDeviceFingerprint = (req) => {
  // In production the client generates this (e.g. via a device-fingerprint
  // library). Here we provide a fallback derived from request headers.
  const ua = req.headers['user-agent'] || 'unknown-agent';
  const accept = req.headers['accept-language'] || 'unknown-lang';
  return crypto.createHash('sha256').update(`${ua}-${accept}-${Date.now()}`).digest('hex');
};

module.exports = {
  DESCRIPTOR_LENGTH,
  FACE_MATCH_THRESHOLD,
  isValidDescriptor,
  encryptDescriptor,
  decryptDescriptor,
  euclideanDistance,
  findClosestFaceMatch,
  matchesUserFace,
  generateDeviceFingerprint,
};
