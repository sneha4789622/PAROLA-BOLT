/**
 * Basic Content Moderation Engine
 * ---------------------------------------------------------------------
 * This module simulates an "AI moderation" layer for Parola Bolt.
 * In production, replace `analyzeText` with a call to a real
 * moderation/NLP service (e.g. a hosted content-safety API). The
 * interface (input/output shape) is designed to be a drop-in swap.
 */

// A small seed list of offensive / abusive terms (expand as needed).
const OFFENSIVE_TERMS = [
  'idiot',
  'stupid',
  'dumb',
  'hate you',
  'kill you',
  'shut up',
  // NOTE: this is intentionally a minimal placeholder list.
];

// Simple spam signals
const SPAM_PATTERNS = [
  /\b(?:buy now|click here|free money|act now|limited offer|subscribe now)\b/i,
  /(https?:\/\/[^\s]+){3,}/i, // 3+ links in one post
  /(.)\1{6,}/i, // repeated character spam e.g. "aaaaaaa"
];

// Misinformation trigger phrases (keyword-based heuristic only)
const MISINFO_PATTERNS = [
  /\b(cure for cancer|vaccines? cause autism|the earth is flat|election was stolen)\b/i,
];

// Positivity heuristic - presence of positive words boosts score
const POSITIVE_WORDS = [
  'congratulations',
  'great',
  'awesome',
  'thank you',
  'love',
  'amazing',
  'proud',
  'grateful',
  'excited',
  'helpful',
];

function analyzeText(text = '') {
  const lower = text.toLowerCase();
  const reasons = [];

  // 1. Offensive language detection
  const offensiveLanguageDetected = OFFENSIVE_TERMS.some((term) => lower.includes(term));
  if (offensiveLanguageDetected) reasons.push('offensive_language');

  // 2. Spam detection
  let spamScore = 0;
  SPAM_PATTERNS.forEach((pattern) => {
    if (pattern.test(text)) spamScore += 1;
  });
  if (spamScore > 0) reasons.push('spam_pattern');

  // 3. Misinformation heuristic
  const misinformationWarning = MISINFO_PATTERNS.some((pattern) => pattern.test(text));
  if (misinformationWarning) reasons.push('possible_misinformation');

  // 4. Positivity score
  const positiveHits = POSITIVE_WORDS.filter((word) => lower.includes(word)).length;
  const isPositive = !offensiveLanguageDetected && spamScore === 0;

  // Decide moderation status
  let status = 'approved';
  if (offensiveLanguageDetected || spamScore >= 2) {
    status = 'rejected';
  } else if (misinformationWarning || spamScore === 1) {
    status = 'flagged';
  } else {
    status = 'approved';
  }

  return {
    status,
    isPositive,
    spamScore,
    offensiveLanguageDetected,
    misinformationWarning,
    positiveSignals: positiveHits,
    reasons,
  };
}

module.exports = { analyzeText };
