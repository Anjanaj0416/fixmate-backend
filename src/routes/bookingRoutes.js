const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   POST /api/bookings
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

/**
 * @route   GET /api/bookings
 * @desc    Get all bookings (with filters)
 * @access  Private
 */
router.get('/', authMiddleware, bookingController.getBookings);

/**
 * @route   GET /api/bookings/stats
 * @desc    Get booking statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, bookingController.getBookingStats);

/**
 * @route   GET /api/bookings/:id
 * @desc    Get booking by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, bookingController.getBookingById);

/**
 * @route   PUT /api/bookings/:id/status
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
 * @route   PUT /api/bookings/:id/accept
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
 * @route   PUT /api/bookings/:id/decline
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
 * @route   PUT /api/bookings/:id/cancel
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
 * @route   POST /api/bookings/:id/quote
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
 * @route   POST /api/bookings/:id/progress
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

module.exports = router;