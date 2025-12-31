const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');

// ============================================
// IMPORTANT: SPECIFIC ROUTES MUST COME FIRST
// Place routes with specific paths BEFORE routes with :id parameters
// ============================================

/**
 * @route   POST /bookings/quote-request
 * @desc    Create a new quote request
 * @access  Private/Customer
 */
router.post(
  '/quote-request',
  authMiddleware,
  roleMiddleware(['customer']),
  bookingController.createQuoteRequest
);

/**
 * @route   GET /bookings/my-quotes
 * @desc    Get customer's quote requests
 * @access  Private/Customer
 */
router.get(
  '/my-quotes',
  authMiddleware,
  roleMiddleware(['customer']),
  bookingController.getCustomerQuoteRequests
);

/**
 * @route   GET /bookings/received-quotes
 * @desc    Get worker's received quote requests
 * @access  Private/Worker
 */
router.get(
  '/received-quotes',
  authMiddleware,
  roleMiddleware(['worker']),
  bookingController.getWorkerReceivedQuotes
);

/**
 * @route   GET /bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, bookingController.getBookingStats);

/**
 * ✅ FIX: Add /my route for frontend compatibility
 * @route   GET /bookings/my
 * @desc    Get current user's bookings (role-based filtering)
 * @access  Private
 */
router.get('/my', authMiddleware, bookingController.getBookings);

/**
 * @route   GET /bookings
 * @desc    Get all bookings (with filters)
 * @access  Private
 */
router.get('/', authMiddleware, bookingController.getBookings);

/**
 * @route   POST /bookings
 * @desc    Create a new booking
 * @access  Private/Customer
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['customer']),
  validateRequest([
    'body.workerId',
    'body.serviceType',
    'body.problemDescription',
    'body.serviceLocation',
    'body.scheduledDate'
  ]),
  bookingController.createBooking
);

// ============================================
// ROUTES WITH :id PARAMETER - MUST BE LAST
// These routes should come AFTER all specific routes
// ============================================

/**
 * @route   POST /bookings/:id/send-to-worker
 * @desc    Send quote request to specific worker
 * @access  Private/Customer
 * 
 * ✅ ADD THIS ROUTE AFTER THE /quote-request ROUTE
 */
router.post(
  '/:id/send-to-worker',
  authMiddleware,
  roleMiddleware(['customer']),
  bookingController.sendQuoteToWorker
);
/**
 * @route   PUT /bookings/:id/respond
 * @desc    Worker responds to quote request (accept/decline)
 * @access  Private/Worker
 */
router.put(
  '/:id/respond',
  authMiddleware,
  roleMiddleware(['worker']),
  bookingController.respondToQuoteRequest
);

/**
 * @route   POST /bookings/:id/quote
 * @desc    Create quote for booking
 * @access  Private/Worker
 */
router.post(
  '/:id/quote',
  authMiddleware,
  roleMiddleware(['worker']),
  validateRequest([
    'body.totalAmount',
    'body.breakdown',
    'body.validUntil'
  ]),
  bookingController.createQuote
);

/**
 * @route   POST /bookings/:id/progress
 * @desc    Update work progress
 * @access  Private/Worker
 */
router.post(
  '/:id/progress',
  authMiddleware,
  roleMiddleware(['worker']),
  validateRequest(['body.status', 'body.note']),
  bookingController.updateWorkProgress
);

/**
 * @route   PUT /bookings/:id/accept
 * @desc    Worker accepts booking
 * @access  Private/Worker
 */
router.put(
  '/:id/accept',
  authMiddleware,
  roleMiddleware(['worker']),
  bookingController.acceptBooking
);

/**
 * @route   PUT /bookings/:id/decline
 * @desc    Worker declines booking
 * @access  Private/Worker
 */
router.put(
  '/:id/decline',
  authMiddleware,
  roleMiddleware(['worker']),
  validateRequest(['body.reason']),
  bookingController.declineBooking
);

/**
 * @route   PUT /bookings/:id/cancel
 * @desc    Cancel booking
 * @access  Private
 */
router.put(
  '/:id/cancel',
  authMiddleware,
  validateRequest(['body.reason']),
  bookingController.cancelBooking
);

/**
 * @route   PUT /bookings/:id/status
 * @desc    Update booking status
 * @access  Private
 */
router.put(
  '/:id/status',
  authMiddleware,
  validateRequest(['body.status']),
  bookingController.updateBookingStatus
);

/**
 * @route   GET /bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, bookingController.getBookingById);

module.exports = router;