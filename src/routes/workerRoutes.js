const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

/**
 * @route   GET /api/workers
 * @desc    Get all workers with filters
 * @access  Public
 */
router.get('/', workerController.getWorkers);

/**
 * @route   GET /api/workers/search
 * @desc    Search workers with advanced filters
 * @access  Public
 */
router.get('/search', workerController.searchWorkers);

/**
 * @route   GET /api/workers/stats
 * @desc    Get worker statistics
 * @access  Private/Worker
 */
router.get(
  '/stats',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.getWorkerStats
);

/**
 * @route   GET /api/workers/:id
 * @desc    Get worker by ID
 * @access  Public
 */
router.get('/:id', workerController.getWorkerById);

/**
 * @route   PUT /api/workers/profile
 * @desc    Create/Update worker profile
 * @access  Private/Worker
 */
router.put(
  '/profile',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.updateWorkerProfile
);

/**
 * @route   POST /api/workers/portfolio
 * @desc    Add portfolio image
 * @access  Private/Worker
 */
router.post(
  '/portfolio',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.addPortfolioImage
);

/**
 * @route   DELETE /api/workers/portfolio/:imageId
 * @desc    Remove portfolio image
 * @access  Private/Worker
 */
router.delete(
  '/portfolio/:imageId',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.removePortfolioImage
);

/**
 * @route   PUT /api/workers/availability
 * @desc    Update availability status
 * @access  Private/Worker
 */
router.put(
  '/availability',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.updateAvailability
);

/**
 * @route   GET /api/workers/:id/reviews
 * @desc    Get worker reviews
 * @access  Public
 */
router.get('/:id/reviews', workerController.getWorkerReviews);

/**
 * @route   POST /api/workers/certifications
 * @desc    Add certification
 * @access  Private/Worker
 */
router.post(
  '/certifications',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.addCertification
);

/**
 * @route   PUT /api/workers/bank-details
 * @desc    Update bank details for payouts
 * @access  Private/Worker
 */
router.put(
  '/bank-details',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.updateBankDetails
);

module.exports = router;