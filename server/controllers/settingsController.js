const User = require('../models/User');
const { validatePassword } = require('../middleware/validation');
const { normalizeMobile } = require('../utils/phoneUtils');

// ─── GET SETTINGS ───────────────────────────────────────────────────────────
const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select(
      'fullName username email mobileNumber bio location website themePreference privacySettings notificationSettings'
    );
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

// ─── UPDATE BASIC PROFILE ───────────────────────────────────────────────────
const updateBasicInfo = async (req, res, next) => {
  try {
    const allowed = ['fullName', 'bio', 'location', 'website'];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    // Username change — check uniqueness
    if (req.body.username) {
      const username = req.body.username.toLowerCase().trim();
      if (!/^[a-z0-9._]{3,30}$/.test(username)) {
        return res.status(400).json({
          success: false,
          message: 'Username must be 3-30 characters: lowercase letters, numbers, dots or underscores only.',
        });
      }
      const existing = await User.findOne({ username, _id: { $ne: req.user._id } });
      if (existing) return res.status(409).json({ success: false, message: 'This username is already taken.' });
      updates.username = username;
    }

    // Email change — check uniqueness
    if (req.body.email) {
      const email = req.body.email.toLowerCase().trim();
      const existing = await User.findOne({ email, _id: { $ne: req.user._id } });
      if (existing) return res.status(409).json({ success: false, message: 'This email is already registered.' });
      updates.email = email;
      updates.isEmailVerified = false; // require re-verification
    }

    // Mobile change — check uniqueness
    if (req.body.mobileNumber) {
      const normalizedMobile = normalizeMobile(req.body.mobileNumber);
      const existing = await User.findOne({ mobileNumber: normalizedMobile, _id: { $ne: req.user._id } });
      if (existing) return res.status(409).json({ success: false, message: 'This mobile number is already registered.' });
      updates.mobileNumber = normalizedMobile;
      updates.isMobileVerified = false;
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: 'Profile updated successfully.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

// ─── CHANGE PASSWORD ────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All password fields are required.' });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirm password do not match.' });
    }

    const errors = validatePassword(newPassword);
    if (errors.length) return res.status(400).json({ success: false, message: errors[0], errors });

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    user.refreshTokens = []; // invalidate all other sessions
    await user.save();

    res.status(200).json({ success: true, message: 'Password changed successfully. Please log in again.' });
  } catch (err) { next(err); }
};

// ─── UPDATE THEME ────────────────────────────────────────────────────────────
const updateTheme = async (req, res, next) => {
  try {
    const { themePreference } = req.body;
    if (!['light', 'dark', 'system'].includes(themePreference)) {
      return res.status(400).json({ success: false, message: 'Invalid theme. Choose light, dark, or system.' });
    }
    await User.findByIdAndUpdate(req.user._id, { themePreference });
    res.status(200).json({ success: true, message: 'Theme preference saved.' });
  } catch (err) { next(err); }
};

// ─── PRIVACY SETTINGS ────────────────────────────────────────────────────────
// We store privacy settings in the User doc — extend User model to add these fields
const updatePrivacySettings = async (req, res, next) => {
  try {
    const allowed = [
      'profileVisibility',       // 'public' | 'followers' | 'private'
      'showOnlineStatus',        // bool
      'allowMessagesFrom',       // 'everyone' | 'followers' | 'none'
      'showFollowersList',       // bool
    ];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[`privacySettings.${f}`] = req.body[f]; });

    await User.findByIdAndUpdate(req.user._id, { $set: updates });
    res.status(200).json({ success: true, message: 'Privacy settings updated.' });
  } catch (err) { next(err); }
};

// ─── NOTIFICATION SETTINGS ───────────────────────────────────────────────────
const updateNotificationSettings = async (req, res, next) => {
  try {
    const allowed = [
      'likes', 'comments', 'shares', 'friendRequests',
      'messages', 'systemAlerts', 'emailNotifications', 'smsNotifications',
    ];
    const updates = {};
    allowed.forEach((f) => { if (req.body[f] !== undefined) updates[`notificationSettings.${f}`] = req.body[f]; });

    await User.findByIdAndUpdate(req.user._id, { $set: updates });
    res.status(200).json({ success: true, message: 'Notification settings updated.' });
  } catch (err) { next(err); }
};

// ─── UPLOAD AVATAR (re-export from userController pattern) ──────────────────
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
    const user = await User.findById(req.user._id);
    user.avatar = { url: req.file.path, publicId: req.file.filename };
    await user.save();
    res.status(200).json({ success: true, message: 'Profile photo updated.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

// ─── UPLOAD COVER ────────────────────────────────────────────────────────────
const updateCoverPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });
    const user = await User.findById(req.user._id);
    user.coverPhoto = { url: req.file.path, publicId: req.file.filename };
    await user.save();
    res.status(200).json({ success: true, message: 'Cover photo updated.', user: user.toSafeObject() });
  } catch (err) { next(err); }
};

// ─── DELETE ACCOUNT ──────────────────────────────────────────────────────────
const deactivateAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Incorrect password.' });

    user.status = 'suspended';
    user.isOnline = false;
    user.refreshTokens = [];
    await user.save();

    res.clearCookie('token');
    res.status(200).json({ success: true, message: 'Account deactivated. Contact support to restore it.' });
  } catch (err) { next(err); }
};

module.exports = {
  getSettings, updateBasicInfo, changePassword,
  updateTheme, updatePrivacySettings, updateNotificationSettings,
  updateAvatar, updateCoverPhoto, deactivateAccount,
};
