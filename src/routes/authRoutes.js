const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authMiddleware } = require('../middleware/authMiddleware');
const { validateRequest } = require('../middleware/validator');

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  '/register',
  validateRequest([
    'body.firebaseUid',
    'body.email',
    'body.phoneNumber',
    'body.fullName',
    'body.role'
  ]),
  authController.register
);

/**
 * @route   POST /auth/signup
 * @desc    Register a new user (alternative endpoint for frontend)
 * @access  Public
 * 
 * ✅ ADDED: Frontend calls /signup, so we need this route!
 */
router.post(
  '/signup',
  validateRequest([
    'body.firebaseUid',
    'body.email',
    'body.phoneNumber',
    'body.fullName',
    'body.role'
  ]),
  authController.register  // Uses same controller as /register
);

/**
 * @route   POST /auth/login
 * @desc    Login user
 * @access  Public
 */
router.post(
  '/login',
  validateRequest(['body.firebaseUid']),
  authController.login
);

/**
 * @route   POST /auth/logout
 * @desc    Logout user
 * @access  Private
 */
router.post('/logout', authMiddleware, authController.logout);

/**
 * @route   POST /auth/verify-token
 * @desc    Verify Firebase token
 * @access  Public
 */
router.post('/verify-token', authController.verifyToken);

/**
 * @route   PUT /auth/fcm-token
 * @desc    Update FCM token for push notifications
 * @access  Private
 */
router.put(
  '/fcm-token',
  authMiddleware,
  validateRequest(['body.fcmToken']),
  authController.updateFCMToken
);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post(
  '/forgot-password',
  validateRequest(['body.email']),
  authController.forgotPassword
);

/**
 * @route   POST /auth/verify-phone
 * @desc    Verify phone number
 * @access  Private
 */
router.post(
  '/verify-phone',
  authMiddleware,
  validateRequest(['body.isVerified']),
  authController.verifyPhone
);

/**
 * @route   DELETE /auth/delete-account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/delete-account', authMiddleware, authController.deleteAccount);

module.exports = router;