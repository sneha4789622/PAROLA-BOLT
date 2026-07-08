const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  createPost, getFeed, getPost,
  toggleLike, addComment, sharePost, toggleSave,
  reportPost, deletePost,
  editPost, editComment, deleteComment,
} = require('../controllers/postController');

router.use(protect);

router.get('/feed', getFeed);
router.post('/', upload.array('media', 10), createPost);
router.get('/:postId', getPost);
router.put('/:postId', editPost);
router.delete('/:postId', deletePost);
router.put('/:postId/like', toggleLike);
router.post('/:postId/comments', addComment);
router.put('/:postId/comments/:commentId', editComment);
router.delete('/:postId/comments/:commentId', deleteComment);
router.post('/:postId/share', sharePost);
router.put('/:postId/save', toggleSave);
router.post('/:postId/report', reportPost);

module.exports = router;
