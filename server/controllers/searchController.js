const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');

/**
 * GET /api/search?q=query&type=all|users|posts|reels|hashtags
 */
const globalSearch = async (req, res, next) => {
  try {
    const { q = '', type = 'all' } = req.query;
    if (!q.trim()) return res.status(400).json({ success: false, message: 'A search query is required.' });

    const regex = new RegExp(q.trim(), 'i');
    const results = {};

    if (type === 'all' || type === 'users') {
      results.users = await User.find({
        $or: [{ username: regex }, { fullName: regex }],
        status: 'active',
      })
        .limit(10)
        .select('username fullName avatar isIdentityVerified bio');
    }

    if (type === 'all' || type === 'posts') {
      results.posts = await Post.find({
        caption: regex,
        'moderation.status': { $in: ['approved', 'flagged'] },
      })
        .limit(10)
        .populate('author', 'username fullName avatar isIdentityVerified');
    }

    if (type === 'all' || type === 'reels') {
      results.reels = await Reel.find({
        caption: regex,
        'moderation.status': { $in: ['approved', 'flagged'] },
      })
        .limit(10)
        .populate('creator', 'username fullName avatar isIdentityVerified');
    }

    if (type === 'all' || type === 'hashtags') {
      const tag = q.trim().replace(/^#/, '').toLowerCase();
      results.hashtagPosts = await Post.find({
        hashtags: tag,
        'moderation.status': { $in: ['approved', 'flagged'] },
      })
        .limit(10)
        .populate('author', 'username fullName avatar isIdentityVerified');

      results.hashtagReels = await Reel.find({
        hashtags: tag,
        'moderation.status': { $in: ['approved', 'flagged'] },
      })
        .limit(10)
        .populate('creator', 'username fullName avatar isIdentityVerified');
    }

    res.status(200).json({ success: true, query: q, results });
  } catch (err) {
    next(err);
  }
};

module.exports = { globalSearch };
