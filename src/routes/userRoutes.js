const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

/**
 * @route   GET /api/users/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', authMiddleware, userController.getCurrentUser);

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 * @access  Public
 */
router.get('/:id', userController.getUserById);

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authMiddleware, userController.updateProfile);

/**
 * @route   PUT /api/users/profile-image
 * @desc    Update profile image
 * @access  Private
 */
router.put('/profile-image', authMiddleware, userController.updateProfileImage);

/**
 * @route   PUT /api/users/location
 * @desc    Update user location
 * @access  Private
 */
router.put('/location', authMiddleware, userController.updateLocation);

/**
 * @route   PUT /api/users/notification-settings
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  '/notification-settings',
  authMiddleware,
  userController.updateNotificationSettings
);

/**
 * @route   GET /api/users/stats
 * @desc    Get user statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, userController.getUserStats);

/**
 * @route   GET /api/users/search
 * @desc    Search users (Admin only)
 * @access  Private/Admin
 */
router.get(
  '/search',
  authMiddleware,
  roleMiddleware(['admin']),
  userController.searchUsers
);

/**
 * @route   GET /api/users/nearby
 * @desc    Get nearby users (for location-based features)
 * @access  Private
 */
router.get('/nearby', authMiddleware, userController.getNearbyUsers);

/**
 * @route   POST /api/users/:id/report
 * @desc    Report a user
 * @access  Private
 */
router.post('/:id/report', authMiddleware, userController.reportUser);

/**
 * @route   POST /api/users/:id/block
 * @desc    Block a user
 * @access  Private
 */
router.post('/:id/block', authMiddleware, userController.blockUser);

module.exports = router;