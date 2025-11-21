const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');

// Apply authentication and admin role to all routes
router.use(authMiddleware);
router.use(roleMiddleware(['admin']));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Get dashboard statistics
 * @access  Private/Admin
 */
router.get('/dashboard', adminController.getDashboardStats);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data
 * @access  Private/Admin
 */
router.get('/analytics', adminController.getAnalytics);

/**
 * @route   GET /api/admin/users
 * @desc    Get all users
 * @access  Private/Admin
 */
router.get('/users', adminController.getAllUsers);

/**
 * @route   PUT /api/admin/users/:id/suspend
 * @desc    Suspend user account
 * @access  Private/Admin
 */
router.put(
  '/users/:id/suspend',
  validateRequest(['body.reason']),
  adminController.suspendUser
);

/**
 * @route   PUT /api/admin/users/:id/reactivate
 * @desc    Reactivate user account
 * @access  Private/Admin
 */
router.put('/users/:id/reactivate', adminController.reactivateUser);

/**
 * @route   DELETE /api/admin/users/:id
 * @desc    Delete user account
 * @access  Private/Admin
 */
router.delete('/users/:id', adminController.deleteUser);

/**
 * @route   GET /api/admin/reviews
 * @desc    Get all reviews for moderation
 * @access  Private/Admin
 */
router.get('/reviews', adminController.getAllReviews);

/**
 * @route   PUT /api/admin/reviews/:id/moderate
 * @desc    Moderate review
 * @access  Private/Admin
 */
router.put(
  '/reviews/:id/moderate',
  validateRequest(['body.status']),
  adminController.moderateReview
);

/**
 * @route   PUT /api/admin/workers/:id/verify
 * @desc    Verify worker profile
 * @access  Private/Admin
 */
router.put('/workers/:id/verify', adminController.verifyWorker);

/**
 * @route   GET /api/admin/bookings
 * @desc    Get all bookings
 * @access  Private/Admin
 */
router.get('/bookings', adminController.getAllBookings);

module.exports = router;