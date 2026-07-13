/**
 * OCR + field extraction for uploaded Aadhaar card images.
 * Uses tesseract.js (runs entirely in Node — no external API calls,
 * no image ever leaves the server except to Cloudinary for storage).
 */
const { createWorker } = require('tesseract.js');

/** Runs OCR on an image buffer and returns the raw recognized text. */
const extractText = async (buffer) => {
  const worker = await createWorker('eng');
  try {
    const { data } = await worker.recognize(buffer);
    return data.text || '';
  } finally {
    await worker.terminate();
  }
};

/**
 * Finds a 12-digit Aadhaar-shaped number in OCR text (UIDAI prints it as
 * four groups of four, e.g. "1234 5678 9123"). Returns digits only, or null.
 */
const extractAadhaarNumberFromText = (text) => {
  const matches = text.match(/\b(\d{4}\s?\d{4}\s?\d{4})\b/g);
  if (!matches) return null;
  for (const m of matches) {
    const digits = m.replace(/\s/g, '');
    if (digits.length === 12) return digits;
  }
  return null;
};

/**
 * Finds a Date of Birth in OCR text. Aadhaar prints "DOB: dd/mm/yyyy" (or
 * with dashes) on most cards; older cards only print "Year of Birth: yyyy".
 * Returns a JS Date (day/month default to 01 if only a year is found), or null.
 */
const extractDateOfBirthFromText = (text) => {
  const dobMatch = text.match(/(?:DOB|Date of Birth)\s*[:\-]?\s*(\d{2})[\/\-](\d{2})[\/\-](\d{4})/i);
  if (dobMatch) {
    const [, dd, mm, yyyy] = dobMatch;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Fallback: any standalone dd/mm/yyyy or dd-mm-yyyy in the text
  const genericMatch = text.match(/\b(\d{2})[\/\-](\d{2})[\/\-](\d{4})\b/);
  if (genericMatch) {
    const [, dd, mm, yyyy] = genericMatch;
    const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (!Number.isNaN(date.getTime())) return date;
  }

  // Older-format cards: "Year of Birth: 1998"
  const yobMatch = text.match(/Year of Birth\s*[:\-]?\s*(\d{4})/i);
  if (yobMatch) {
    return new Date(Number(yobMatch[1]), 0, 1);
  }

  return null;
};

/** Best-effort name extraction: first all-letters line of reasonable length. */
const extractNameFromText = (text) => {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 2 && l.length < 60 && /^[A-Za-z\s.]+$/.test(l));
  return lines[0] || '';
};

const calculateAgeFromDOB = (dob) => {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

module.exports = {
  extractText,
  extractAadhaarNumberFromText,
  extractDateOfBirthFromText,
  extractNameFromText,
  calculateAgeFromDOB,
};
