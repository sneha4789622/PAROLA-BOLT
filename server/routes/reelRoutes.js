const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createReel,
  getReelsFeed,
  registerView,
  toggleLike,
  addComment,
  shareReel,
  reportReel,
} = require('../controllers/reelController');

router.use(protect);

router.get('/feed', getReelsFeed);
router.post('/', upload.single('video'), createReel);
router.put('/:reelId/view', registerView);
router.put('/:reelId/like', toggleLike);
router.post('/:reelId/comments', addComment);
router.post('/:reelId/share', shareReel);
router.post('/:reelId/report', reportReel);

module.exports = router;
