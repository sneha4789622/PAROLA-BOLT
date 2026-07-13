const User = require('../models/User');
const Post = require('../models/Post');
const Reel = require('../models/Reel');
const FriendRequest = require('../models/FriendRequest');
const Notification = require('../models/Notification');
const VerificationRequest = require('../models/VerificationRequest');

/**
 * GET /api/users/:username
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findOne({ username: req.params.username.toLowerCase() })
      .populate('followers', 'username fullName avatar isIdentityVerified')
      .populate('following', 'username fullName avatar isIdentityVerified');

    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

    const profile = user.toSafeObject();

    // Follow-request relationship status relative to the viewer (skip for own profile)
    if (String(user._id) !== String(req.user._id)) {
      const isFollowing = user.followers.some((f) => String(f._id) === String(req.user._id));

      if (isFollowing) {
        profile.relationship = 'following';
      } else {
        const outgoing = await FriendRequest.findOne({ sender: req.user._id, recipient: user._id, status: 'pending' });
        const incoming = await FriendRequest.findOne({ sender: user._id, recipient: req.user._id, status: 'pending' });

        if (outgoing) {
          profile.relationship = 'requested';
        } else if (incoming) {
          profile.relationship = 'incoming_request';
          profile.incomingRequestId = incoming._id;
        } else {
          profile.relationship = 'none';
        }
      }
    }

    res.status(200).json({ success: true, user: profile });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['fullName', 'bio', 'location', 'website', 'themePreference'];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({ success: true, message: 'Profile updated.', user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/avatar  (multipart upload via 'upload' middleware)
 */
const updateAvatar = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });

    const user = await User.findById(req.user._id);
    user.avatar = { url: req.file.path, publicId: req.file.filename };
    await user.save();

    res.status(200).json({ success: true, message: 'Avatar updated.', user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/cover
 */
const updateCoverPhoto = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No image uploaded.' });

    const user = await User.findById(req.user._id);
    user.coverPhoto = { url: req.file.path, publicId: req.file.filename };
    await user.save();

    res.status(200).json({ success: true, message: 'Cover photo updated.', user: user.toSafeObject() });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:userId/posts  (Posts tab)
 * GET /api/users/:userId/media  (Media tab - photo/video posts only)
 * GET /api/users/:userId/saved  (Saved tab - own posts only)
 */
const getProfilePosts = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { tab = 'posts' } = req.query;

    let filter = { author: userId, 'moderation.status': { $ne: 'rejected' } };
    if (tab === 'media') filter.type = { $in: ['photo', 'video'] };

    let posts;
    if (tab === 'saved') {
      if (String(req.user._id) !== String(userId)) {
        return res.status(403).json({ success: false, message: 'You can only view your own saved posts.' });
      }
      posts = await Post.find({ savedBy: userId }).sort({ createdAt: -1 }).populate('author', 'username fullName avatar isIdentityVerified');
    } else {
      posts = await Post.find(filter).sort({ createdAt: -1 }).populate('author', 'username fullName avatar isIdentityVerified');
    }

    res.status(200).json({ success: true, count: posts.length, posts });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/:userId/reels  (Reels tab)
 */
const getProfileReels = async (req, res, next) => {
  try {
    const reels = await Reel.find({ creator: req.params.userId, 'moderation.status': { $ne: 'rejected' } })
      .sort({ createdAt: -1 })
      .populate('creator', 'username fullName avatar isIdentityVerified');

    res.status(200).json({ success: true, count: reels.length, reels });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/:userId/follow
 * Sends a follow request rather than following instantly. The target
 * only appears in "Following" once they Accept it (see respondFriendRequest).
 */
const followUser = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    if (String(targetId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot follow yourself.' });
    }

    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const me = req.user;
    if (me.following.includes(targetId)) {
      return res.status(409).json({ success: false, message: 'You already follow this user.' });
    }

    const existingOutgoing = await FriendRequest.findOne({ sender: me._id, recipient: targetId, status: 'pending' });
    if (existingOutgoing) {
      return res.status(409).json({ success: false, message: 'Follow request already sent.' });
    }

    // They already sent YOU a request — accept it instead of creating a
    // second, redundant one in the other direction.
    const existingIncoming = await FriendRequest.findOne({ sender: targetId, recipient: me._id, status: 'pending' });
    if (existingIncoming) {
      existingIncoming.status = 'accepted';
      await existingIncoming.save();

      if (!me.following.includes(target._id)) me.following.push(target._id);
      if (!target.following.includes(me._id)) target.following.push(me._id);
      if (!me.followers.includes(target._id)) me.followers.push(target._id);
      if (!target.followers.includes(me._id)) target.followers.push(me._id);
      await me.save();
      await target.save();

      await Notification.create({
        recipient: target._id,
        sender: me._id,
        type: 'friend_request_accepted',
        text: `${me.fullName} accepted your follow request.`,
      });

      return res.status(200).json({ success: true, status: 'following', message: `You are now following ${target.username}.` });
    }

    await FriendRequest.create({ sender: me._id, recipient: target._id, status: 'pending' });

    await Notification.create({
      recipient: target._id,
      sender: me._id,
      type: 'friend_request',
      text: `${me.fullName} wants to follow you.`,
    });

    res.status(201).json({ success: true, status: 'requested', message: 'Follow request sent.' });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/users/:userId/follow
 * If already following: unfollows (removes the mutual connection).
 * If a follow request is still pending: cancels it instead.
 */
const unfollowUser = async (req, res, next) => {
  try {
    const targetId = req.params.userId;
    const target = await User.findById(targetId);
    if (!target) return res.status(404).json({ success: false, message: 'User not found.' });

    const me = req.user;

    if (me.following.includes(targetId)) {
      me.following = me.following.filter((id) => String(id) !== String(targetId));
      target.followers = target.followers.filter((id) => String(id) !== String(me._id));
      // Mutual — also drop the reverse direction so it's a clean unfriend
      me.followers = me.followers.filter((id) => String(id) !== String(targetId));
      target.following = target.following.filter((id) => String(id) !== String(me._id));
      await me.save();
      await target.save();

      await FriendRequest.deleteMany({
        $or: [
          { sender: me._id, recipient: targetId },
          { sender: targetId, recipient: me._id },
        ],
      });

      return res.status(200).json({ success: true, status: 'none', message: `You unfollowed ${target.username}.` });
    }

    const pending = await FriendRequest.findOne({ sender: me._id, recipient: targetId, status: 'pending' });
    if (pending) {
      await FriendRequest.deleteOne({ _id: pending._id });
      return res.status(200).json({ success: true, status: 'none', message: 'Follow request cancelled.' });
    }

    return res.status(400).json({ success: false, message: 'You are not following this user.' });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/:userId/friend-request
 */
const sendFriendRequest = async (req, res, next) => {
  try {
    const recipientId = req.params.userId;
    if (String(recipientId) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: 'You cannot send a friend request to yourself.' });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { sender: req.user._id, recipient: recipientId },
        { sender: recipientId, recipient: req.user._id },
      ],
      status: 'pending',
    });
    if (existing) return res.status(409).json({ success: false, message: 'A friend request already exists between these users.' });

    const fr = await FriendRequest.create({ sender: req.user._id, recipient: recipientId });

    await Notification.create({
      recipient: recipientId,
      sender: req.user._id,
      type: 'friend_request',
      text: `${req.user.fullName} sent you a friend request.`,
    });

    res.status(201).json({ success: true, message: 'Friend request sent.', friendRequest: fr });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/users/friend-request/:requestId/respond
 * Body: { action: 'accept' | 'decline' }
 */
const respondFriendRequest = async (req, res, next) => {
  try {
    const { action } = req.body;
    const fr = await FriendRequest.findById(req.params.requestId);
    if (!fr) return res.status(404).json({ success: false, message: 'Friend request not found.' });

    if (String(fr.recipient) !== String(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to respond to this request.' });
    }

    if (action === 'accept') {
      fr.status = 'accepted';
      // mutual follow
      const sender = await User.findById(fr.sender);
      const recipient = req.user;
      if (!sender.following.includes(recipient._id)) sender.following.push(recipient._id);
      if (!recipient.following.includes(sender._id)) recipient.following.push(sender._id);
      if (!sender.followers.includes(recipient._id)) sender.followers.push(recipient._id);
      if (!recipient.followers.includes(sender._id)) recipient.followers.push(sender._id);
      await sender.save();
      await recipient.save();
      await fr.save();

      await Notification.create({
        recipient: fr.sender,
        sender: req.user._id,
        type: 'friend_request_accepted',
        text: `${req.user.fullName} accepted your follow request.`,
      });

      return res.status(200).json({ success: true, message: 'Follow request accepted.', friendRequest: fr });
    }

    // Reject — the request is deleted entirely, not just marked declined
    await FriendRequest.deleteOne({ _id: fr._id });
    res.status(200).json({ success: true, message: 'Follow request rejected.' });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/friend-requests
 */
const getFriendRequests = async (req, res, next) => {
  try {
    const requests = await FriendRequest.find({ recipient: req.user._id, status: 'pending' })
      .populate('sender', 'username fullName avatar isIdentityVerified')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/suggestions
 * Suggested friends: users not already followed, prioritizing verified accounts.
 */
const getSuggestedFriends = async (req, res, next) => {
  try {
    const me = req.user;
    const excludeIds = [...me.following, me._id];

    const suggestions = await User.find({ _id: { $nin: excludeIds }, status: 'active' })
      .sort({ isIdentityVerified: -1, followers: -1, createdAt: -1 })
      .limit(10)
      .select('username fullName avatar isIdentityVerified bio');

    res.status(200).json({ success: true, count: suggestions.length, suggestions });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/users/dashboard
 * Aggregated data for the user dashboard.
 */
const getDashboard = async (req, res, next) => {
  try {
    const me = req.user;

    const [recentPosts, trendingReels, friendRequests, suggestions] = await Promise.all([
      Post.find({ author: { $in: [...me.following, me._id] }, 'moderation.status': 'approved' })
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('author', 'username fullName avatar isIdentityVerified'),
      Reel.find({ 'moderation.status': 'approved' })
        .sort({ views: -1, createdAt: -1 })
        .limit(6)
        .populate('creator', 'username fullName avatar isIdentityVerified'),
      FriendRequest.find({ recipient: me._id, status: 'pending' })
        .populate('sender', 'username fullName avatar isIdentityVerified')
        .limit(5),
      User.find({ _id: { $nin: [...me.following, me._id] }, status: 'active' })
        .sort({ isIdentityVerified: -1 })
        .limit(5)
        .select('username fullName avatar isIdentityVerified'),
    ]);

    res.status(200).json({
      success: true,
      dashboard: {
        profileCompletion: me.getProfileCompletion(),
        verificationStatus: me.verificationStatus,
        isIdentityVerified: me.isIdentityVerified,
        recentPosts,
        trendingReels,
        friendRequests,
        suggestedFriends: suggestions,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/users/verification-request (multipart: documentFront, documentBack, selfie)
 */
const submitVerificationRequest = async (req, res, next) => {
  try {
    const files = req.files || {};
    if (!files.documentFront) {
      return res.status(400).json({ success: false, message: 'A front-facing document image is required.' });
    }

    const existing = await VerificationRequest.findOne({ user: req.user._id, status: 'pending' });
    if (existing) {
      return res.status(409).json({ success: false, message: 'You already have a pending verification request.' });
    }

    const vr = await VerificationRequest.create({
      user: req.user._id,
      documentType: req.body.documentType || 'government_id',
      documentFront: { url: files.documentFront[0].path, publicId: files.documentFront[0].filename },
      documentBack: files.documentBack
        ? { url: files.documentBack[0].path, publicId: files.documentBack[0].filename }
        : undefined,
      selfie: files.selfie ? { url: files.selfie[0].path, publicId: files.selfie[0].filename } : undefined,
    });

    req.user.verificationStatus = 'pending';
    await req.user.save();

    res.status(201).json({ success: true, message: 'Verification request submitted for review.', request: vr });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};
