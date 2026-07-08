const Post = require('../models/Post');
const Notification = require('../models/Notification');
const Report = require('../models/Report');
const { analyzeText } = require('../utils/contentModeration');

/** POST /api/posts */
const createPost = async (req, res, next) => {
  try {
    const { caption = '', type = 'text' } = req.body;

    const media = (req.files || []).map((file) => ({
      url: file.path,
      publicId: file.filename,
      mediaType: file.mimetype.startsWith('video') ? 'video' : 'image',
    }));

    const hashtags = (caption.match(/#[\w]+/g) || []).map((tag) => tag.slice(1).toLowerCase());
    const analysis = analyzeText(caption);

    const post = await Post.create({
      author: req.user._id,
      type: media.length ? (media[0].mediaType === 'video' ? 'video' : 'photo') : type,
      caption,
      media,
      hashtags,
      moderation: {
        status: analysis.status,
        isPositive: analysis.isPositive,
        spamScore: analysis.spamScore,
        offensiveLanguageDetected: analysis.offensiveLanguageDetected,
        misinformationWarning: analysis.misinformationWarning,
        reasons: analysis.reasons,
      },
    });

    req.user.postsCount += 1;
    await req.user.save();

    const populated = await post.populate('author', 'username fullName avatar isIdentityVerified');

    res.status(201).json({
      success: true,
      message:
        analysis.status === 'approved'
          ? 'Post published.'
          : analysis.status === 'flagged'
          ? 'Post published but flagged for review (possible misinformation/spam).'
          : 'Post was rejected by the content verification system.',
      post: populated,
    });
  } catch (err) { next(err); }
};

/** GET /api/posts/feed */
const getFeed = async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit) || 10, 30);
    const skip = (page - 1) * limit;

    const posts = await Post.find({ 'moderation.status': { $in: ['approved', 'flagged'] } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username fullName avatar isIdentityVerified')
      .populate('comments.user', 'username fullName avatar');

    const total = await Post.countDocuments({ 'moderation.status': { $in: ['approved', 'flagged'] } });

    res.status(200).json({ success: true, page, hasMore: skip + posts.length < total, count: posts.length, posts });
  } catch (err) { next(err); }
};

/** GET /api/posts/:postId */
const getPost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('author', 'username fullName avatar isIdentityVerified')
      .populate('comments.user', 'username fullName avatar');

    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    res.status(200).json({ success: true, post });
  } catch (err) { next(err); }
};

/** PUT /api/posts/:postId — edit caption (owner only) */
const editPost = async (req, res, next) => {
  try {
    const { caption } = req.body;
    if (caption === undefined) return res.status(400).json({ success: false, message: 'Caption is required.' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    if (String(post.author) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'You can only edit your own posts.' });
    }

    const analysis = analyzeText(caption);
    if (analysis.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Post update rejected: offensive content detected.' });
    }

    post.caption = caption;
    post.hashtags = (caption.match(/#[\w]+/g) || []).map((t) => t.slice(1).toLowerCase());
    post.moderation.status = analysis.status;
    post.moderation.reasons = analysis.reasons;
    post.moderation.misinformationWarning = analysis.misinformationWarning;
    await post.save();

    const populated = await post.populate('author', 'username fullName avatar isIdentityVerified');
    res.status(200).json({ success: true, message: 'Post updated.', post: populated });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:postId */
const deletePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const isOwner = String(post.author) === String(req.user._id);
    const isModerator = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isModerator) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post.' });
    }

    await post.deleteOne();
    res.status(200).json({ success: true, message: 'Post deleted.' });
  } catch (err) { next(err); }
};

/** PUT /api/posts/:postId/like */
const toggleLike = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const userId = req.user._id;
    const alreadyLiked = post.likes.some((id) => String(id) === String(userId));

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => String(id) !== String(userId));
    } else {
      post.likes.push(userId);
      if (String(post.author) !== String(userId)) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'like',
          text: `${req.user.fullName} liked your post.`,
          relatedPost: post._id,
        });
      }
    }

    await post.save();
    res.status(200).json({ success: true, liked: !alreadyLiked, likesCount: post.likes.length });
  } catch (err) { next(err); }
};

/** POST /api/posts/:postId/comments */
const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const analysis = analyzeText(text);
    if (analysis.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Comment rejected: contains offensive language or spam.' });
    }

    post.comments.push({ user: req.user._id, text });
    await post.save();

    if (String(post.author) !== String(req.user._id)) {
      await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'comment',
        text: `${req.user.fullName} commented on your post.`,
        relatedPost: post._id,
      });
    }

    const populated = await post.populate('comments.user', 'username fullName avatar');
    res.status(201).json({ success: true, comments: populated.comments });
  } catch (err) { next(err); }
};

/** PUT /api/posts/:postId/comments/:commentId — edit comment (owner only) */
const editComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) return res.status(400).json({ success: false, message: 'Comment text is required.' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const isOwner = String(comment.user) === String(req.user._id);
    const isMod = ['admin', 'moderator'].includes(req.user.role);
    if (!isOwner && !isMod) {
      return res.status(403).json({ success: false, message: 'You can only edit your own comments.' });
    }

    const analysis = analyzeText(text);
    if (analysis.status === 'rejected') {
      return res.status(400).json({ success: false, message: 'Comment rejected: offensive content detected.' });
    }

    comment.text = text.trim();
    await post.save();
    const populated = await post.populate('comments.user', 'username fullName avatar');
    res.status(200).json({ success: true, comments: populated.comments });
  } catch (err) { next(err); }
};

/** DELETE /api/posts/:postId/comments/:commentId */
const deleteComment = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found.' });

    const isOwner = String(comment.user) === String(req.user._id);
    const isMod = ['admin', 'moderator'].includes(req.user.role);
    const isPostOwner = String(post.author) === String(req.user._id);
    if (!isOwner && !isMod && !isPostOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this comment.' });
    }

    comment.deleteOne();
    await post.save();
    res.status(200).json({ success: true, message: 'Comment deleted.', comments: post.comments });
  } catch (err) { next(err); }
};

/** POST /api/posts/:postId/share */
const sharePost = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const userId = req.user._id;
    if (!post.shares.some((id) => String(id) === String(userId))) {
      post.shares.push(userId);
      await post.save();

      if (String(post.author) !== String(userId)) {
        await Notification.create({
          recipient: post.author,
          sender: userId,
          type: 'share',
          text: `${req.user.fullName} shared your post.`,
          relatedPost: post._id,
        });
      }
    }

    res.status(200).json({ success: true, sharesCount: post.shares.length });
  } catch (err) { next(err); }
};

/** PUT /api/posts/:postId/save */
const toggleSave = async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const userId = req.user._id;
    const alreadySaved = post.savedBy.some((id) => String(id) === String(userId));

    if (alreadySaved) {
      post.savedBy = post.savedBy.filter((id) => String(id) !== String(userId));
    } else {
      post.savedBy.push(userId);
    }
    await post.save();

    res.status(200).json({ success: true, saved: !alreadySaved });
  } catch (err) { next(err); }
};

/** POST /api/posts/:postId/report */
const reportPost = async (req, res, next) => {
  try {
    const { reason, details = '' } = req.body;
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });

    const report = await Report.create({
      reporter: req.user._id,
      targetType: 'post',
      targetId: post._id,
      reason,
      details,
    });

    const reportCount = await Report.countDocuments({ targetType: 'post', targetId: post._id, status: 'pending' });
    if (reportCount >= 3 && post.moderation.status === 'approved') {
      post.moderation.status = 'flagged';
      await post.save();
    }

    res.status(201).json({ success: true, message: 'Post reported. Our team will review it shortly.', report });
  } catch (err) { next(err); }
};

// ─── Single exports block — ALL functions declared above ───────────────────
module.exports = {
  createPost,
  getFeed,
  getPost,
  editPost,
  deletePost,
  toggleLike,
  addComment,
  editComment,
  deleteComment,
  sharePost,
  toggleSave,
  reportPost,
};
