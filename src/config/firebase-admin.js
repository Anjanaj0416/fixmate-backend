const admin = require('firebase-admin');
const path = require('path');
const logger = require('../utils/logger');

/**
 * Firebase Admin SDK Configuration
 */

let firebaseApp = null;

/**
 * Initialize Firebase Admin SDK
 */
const initializeFirebase = () => {
  try {
    // Check if already initialized
    if (firebaseApp) {
      logger.info('Firebase Admin SDK already initialized');
      return firebaseApp;
    }
    
    // Get service account path from environment variable
    const serviceAccountPath = process.env.FIREBASE_ADMIN_SDK_PATH || 
                               path.join(__dirname, '../config/serviceAccountKey.json');
    
    // Check if service account file exists
    const fs = require('fs');
    if (!fs.existsSync(serviceAccountPath)) {
      throw new Error(`Firebase service account key not found at: ${serviceAccountPath}`);
    }
    
    // Load service account
    const serviceAccount = require(serviceAccountPath);
    
    // Initialize Firebase Admin
    firebaseApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: process.env.FIREBASE_DATABASE_URL || `https://${serviceAccount.project_id}.firebaseio.com`,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`
    });
    
    logger.info('Firebase Admin SDK initialized successfully');
    logger.info(`Project ID: ${serviceAccount.project_id}`);
    
    return firebaseApp;
  } catch (error) {
    logger.error('Error initializing Firebase Admin SDK:', error);
    
    // If service account not found, try using application default credentials
    if (error.message.includes('not found')) {
      try {
        logger.warn('Attempting to initialize with application default credentials');
        firebaseApp = admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
        logger.info('Firebase initialized with application default credentials');
        return firebaseApp;
      } catch (defaultError) {
        logger.error('Failed to initialize with default credentials:', defaultError);
      }
    }
    
    throw error;
  }
};

/**
 * Get Firebase Admin instance
 */
const getFirebaseAdmin = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized. Call initializeFirebase() first.');
  }
  return admin;
};

/**
 * Get Firebase Auth instance
 */
const getAuth = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.auth();
};

/**
 * Get Firebase Messaging instance
 */
const getMessaging = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.messaging();
};

/**
 * Get Firestore instance (if needed)
 */
const getFirestore = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.firestore();
};

/**
 * Get Firebase Storage instance
 */
const getStorage = () => {
  if (!firebaseApp) {
    throw new Error('Firebase Admin SDK not initialized');
  }
  return admin.storage();
};

/**
 * Verify Firebase ID Token
 */
const verifyIdToken = async (idToken) => {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return {
      success: true,
      uid: decodedToken.uid,
      email: decodedToken.email,
      emailVerified: decodedToken.email_verified,
      phoneNumber: decodedToken.phone_number,
      providerId: decodedToken.firebase.sign_in_provider
    };
  } catch (error) {
    logger.error('Error verifying Firebase ID token:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Create custom token for user
 */
const createCustomToken = async (uid, additionalClaims = {}) => {
  try {
    const customToken = await admin.auth().createCustomToken(uid, additionalClaims);
    return {
      success: true,
      token: customToken
    };
  } catch (error) {
    logger.error('Error creating custom token:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get user by Firebase UID
 */
const getUserByUid = async (uid) => {
  try {
    const userRecord = await admin.auth().getUser(uid);
    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        phoneNumber: userRecord.phoneNumber,
        displayName: userRecord.displayName,
        photoURL: userRecord.photoURL,
        disabled: userRecord.disabled,
        metadata: {
          creationTime: userRecord.metadata.creationTime,
          lastSignInTime: userRecord.metadata.lastSignInTime
        }
      }
    };
  } catch (error) {
    logger.error('Error getting user by UID:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Get user by email
 */
const getUserByEmail = async (email) => {
  try {
    const userRecord = await admin.auth().getUserByEmail(email);
    return {
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        emailVerified: userRecord.emailVerified,
        phoneNumber: userRecord.phoneNumber,
        displayName: userRecord.displayName
      }
    };
  } catch (error) {
    logger.error('Error getting user by email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Update user in Firebase Auth
 */
const updateUser = async (uid, updateData) => {
  try {
    const userRecord = await admin.auth().updateUser(uid, updateData);
    return {
      success: true,
      user: userRecord
    };
  } catch (error) {
    logger.error('Error updating user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Delete user from Firebase Auth
 */
const deleteUser = async (uid) => {
  try {
    await admin.auth().deleteUser(uid);
    return {
      success: true,
      message: 'User deleted successfully'
    };
  } catch (error) {
    logger.error('Error deleting user:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Set custom user claims (for roles, etc.)
 */
const setCustomClaims = async (uid, claims) => {
  try {
    await admin.auth().setCustomUserClaims(uid, claims);
    return {
      success: true,
      message: 'Custom claims set successfully'
    };
  } catch (error) {
    logger.error('Error setting custom claims:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Revoke refresh tokens for user
 */
const revokeRefreshTokens = async (uid) => {
  try {
    await admin.auth().revokeRefreshTokens(uid);
    return {
      success: true,
      message: 'Refresh tokens revoked successfully'
    };
  } catch (error) {
    logger.error('Error revoking refresh tokens:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send password reset email
 */
const sendPasswordResetEmail = async (email) => {
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    return {
      success: true,
      resetLink: link
    };
  } catch (error) {
    logger.error('Error generating password reset link:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Send email verification
 */
const sendEmailVerification = async (email) => {
  try {
    const link = await admin.auth().generateEmailVerificationLink(email);
    return {
      success: true,
      verificationLink: link
    };
  } catch (error) {
    logger.error('Error generating email verification link:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * List all users (paginated)
 */
const listUsers = async (maxResults = 1000, pageToken = null) => {
  try {
    const listUsersResult = await admin.auth().listUsers(maxResults, pageToken);
    return {
      success: true,
      users: listUsersResult.users,
      pageToken: listUsersResult.pageToken
    };
  } catch (error) {
    logger.error('Error listing users:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Firebase health check
 */
const healthCheck = async () => {
  try {
    if (!firebaseApp) {
      return {
        status: 'unhealthy',
        error: 'Firebase not initialized'
      };
    }
    
    // Try to verify a dummy token to check if auth is working
    // In production, you might want a different health check method
    return {
      status: 'healthy',
      initialized: true,
      projectId: firebaseApp.options.projectId || 'N/A'
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Decode token without verification (use carefully)
 */
const decodeToken = (idToken) => {
  try {
    const decodedToken = admin.auth().verifyIdToken(idToken, false);
    return decodedToken;
  } catch (error) {
    logger.error('Error decoding token:', error);
    throw error;
  }
};

module.exports = {
  // Initialization
  initializeFirebase,
  getFirebaseAdmin,
  
  // Services
  getAuth,
  getMessaging,
  getFirestore,
  getStorage,
  
  // Token Operations
  verifyIdToken,
  createCustomToken,
  decodeToken,
  
  // User Management
  getUserByUid,
  getUserByEmail,
  updateUser,
  deleteUser,
  setCustomClaims,
  revokeRefreshTokens,
  listUsers,
  
  // Email Operations
  sendPasswordResetEmail,
  sendEmailVerification,
  
  // Health Check
  healthCheck,
  
  // Direct admin access
  admin
};