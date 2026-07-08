/**
 * Mobile Number Normalization
 * Strip all non-digit characters except a leading "+" so that
 * "+91 98765 43210", "+91-98765-43210", and "+919876543210"
 * are all treated as the SAME number in DB queries.
 */
const normalizeMobile = (raw) => {
  if (!raw) return '';
  const trimmed = String(raw).trim();
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');
  return hasPlus ? `+${digitsOnly}` : digitsOnly;
};

module.exports = { normalizeMobile };
