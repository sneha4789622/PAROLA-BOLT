/**
 * Aadhaar number handling: validation (Verhoeff checksum — the real
 * algorithm India's UIDAI uses), encryption at rest, masking for display,
 * and a deterministic hash used ONLY for duplicate-registration lookups
 * (so we never need to decrypt every row to check for a duplicate).
 *
 * Nothing here ever logs, returns, or stores a plaintext Aadhaar number
 * outside of the single encrypted field.
 */
const crypto = require('crypto');

// ---- Verhoeff checksum tables (standard, public algorithm) ----
const d = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];
const p = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

/** True if the 12-digit string passes the Verhoeff checksum used by Aadhaar. */
const isValidVerhoeff = (numStr) => {
  let c = 0;
  const digits = numStr.split('').reverse().map(Number);
  for (let i = 0; i < digits.length; i++) {
    c = d[c][p[i % 8][digits[i]]];
  }
  return c === 0;
};

/** Strict Aadhaar format check: exactly 12 digits, not all the same digit, valid checksum. */
const isValidAadhaarNumber = (raw) => {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 12) return false;
  if (/^(\d)\1{11}$/.test(digits)) return false; // all same digit — clearly not real
  if (digits.startsWith('0') || digits.startsWith('1')) return false; // UIDAI never issues these
  return isValidVerhoeff(digits);
};

const getEncryptionKey = () => {
  const raw = process.env.AADHAAR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'parola-bolt-dev-fallback-key';
  return crypto.createHash('sha256').update(String(raw)).digest();
};

/** AES-256-GCM encrypt the raw 12-digit number → `iv:tag:ciphertext` hex string. */
const encryptAadhaarNumber = (digits) => {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(Buffer.from(digits, 'utf8')), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
};

const decryptAadhaarNumber = (encrypted) => {
  try {
    const [ivHex, tagHex, dataHex] = String(encrypted).split(':');
    if (!ivHex || !tagHex || !dataHex) return null;
    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(ivHex, 'hex'));
    decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
    const decrypted = Buffer.concat([decipher.update(Buffer.from(dataHex, 'hex')), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
};

/** Deterministic, non-reversible fingerprint — used ONLY to detect duplicate registrations. */
const hashAadhaarNumber = (digits) => {
  const key = process.env.AADHAAR_ENCRYPTION_KEY || process.env.JWT_SECRET || 'parola-bolt-dev-fallback-key';
  return crypto.createHmac('sha256', key).update(digits).digest('hex');
};

/** "XXXX XXXX 1234" — only the last 4 digits are ever shown. */
const maskAadhaarNumber = (digits) => `XXXX XXXX ${digits.slice(-4)}`;

module.exports = {
  isValidAadhaarNumber,
  encryptAadhaarNumber,
  decryptAadhaarNumber,
  hashAadhaarNumber,
  maskAadhaarNumber,
};
