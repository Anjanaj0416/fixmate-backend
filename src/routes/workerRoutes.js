const express = require('express');
const router = express.Router();
const workerController = require('../controllers/workerController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');

/**
 * ========================================
 * IMPORTANT: SPECIFIC ROUTES FIRST!
 * Place routes with specific paths BEFORE routes with :id parameters
 * ========================================
 */

/**
 * @route   GET /workers/nearby
 * @desc    Get nearby workers by location and service type
 * @access  Private
 */
router.get('/nearby', authMiddleware, workerController.getNearbyWorkers);

/**
 * @route   GET /workers/search
 * @desc    Search workers by service type and location
 * @access  Public/Private
 */
router.get('/search', workerController.searchWorkers);

/**
 * @route   GET /workers/stats
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
 * ⭐ CRITICAL FIX: Worker's OWN profile (authenticated)
 * @route   GET /workers/profile
 * @desc    Get current worker's own profile
 * @access  Private/Worker
 * 
 * IMPORTANT: This route MUST come BEFORE /:id routes
 * Calls getWorkerOwnProfile function (gets worker from auth token, not from URL params)
 */
router.get(
  '/profile',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.getWorkerOwnProfile  // ✅ CORRECT FUNCTION - uses req.user._id
);

/**
 * @route   PUT /workers/profile
 * @desc    Update worker profile
 * @access  Private/Worker
 */
router.put(
  '/profile',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.updateWorkerProfile
);

/**
 * @route   GET /workers
 * @desc    Get all workers with filters
 * @access  Public
 */
router.get('/', workerController.getWorkers);

/**
 * ========================================
 * DYNAMIC ROUTES - MUST BE LAST!
 * ========================================
 */

/**
 * @route   GET /workers/:id
 * @desc    Get worker by ID
 * @access  Public
 */
router.get('/:id', workerController.getWorkerById);

/**
 * @route   GET /workers/:id/profile
 * @desc    Get worker profile by ID (for customers to view)
 * @access  Public
 */
router.get('/:id/profile', workerController.getWorkerProfileById);

/**
 * @route   GET /workers/:id/reviews
 * @desc    Get worker reviews
 * @access  Public
 */
router.get('/:id/reviews', workerController.getWorkerReviews);

/**
 * @route   POST /workers/portfolio
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
 * @route   DELETE /workers/portfolio/:imageId
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
 * @route   PUT /workers/availability
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
 * @route   POST /workers/certifications
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
 * @route   PUT /workers/bank-details
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