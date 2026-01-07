const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');
const multer = require('multer');
const path = require('path');

// ============================================
// MULTER CONFIGURATION FOR IMAGE UPLOADS
// ============================================
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/reviews/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'review-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images only
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed!'), false);
  }
};

const upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  }
});

// ============================================
// REVIEW ROUTES
// ============================================

/**
 * @route   POST /api/v1/reviews
 * @desc    Create a review
 * @access  Private/Customer
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['customer']),
  upload.array('images', 5), // Allow up to 5 images
  reviewController.createReview
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
 * @route   GET /api/v1/reviews/worker/:workerId
 * @desc    Get reviews for a worker
 * @access  Public
 */
router.get('/worker/:workerId', reviewController.getWorkerReviews);

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
 * @route   GET /api/v1/reviews/booking/:bookingId/can-review
 * @desc    Check if booking can be reviewed
 * @access  Private
 */
router.get(
  '/booking/:bookingId/can-review',
  authMiddleware,
  reviewController.canReviewBooking
);

/**
 * @route   GET /api/v1/reviews/:id
 * @desc    Get review by ID
 * @access  Public
 */
router.get('/:id', reviewController.getReviewById);

/**
 * @route   PUT /api/v1/reviews/:id
 * @desc    Update review
 * @access  Private/Customer
 */
router.put(
  '/:id',
  authMiddleware,
  roleMiddleware(['customer']),
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
router.post('/:id/helpful', authMiddleware, reviewController.markHelpful);

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