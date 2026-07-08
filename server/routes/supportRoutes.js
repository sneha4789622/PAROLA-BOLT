const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createTicket, getMyTickets, getTicket, replyToTicket, closeTicket,
  adminGetTickets, adminUpdateTicket, adminTicketStats,
  submitFeedback, submitBugReport,
} = require('../controllers/supportController');

router.use(protect);

// User routes
router.post('/tickets', upload.single('attachment'), createTicket);
router.get('/tickets', getMyTickets);
router.get('/tickets/:ticketId', getTicket);
router.post('/tickets/:ticketId/reply', upload.single('attachment'), replyToTicket);
router.put('/tickets/:ticketId/close', closeTicket);

router.post('/feedback', submitFeedback);
router.post('/bug-report', upload.single('screenshot'), submitBugReport);

// Admin routes
router.get('/admin/tickets', restrictTo('admin', 'moderator'), adminGetTickets);
router.get('/admin/stats', restrictTo('admin', 'moderator'), adminTicketStats);
router.put('/admin/tickets/:ticketId', restrictTo('admin', 'moderator'), adminUpdateTicket);
router.post('/admin/tickets/:ticketId/reply', upload.single('attachment'), restrictTo('admin', 'moderator'), replyToTicket);

module.exports = router;
