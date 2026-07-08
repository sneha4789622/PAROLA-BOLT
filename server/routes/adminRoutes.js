const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const {
  getStats,
  getAnalytics,
  getUsers,
  updateUserStatus,
  updateUserRole,
  getVerificationRequests,
  reviewVerificationRequest,
  getReports,
  reviewReport,
  getContentQueue,
  moderateContent,
} = require('../controllers/adminController');

router.use(protect, restrictTo('admin', 'moderator'));

router.get('/stats', getStats);
router.get('/analytics', getAnalytics);

router.get('/users', getUsers);
router.put('/users/:userId/status', restrictTo('admin'), updateUserStatus);
router.put('/users/:userId/role', restrictTo('admin'), updateUserRole);

router.get('/verification-requests', getVerificationRequests);
router.put('/verification-requests/:requestId', reviewVerificationRequest);

router.get('/reports', getReports);
router.put('/reports/:reportId', reviewReport);

router.get('/content', getContentQueue);
router.put('/content/:type/:contentId', moderateContent);

module.exports = router;
