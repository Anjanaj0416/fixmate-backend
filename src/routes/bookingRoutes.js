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
 * @route   POST /api/v1/bookings/quote-request
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
 * @route   GET /api/v1/bookings/my-quotes
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
 * @route   GET /api/v1/bookings/received-quotes
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
 * @route   GET /api/v1/bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, bookingController.getBookingStats);

/**
 * @route   GET /api/v1/bookings
 * @desc    Get all bookings (with filters)
 * @access  Private
 */
router.get('/', authMiddleware, bookingController.getBookings);

/**
 * @route   POST /api/v1/bookings
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
 * @route   POST /api/v1/bookings/:id/send-to-worker
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
 * @route   PUT /api/v1/bookings/:id/respond
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
 * @route   POST /api/v1/bookings/:id/quote
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
 * @route   POST /api/v1/bookings/:id/progress
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
 * @route   PUT /api/v1/bookings/:id/accept
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
 * @route   PUT /api/v1/bookings/:id/decline
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
 * @route   PUT /api/v1/bookings/:id/cancel
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
 * @route   PUT /api/v1/bookings/:id/status
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
 * @route   GET /api/v1/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, bookingController.getBookingById);

module.exports = router;