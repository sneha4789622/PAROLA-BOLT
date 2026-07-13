const express = require('express');
const multer = require('multer');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { submitAadhaar, getAadhaarStatus } = require('../controllers/verificationController');

// Aadhaar images need to be OCR'd in-memory before (optionally) being
// uploaded to Cloudinary, so this uses its own memoryStorage multer
// instance — separate from the disk/Cloudinary-direct `upload` used for
// posts/reels/chat media. Does not touch that existing config.
const aadhaarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB per image
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    cb(null, allowed.includes(file.mimetype));
  },
});

router.use(protect);

router.post(
  '/aadhaar',
  aadhaarUpload.fields([
    { name: 'aadhaarFront', maxCount: 1 },
    { name: 'aadhaarBack', maxCount: 1 },
  ]),
  submitAadhaar
);
router.get('/aadhaar/status', getAadhaarStatus);

module.exports = router;
