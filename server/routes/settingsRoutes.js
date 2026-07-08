const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getSettings, updateBasicInfo, changePassword,
  updateTheme, updatePrivacySettings, updateNotificationSettings,
  updateAvatar, updateCoverPhoto, deactivateAccount,
} = require('../controllers/settingsController');

router.use(protect);

router.get('/', getSettings);
router.put('/basic', updateBasicInfo);
router.put('/password', changePassword);
router.put('/theme', updateTheme);
router.put('/privacy', updatePrivacySettings);
router.put('/notifications', updateNotificationSettings);
router.put('/avatar', upload.single('avatar'), updateAvatar);
router.put('/cover', upload.single('cover'), updateCoverPhoto);
router.post('/deactivate', deactivateAccount);

module.exports = router;
