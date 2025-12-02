const { getAuth } = require('../config/firebase-admin');
const { User } = require('../models');

/**
 * Authentication Middleware - FIXED & ENHANCED VERSION
 * Verifies Firebase ID token and attaches user info to request
 * 
 * ✅ FIXED: Better logging for debugging
 * ✅ FIXED: Token validation checks
 * ✅ FIXED: Detailed error messages
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    console.log('🔍 Auth check - Authorization header exists:', !!authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No valid Authorization header');
      return res.status(401).json({
        success: false,
        message: 'No token provided. Please provide a valid Bearer token.'
      });
    }

    const token = authHeader.split('Bearer ')[1];

    if (!token) {
      console.log('❌ Token extraction failed');
      return res.status(401).json({
        success: false,
        message: 'Invalid token format'
      });
    }

    // ✅ NEW: Better token validation logging
    console.log('🔍 Token received (first 30 chars):', token.substring(0, 30) + '...');
    console.log('🔍 Token length:', token.length);

    // ✅ NEW: Check if token looks valid (Firebase tokens are typically 800+ characters)
    if (token.length < 100) {
      console.log('❌ Token too short - likely invalid');
      return res.status(401).json({
        success: false,
        message: 'Invalid token format - token too short'
      });
    }

    // Get Firebase Auth instance from config
    const auth = getAuth();

    // Verify Firebase ID token
    let decodedToken;
    try {
      console.log('🔐 Verifying token with Firebase...');
      decodedToken = await auth.verifyIdToken(token);
      console.log('✅ Token verified successfully for user:', decodedToken.email);
    } catch (firebaseError) {
      console.error('❌ Firebase token verification failed:', firebaseError.message);
      
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
      
      if (firebaseError.code === 'auth/argument-error') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token format. Please login again.',
          code: 'INVALID_TOKEN_FORMAT'
        });
      }
      
      return res.status(401).json({
        success: false,
        message: 'Invalid token. Authentication failed.',
        code: 'INVALID_TOKEN',
        details: firebaseError.message
      });
    }

    // Find user in database
    console.log('🔍 Looking up user in database...');
    const user = await User.findOne({ firebaseUid: decodedToken.uid }).select(
      'firebaseUid email role accountStatus fullName _id'
    );

    if (!user) {
      console.log('❌ User not found in database:', decodedToken.uid);
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    console.log('✅ User found:', user.email, 'Role:', user.role);

    // Check if account is active
    if (user.accountStatus === 'suspended') {
      console.log('❌ Account suspended:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Your account has been suspended. Please contact support.',
        code: 'ACCOUNT_SUSPENDED'
      });
    }

    if (user.accountStatus === 'deleted') {
      console.log('❌ Account deleted:', user.email);
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

    console.log('✅ Authentication successful for:', user.email);
    next();
  } catch (error) {
    console.error('❌ Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication failed. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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

    // Get Firebase Auth instance from config
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