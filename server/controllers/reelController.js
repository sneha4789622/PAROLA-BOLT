const Reel = require('../models/Reel');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { analyzeText } = require('../utils/contentModeration');

/**
 * POST /api/reels  (multipart: video)
 */
const createReel = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'A video file is required to create a reel.' });

    const { caption = '', audioLabel = 'Original Audio' } = req.body;
    const hashtags = (caption.match(/#[\w]+/g) || []).map((tag) => tag.slice(1).toLowerCase());
    const analysis = analyzeText(caption);

    const reel = await Reel.create({
      creator: req.user._id,
      video: { url: req.file.path, publicId: req.file.filename },
      caption,
      audioLabel,
      hashtags,
      moderation: {
        status: analysis.status,
        isPositive: analysis.isPositive,
        reasons: analysis.reasons,
      },
    });

    const populated = await reel.populate('creator', 'username fullName avatar isIdentityVerified');
    res.status(201).json({ success: true, message: 'Reel uploaded.', reel: populated });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/reels/feed?page=1&limit=10
 * Vertical-scroll reels feed.
 */
const getReelsFeed = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);
    const skip = (page - 1) * limit;

    const reels = await Reel.find({ 'moderation.status': { $in: ['approved', 'flagged'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('creator', 'username fullName avatar isIdentityVerified')
      .populate('comments.user', 'username fullName avatar');

    const total = await Reel.countDocuments({ 'moderation.status': { $in: ['approved', 'flagged'] } });

    res.status(200).json({ success: true, page, hasMore: skip + reels.length < total, reels });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/reels/:reelId/view  - increment view count
 */
const registerView = async (req, res, next) => {
  try {
    await Reel.findByIdAndUpdate(req.params.reelId, { $inc: { views: 1 } });
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/reels/:reelId/like
 */
const toggleLike = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const userId = req.user._id;
    const alreadyLiked = reel.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      reel.likes = reel.likes.filter((id) => String(id) !== String(userId));
    } else {
      reel.likes.push(userId);
      if (String(reel.creator) !== String(userId)) {
        await Notification.create({
          recipient: reel.creator,
          sender: userId,
          type: 'like',
          text: `${req.user.fullName} liked your reel.`,
          relatedReel: reel._id,
        });
      }
    }

    await reel.save();
    res.status(200).json({ success: true, liked: !alreadyLiked, likesCount: reel.likes.length });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reels/:reelId/comments
 */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    const reel = await Reel.findById(req.params.reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const analysis = analyzeText(text);
    if (analysis.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Comment rejected: contains offensive language or spam.' });
    }

    reel.comments.push({ user: req.user._id, text });
    await reel.save();

    if (String(reel.creator) !== String(req.user._id)) {
      await Notification.create({
        recipient: reel.creator,
        sender: req.user._id,
        type: 'comment',
        text: `${req.user.fullName} commented on your reel.`,
        relatedReel: reel._id,
      });
    }

    const populated = await reel.populate('comments.user', 'username fullName avatar');
    res.status(201).json({ success: true, comments: populated.comments });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reels/:reelId/share
 */
const shareReel = async (req, res, next) => {
  try {
    const reel = await Reel.findById(req.params.reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const userId = req.user._id;
    if (!reel.shares.some((id) => String(id) === String(userId))) {
      reel.shares.push(userId);
      await reel.save();
    }

    res.status(200).json({ success: true, sharesCount: reel.shares.length });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/reels/:reelId/report
 */
const reportReel = async (req, res, next) => {
  try {
    const { reason, details = '' } = req.body;
    const reel = await Reel.findById(req.params.reelId);
    if (!reel) return res.status(404).json({ success: false, message: 'Reel not found.' });

    const report = await Report.create({
      reporter: req.user._id,
      targetType: 'reel',
      targetId: reel._id,
      reason,
      details,
    });

    res.status(201).json({ success: true, message: 'Reel reported. Our team will review it shortly.', report });
  } catch (err) {
    next(err);
  }
};

module.exports = { createReel, getReelsFeed, registerView, toggleLike, addComment, shareReel, reportReel };
