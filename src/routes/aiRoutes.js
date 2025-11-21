const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   POST /api/ai/analyze-image
 * @desc    Analyze problem image with AI
 * @access  Private
 */
router.post(
  '/analyze-image',
  authMiddleware,
  validateRequest(['body.imageUrl']),
  aiController.analyzeImage
);

/**
 * @route   POST /api/ai/recommend-workers
 * @desc    Get AI recommendations for workers
 * @access  Private
 */
router.post(
  '/recommend-workers',
  authMiddleware,
  validateRequest([
    'body.serviceType',
    'body.location',
    'body.problemDescription'
  ]),
  aiController.recommendWorkers
);

/**
 * @route   POST /api/ai/suggest-category
 * @desc    Get service category suggestions based on text
 * @access  Private
 */
router.post(
  '/suggest-category',
  authMiddleware,
  validateRequest(['body.description']),
  aiController.suggestCategory
);

/**
 * @route   POST /api/ai/estimate-cost
 * @desc    Get estimated cost for service
 * @access  Private
 */
router.post(
  '/estimate-cost',
  authMiddleware,
  validateRequest(['body.serviceType', 'body.description']),
  aiController.estimateCost
);

/**
 * @route   POST /api/ai/feedback
 * @desc    Submit feedback on AI analysis
 * @access  Private
 */
router.post(
  '/feedback',
  authMiddleware,
  validateRequest(['body.problemImageId', 'body.isAccurate']),
  aiController.submitAIFeedback
);

module.exports = router;