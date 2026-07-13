const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const {
  getOrCreateOneToOneChat,
  createGroupChat,
  getMyChats,
  addGroupMembers,
  leaveGroup,
} = require('../controllers/chatController');
const { getMessages, sendMessage, reactToMessage, markChatAsRead, editMessage, deleteMessage } = require('../controllers/messageController');

router.use(protect);

router.get('/', getMyChats);
router.post('/', getOrCreateOneToOneChat);
router.post('/group', createGroupChat);
router.put('/:chatId/group/add', addGroupMembers);
router.delete('/:chatId/group/leave', leaveGroup);

router.get('/:chatId/messages', getMessages);
router.post('/:chatId/messages', upload.single('media'), sendMessage);
router.put('/:chatId/read', markChatAsRead);
router.put('/messages/:messageId/react', reactToMessage);
router.put('/messages/:messageId', editMessage);
router.delete('/messages/:messageId', deleteMessage);

module.exports = router;
