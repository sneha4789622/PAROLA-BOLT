const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getProfile,
  updateProfile,
  updateAvatar,
  updateCoverPhoto,
  getProfilePosts,
  getProfileReels,
  followUser,
  unfollowUser,
  sendFriendRequest,
  respondFriendRequest,
  getFriendRequests,
  getSuggestedFriends,
  getDashboard,
  submitVerificationRequest,
} = require('../controllers/userController');

router.use(protect);

router.get('/dashboard', getDashboard);
router.get('/suggestions', getSuggestedFriends);
router.get('/friend-requests', getFriendRequests);
router.put('/friend-request/:requestId/respond', respondFriendRequest);

router.put('/profile', updateProfile);
router.put('/avatar', upload.single('avatar'), updateAvatar);
router.put('/cover', upload.single('cover'), updateCoverPhoto);

router.post(
  '/verification-request',
  upload.fields([
    { name: 'documentFront', maxCount: 1 },
    { name: 'documentBack', maxCount: 1 },
    { name: 'selfie', maxCount: 1 },
  ]),
  submitVerificationRequest
);

router.get('/:username', getProfile);
router.get('/:userId/posts', getProfilePosts);
router.get('/:userId/reels', getProfileReels);
router.post('/:userId/follow', followUser);
router.delete('/:userId/follow', unfollowUser);
router.post('/:userId/friend-request', sendFriendRequest);

module.exports = router;
