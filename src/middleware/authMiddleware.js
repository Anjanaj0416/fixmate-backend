const { getAuth } = require('../config/firebase-admin');
const { User } = require('../models');

/**
 * Authentication Middleware - FIXED VERSION
 * Verifies Firebase ID token and attaches user info to request
 * 
 * ✅ FIX: Changed from require('admin') to require Firebase from config
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // ✅ FIX: Get Firebase Auth instance from config
    const auth = getAuth();

    // Verify Firebase ID token
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (firebaseError) {
      console.error('Firebase token verification failed:', firebaseError);
      
      // Handle specific Firebase errors
      if (firebaseError.code === 'auth/id-token-expired') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (firebaseError.code === 'auth/id-token-revoked') {
        return res.status(401).json({
          success: false,
          message: 'Token has been revoked. Please login again.',
          code: 'TOKEN_REVOKED'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
        code: 'INVALID_TOKEN'
      });
    }

    // Find user in database
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
      'firebaseUid email role accountStatus fullName _id'
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Check if account is active
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (user.accountStatus === 'deleted') {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deleted.',
        code: 'ACCOUNT_DELETED'
      });
    }

    // Attach user info to request object
    req.user = {
      firebaseUid: user.firebaseUid,
      _id: user._id,
      email: user.email,
      role: user.role,
      fullName: user.fullName,
      accountStatus: user.accountStatus
    };

    // Attach decoded token for additional info if needed
    req.decodedToken = decodedToken;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.'
    });
  }
};

/**
 * Optional Authentication Middleware
 * Verifies token if provided, but doesn't fail if not provided
 * Useful for endpoints that work differently for authenticated vs non-authenticated users
 */
exports.optionalAuthMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    // If no token, continue without user info
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      req.user = null;
      return next();
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    // ✅ FIX: Get Firebase Auth instance from config
    const auth = getAuth();

    // Try to verify token
    try {
      const decodedToken = await auth.verifyIdToken(token);
      const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
        'firebaseUid email role accountStatus fullName _id'
      );

      if (user && user.accountStatus === 'active') {
        req.user = {
          firebaseUid: user.firebaseUid,
          _id: user._id,
          email: user.email,
          role: user.role,
          fullName: user.fullName,
          accountStatus: user.accountStatus
        };
        req.decodedToken = decodedToken;
      } else {
        req.user = null;
      }
    } catch (error) {
      // Token invalid, continue without user
      req.user = null;
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    req.user = null;
    next();
  }
};

/**
 * Middleware to check if user is authenticated
 * Can be used as a simpler check after authMiddleware
 */
exports.requireAuth = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }
  next();
};

/**
 * Middleware to verify email is verified
 */
exports.requireEmailVerification = (req, res, next) => {
  if (!req.decodedToken || !req.decodedToken.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email address to access this resource.',
      code: 'EMAIL_NOT_VERIFIED'
    });
  }
  next();
};

/**
 * Middleware to verify phone number is verified
 */
exports.requirePhoneVerification = (req, res, next) => {
  if (!req.user || !req.user.isPhoneVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your phone number to access this resource.',
      code: 'PHONE_NOT_VERIFIED'
    });
  }
  next();
};