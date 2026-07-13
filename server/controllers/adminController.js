const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const Report = require('../models/Report');
const VerificationRequest = require('../models/VerificationRequest');
const Notification = require('../models/Notification');

/**
 * GET /api/admin/stats
 * Aggregated counts for the admin dashboard overview cards.
 */
const getStats = async (req, res, next) => {
  try {
    const [
      totalUsers,
      totalPosts,
      totalReels,
      reportedContent,
      pendingVerifications,
      activeUsers,
      bannedUsers,
      flaggedPosts,
    ] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments(),
      Reel.countDocuments(),
      Report.countDocuments({ status: 'pending' }),
      VerificationRequest.countDocuments({ status: 'pending' }),
      User.countDocuments({ status: 'active' }),
      User.countDocuments({ status: 'banned' }),
      Post.countDocuments({ 'moderation.status': 'flagged' }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        totalPosts,
        totalReels,
        reportedContent,
        pendingVerifications,
        activeUsers,
        bannedUsers,
        flaggedPosts,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/analytics
 * Simple time-series data for charts: new users / posts per day (last 14 days).
 */
const getAnalytics = async (req, res, next) => {
  try {
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const dayBuckets = (docs) => {
      const map = {};
      for (let i = 0; i < 14; i++) {
        const d = new Date(fourteenDaysAgo);
        d.setDate(d.getDate() + i);
        map[d.toISOString().slice(0, 10)] = 0;
      }
      docs.forEach((doc) => {
        const key = doc.createdAt.toISOString().slice(0, 10);
        if (map[key] !== undefined) map[key] += 1;
      });
      return Object.entries(map).map(([date, count]) => ({ date, count }));
    };

    const [users, posts, reels] = await Promise.all([
      User.find({ createdAt: { $gte: fourteenDaysAgo } }).select('createdAt'),
      Post.find({ createdAt: { $gte: fourteenDaysAgo } }).select('createdAt'),
      Reel.find({ createdAt: { $gte: fourteenDaysAgo } }).select('createdAt'),
    ]);

    res.status(200).json({
      success: true,
      analytics: {
        newUsersPerDay: dayBuckets(users),
        newPostsPerDay: dayBuckets(posts),
        newReelsPerDay: dayBuckets(reels),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/users?page=1&limit=20&status=&role=&q=
 */
const getUsers = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const skip = (page - 1) * limit;

    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      const regex = new RegExp(req.query.q, 'i');
      filter.$or = [{ username: regex }, { email: regex }, { fullName: regex }];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).select('-password -refreshTokens'),
      User.countDocuments(filter),
    ]);

    res.status(200).json({ success: true, page, total, hasMore: skip + users.length < total, users });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/users/:userId/status
 * Body: { status: 'active' | 'suspended' | 'banned' }
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended', 'banned'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status value.' });
    }

    const user = await User.findByIdAndUpdate(req.params.userId, { status }, { new: true }).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.status(200).json({ success: true, message: `User status updated to ${status}.`, user });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/users/:userId/role
 * Body: { role: 'user' | 'moderator' | 'admin' }
 */
const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    if (!['user', 'moderator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Invalid role value.' });
    }

    const user = await User.findByIdAndUpdate(req.params.userId, { role }, { new: true }).select('-password -refreshTokens');
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    res.status(200).json({ success: true, message: `User role updated to ${role}.`, user });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/verification-requests?status=pending
 */
const getVerificationRequests = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const requests = await VerificationRequest.find({ status })
      .populate('user', 'username fullName email avatar verificationStatus')
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/verification-requests/:requestId
 * Body: { action: 'approve' | 'reject', rejectionReason? }
 */
const reviewVerificationRequest = async (req, res, next) => {
  try {
    const { action, rejectionReason = '' } = req.body;
    const request = await VerificationRequest.findById(req.params.requestId);
    if (!request) return res.status(404).json({ success: false, message: 'Verification request not found.' });

    const user = await User.findById(request.user);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    if (action === 'approve') {
      request.status = 'approved';
      user.isIdentityVerified = true;
      user.verificationStatus = 'verified';

      if (request.documentType === 'aadhaar') {
        user.aadhaarVerified = true;
        user.isAgeVerified = true;
        if (request.extracted?.age != null) user.age = request.extracted.age;
        if (request.extracted?.aadhaarNumberMasked) user.aadhaarNumberMasked = request.extracted.aadhaarNumberMasked;
        user.verifiedAt = new Date();
      }
    } else {
      request.status = 'rejected';
      request.rejectionReason = rejectionReason;
      user.verificationStatus = 'rejected';

      if (request.documentType === 'aadhaar') {
        user.aadhaarVerified = false;
      }
    }

    request.reviewedBy = req.user._id;
    request.reviewedAt = new Date();
    await request.save();
    await user.save();

    await Notification.create({
      recipient: user._id,
      type: 'verification_update',
      text:
        action === 'approve'
          ? 'Congratulations! Your identity has been verified. You now have a verified badge.'
          : `Your verification request was not approved. ${rejectionReason}`.trim(),
    });

    res.status(200).json({ success: true, message: `Verification request ${request.status}.`, request });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/reports?status=pending
 */
const getReports = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const reports = await Report.find({ status })
      .populate('reporter', 'username fullName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: reports.length, reports });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/reports/:reportId
 * Body: { action: 'dismiss' | 'action_taken', actionTaken? }
 * Also supports moderating the underlying content directly:
 * Body: { contentDecision: 'approve' | 'reject' | 'flag' }
 */
const reviewReport = async (req, res, next) => {
  try {
    const { action, actionTaken = '', contentDecision } = req.body;
    const report = await Report.findById(req.params.reportId);
    if (!report) return res.status(404).json({ success: false, message: 'Report not found.' });

    if (contentDecision && ['post', 'reel'].includes(report.targetType)) {
      const Model = report.targetType === 'post' ? Post : Reel;
      const content = await Model.findById(report.targetId);
      if (content) {
        const statusMap = { approve: 'approved', reject: 'rejected', flag: 'flagged' };
        content.moderation.status = statusMap[contentDecision] || content.moderation.status;
        content.moderation.reviewedBy = req.user._id;
        content.moderation.reviewedAt = new Date();
        await content.save();
      }
    }

    report.status = action === 'dismiss' ? 'dismissed' : 'action_taken';
    report.actionTaken = actionTaken;
    report.reviewedBy = req.user._id;
    report.reviewedAt = new Date();
    await report.save();

    res.status(200).json({ success: true, message: `Report ${report.status}.`, report });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/admin/content?status=pending&type=post|reel
 * Content moderation queue.
 */
const getContentQueue = async (req, res, next) => {
  try {
    const status = req.query.status || 'pending';
    const type = req.query.type || 'post';
    const Model = type === 'reel' ? Reel : Post;
    const populateField = type === 'reel' ? 'creator' : 'author';

    const content = await Model.find({ 'moderation.status': status })
      .sort({ createdAt: -1 })
      .populate(populateField, 'username fullName avatar')
      .limit(50);

    res.status(200).json({ success: true, count: content.length, content });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/admin/content/:type/:contentId
 * Body: { decision: 'approve' | 'reject' | 'flag' }
 */
const moderateContent = async (req, res, next) => {
  try {
    const { type, contentId } = req.params;
    const { decision } = req.body;
    const statusMap = { approve: 'approved', reject: 'rejected', flag: 'flagged' };
    if (!statusMap[decision]) return res.status(400).json({ success: false, message: 'Invalid decision.' });

    const Model = type === 'reel' ? Reel : Post;
    const content = await Model.findById(contentId);
    if (!content) return res.status(404).json({ success: false, message: 'Content not found.' });

    content.moderation.status = statusMap[decision];
    content.moderation.reviewedBy = req.user._id;
    content.moderation.reviewedAt = new Date();
    await content.save();

    res.status(200).json({ success: true, message: `Content ${statusMap[decision]}.`, content });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
