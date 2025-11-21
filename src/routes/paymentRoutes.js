const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   POST /api/payments
 * @desc    Create payment
 * @access  Private/Customer
 */
router.post(
  '/',
  authMiddleware,
  roleMiddleware(['customer']),
  validateRequest([
    'body.bookingId',
    'body.amount',
    'body.paymentMethod'
  ]),
  paymentController.createPayment
);

/**
 * @route   GET /api/payments
 * @desc    Get all payments for user
 * @access  Private
 */
router.get('/', authMiddleware, paymentController.getPayments);

/**
 * @route   GET /api/payments/stats
 * @desc    Get payment statistics
 * @access  Private
 */
router.get('/stats', authMiddleware, paymentController.getPaymentStats);

/**
 * @route   GET /api/payments/earnings
 * @desc    Get earnings statistics (Worker)
 * @access  Private/Worker
 */
router.get(
  '/earnings',
  authMiddleware,
  roleMiddleware(['worker']),
  paymentController.getEarnings
);

/**
 * @route   GET /api/payments/:id
 * @desc    Get payment by ID
 * @access  Private
 */
router.get('/:id', authMiddleware, paymentController.getPaymentById);

/**
 * @route   PUT /api/payments/:id/confirm
 * @desc    Confirm payment (mark as completed)
 * @access  Private/Customer
 */
router.put(
  '/:id/confirm',
  authMiddleware,
  roleMiddleware(['customer']),
  paymentController.confirmPayment
);

/**
 * @route   POST /api/payments/:id/refund
 * @desc    Request refund
 * @access  Private/Customer
 */
router.post(
  '/:id/refund',
  authMiddleware,
  roleMiddleware(['customer']),
  validateRequest(['body.reason']),
  paymentController.requestRefund
);

/**
 * @route   POST /api/payments/:id/payout
 * @desc    Initiate payout to worker (Admin)
 * @access  Private/Admin
 */
router.post(
  '/:id/payout',
  authMiddleware,
  roleMiddleware(['admin']),
  paymentController.initiatePayout
);

module.exports = router;