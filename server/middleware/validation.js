const validator = require('validator');

const PASSWORD_REGEX = {
  minLength: 12,
  upper: /[A-Z]/,
  lower: /[a-z]/,
  number: /[0-9]/,
  special: /[!@#$%^&*(),.?":{}|<>_\-+=[\]/\\;'`~]/,
};

const validatePassword = (password) => {
  const errors = [];
  if (!password || password.length < PASSWORD_REGEX.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REGEX.minLength} characters long.`);
  }
  if (!PASSWORD_REGEX.upper.test(password)) errors.push('Password must contain an uppercase letter.');
  if (!PASSWORD_REGEX.lower.test(password)) errors.push('Password must contain a lowercase letter.');
  if (!PASSWORD_REGEX.number.test(password)) errors.push('Password must contain a number.');
  if (!PASSWORD_REGEX.special.test(password)) errors.push('Password must contain a special character.');
  return errors;
};

const calculateAge = (dob) => {
  const today = new Date();
  const birthDate = new Date(dob);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
};

/**
 * Validates the signup payload. Returns an array of error messages
 * (empty array means valid).
 */
const validateSignup = (req, res, next) => {
  const { fullName, username, email, mobileNumber, dateOfBirth, password, confirmPassword } = req.body;
  const errors = [];

  if (!fullName || fullName.trim().length < 2) errors.push('Full name is required (min 2 characters).');

  if (!username || !/^[a-zA-Z0-9._]{3,30}$/.test(username)) {
    errors.push('Username must be 3-30 characters and contain only letters, numbers, dots or underscores.');
  }

  if (!email || !validator.isEmail(email)) errors.push('A valid email address is required.');

  if (!mobileNumber || !validator.isMobilePhone(String(mobileNumber), 'any')) {
    errors.push('A valid mobile number is required.');
  }

  if (!dateOfBirth || !validator.isDate(String(dateOfBirth))) {
    errors.push('A valid date of birth is required.');
  } else {
    const age = calculateAge(dateOfBirth);
    if (age < 18) {
      errors.push('You must be at least 18 years old to create an account on Parola Bolt.');
    }
  }

  if (password !== confirmPassword) errors.push('Password and confirm password do not match.');
  errors.push(...validatePassword(password || ''));

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { identifier, password } = req.body;
  const errors = [];
  if (!identifier) errors.push('Email, username, or mobile number is required.');
  if (!password) errors.push('Password is required.');

  if (errors.length > 0) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { validateSignup, validateLogin, validatePassword, calculateAge };
