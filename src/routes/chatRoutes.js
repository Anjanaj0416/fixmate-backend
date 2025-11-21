const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   POST /api/chat/messages
 * @desc    Send a message
 * @access  Private
 */
router.post(
  '/messages',
  authMiddleware,
  validateRequest(['body.receiverId', 'body.message']),
  chatController.sendMessage
);

/**
 * @route   GET /api/chat/conversations
 * @desc    Get all conversations
 * @access  Private
 */
router.get('/conversations', authMiddleware, chatController.getConversations);

/**
 * @route   GET /api/chat/conversations/:userId
 * @desc    Get conversation messages with a specific user
 * @access  Private
 */
router.get(
  '/conversations/:userId',
  authMiddleware,
  chatController.getConversation
);

/**
 * @route   PUT /api/chat/messages/read
 * @desc    Mark messages as read
 * @access  Private
 */
router.put(
  '/messages/read',
  authMiddleware,
  validateRequest(['body.conversationId']),
  chatController.markAsRead
);

/**
 * @route   DELETE /api/chat/messages/:id
 * @desc    Delete message
 * @access  Private
 */
router.delete('/messages/:id', authMiddleware, chatController.deleteMessage);

/**
 * @route   GET /api/chat/unread-count
 * @desc    Get unread message count
 * @access  Private
 */
router.get('/unread-count', authMiddleware, chatController.getUnreadCount);

/**
 * @route   GET /api/chat/search
 * @desc    Search messages
 * @access  Private
 */
router.get('/search', authMiddleware, chatController.searchMessages);

/**
 * @route   POST /api/chat/messages/:id/reaction
 * @desc    Add reaction to message
 * @access  Private
 */
router.post(
  '/messages/:id/reaction',
  authMiddleware,
  validateRequest(['body.emoji']),
  chatController.addReaction
);

module.exports = router;