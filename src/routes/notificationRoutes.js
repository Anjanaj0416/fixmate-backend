const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   GET /api/notifications
 * @desc    Get user notifications
 * @access  Private
 */
router.get('/', authMiddleware, notificationController.getNotifications);

/**
 * @route   GET /api/notifications/unread-count
 * @desc    Get unread notification count
 * @access  Private
 */
router.get('/unread-count', authMiddleware, notificationController.getUnreadCount);

/**
 * @route   GET /api/notifications/settings
 * @desc    Get notification settings
 * @access  Private
 */
router.get(
  '/settings',
  authMiddleware,
  notificationController.getNotificationSettings
);

/**
 * @route   PUT /api/notifications/settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  '/settings',
  authMiddleware,
  validateRequest([
    'body.pushEnabled',
    'body.emailEnabled',
    'body.smsEnabled'
  ]),
  notificationController.updateNotificationSettings
);

/**
 * @route   PUT /api/notifications/:id/read
 * @desc    Mark notification as read
 * @access  Private
 */
router.put('/:id/read', authMiddleware, notificationController.markAsRead);

/**
 * @route   PUT /api/notifications/read-all
 * @desc    Mark all notifications as read
 * @access  Private
 */
router.put('/read-all', authMiddleware, notificationController.markAllAsRead);

/**
 * @route   DELETE /api/notifications/:id
 * @desc    Delete notification
 * @access  Private
 */
router.delete('/:id', authMiddleware, notificationController.deleteNotification);

/**
 * @route   DELETE /api/notifications/clear-all
 * @desc    Clear all notifications
 * @access  Private
 */
router.delete('/clear-all', authMiddleware, notificationController.clearAllNotifications);

/**
 * @route   POST /api/notifications/send
 * @desc    Send push notification (Admin/Testing)
 * @access  Private/Admin
 */
router.post(
  '/send',
  authMiddleware,
  roleMiddleware(['admin']),
  validateRequest(['body.userId', 'body.title', 'body.message']),
  notificationController.sendPushNotification
);

module.exports = router;