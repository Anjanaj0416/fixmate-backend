const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');
const { uploadReviewImages } = require('../middleware/upload');

/**
 * Review Routes
 * Base path: /api/v1/reviews (configured in main app.js)
 * 
 * ✅ IMPORTANT: Make sure your app.js has:
 * app.use('/api/v1/reviews', reviewRoutes);
 */

// ============================================
// PUBLIC ROUTES (No authentication required)
// ============================================

/**
 * @route   GET /api/v1/reviews/worker/:workerId
 * @desc    Get reviews for a worker (Public access for customer viewing)
 * @access  Public
 * 
 * ✅ IMPORTANT: This MUST come BEFORE /reviews/:id route
 * Otherwise Express will treat "worker" as an ID
 */
router.get('/worker/:workerId', reviewController.getWorkerReviews);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
router.get('/:id', reviewController.getReviewById);

// ============================================
// PRIVATE ROUTES (Authentication required)
// ============================================

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a review with images
 * @access  Private/Customer
 * 
 * ✅ FIXED: Added uploadReviewImages middleware to handle file uploads
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['customer']),
  uploadReviewImages,
  validateRequest([
    'body.bookingId',
    'body.workerId',
    'body.rating',
    'body.comment'
  ]),
  reviewController.createReview
);

/**
 * @route   GET /api/v1/reviews/booking/:bookingId
 * @desc    Get review for a specific booking
 * @access  Private
 */
router.get(
  '/booking/:bookingId',
  authMiddleware,
  reviewController.getBookingReview
);

/**
 * @route   GET /api/v1/reviews/my-reviews
 * @desc    Get customer's reviews
 * @access  Private/Customer
 */
router.get(
  '/my-reviews',
  authMiddleware,
  roleMiddleware(['customer']),
  reviewController.getMyReviews
);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update review
 * @access  Private/Customer
 */
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['customer']),
  uploadReviewImages,
  reviewController.updateReview
);

/**
 * @route   DELETE /api/v1/reviews/:id
 * @desc    Delete review
 * @access  Private/Customer
 */
router.delete(
  '/:id',
  authMiddleware,
  roleMiddleware(['customer']),
  reviewController.deleteReview
);

/**
 * @route   POST /api/v1/reviews/:id/response
 * @desc    Worker response to review
 * @access  Private/Worker
 */
router.post(
  '/:id/response',
  authMiddleware,
  roleMiddleware(['worker']),
  validateRequest(['body.message']),
  reviewController.respondToReview
);

/**
 * @route   POST /api/v1/reviews/:id/helpful
 * @desc    Mark review as helpful
 * @access  Private
 */
router.post(
  '/:id/helpful',
  authMiddleware,
  reviewController.markHelpful
);

/**
 * @route   POST /api/v1/reviews/:id/flag
 * @desc    Flag review for moderation
 * @access  Private
 */
router.post(
  '/:id/flag',
  authMiddleware,
  validateRequest(['body.reason']),
  reviewController.flagReview
);

/**
 * @route   POST /api/v1/reviews/rate-customer
 * @desc    Worker rates a customer after completing a booking
 * @access  Private/Worker
 */
router.post(
  '/rate-customer',
  authMiddleware,
  roleMiddleware(['worker']),
  validateRequest([
    'body.bookingId',
    'body.customerId',
    'body.rating'
  ]),
  reviewController.rateCustomer
);

module.exports = router;