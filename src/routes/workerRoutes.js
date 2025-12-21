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
 * ✅ NEW ROUTE - Get nearby workers
 * @route   GET /workers/nearby
 * @desc    Get nearby workers by location and service type
 * @access  Private
 */
router.get('/nearby', authMiddleware, workerController.getNearbyWorkers);

/**
 * @route   GET /workers/search
 * @desc    Search workers by service type and location
 * @access  Public/Private
 * 
 * ✅ ADD THIS ROUTE BEFORE ANY /:id ROUTES
 */
router.get(
  '/search',
  workerController.searchWorkers
);

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
 * @route   GET /workers/profile
 * @desc    Get current worker's profile
 * @access  Private/Worker
 * 
 * IMPORTANT: This route MUST come BEFORE the /:id route
 * Otherwise /:id will match "/profile" and treat "profile" as an ID
 */
router.get(
  '/profile',
  authMiddleware,
  roleMiddleware(['worker']),
  workerController.getWorkerProfile
);

/**
 * @route   GET /api/workers
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
 * @route   GET /api/workers/:id
 * @desc    Get worker by ID
 * @access  Public
 * 
 * IMPORTANT: This dynamic route should come AFTER specific routes
 */
router.get('/:id', workerController.getWorkerById);

/**
 * @route   GET /api/workers/:id/reviews
 * @desc    Get worker reviews
 * @access  Public
 */
router.get('/:id/reviews', workerController.getWorkerReviews);

/**
 * ========================================
 * UPDATE/CREATE ROUTES
 * ========================================
 */

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
 * @route   GET /workers/:id/profile
 * @desc    Get worker profile (for customers to view)
 * @access  Public/Private
 * 
 * ✅ ADD THIS ROUTE
 */
router.get(
  '/:id/profile',
  workerController.getWorkerProfile
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