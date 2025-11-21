const admin = require('../config/firebase-admin');
const { User, Worker, Customer } = require('../models');

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    const { firebaseUid, email, phoneNumber, fullName, role } = req.body;

    // Verify Firebase token
    const decodedToken = await admin.auth().verifyIdToken(req.headers.authorization?.split('Bearer ')[1]);
    
    if (decodedToken.uid !== firebaseUid) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create user
    const user = await User.create({
      firebaseUid,
      email,
      phoneNumber,
      fullName,
      role: role || 'customer',
      isEmailVerified: decodedToken.email_verified || false
    });

    // Create role-specific profile
    if (role === 'worker') {
      await Worker.create({
        userId: user._id,
        firebaseUid: user.firebaseUid,
        specializations: [],
        experience: 0,
        hourlyRate: 0
      });
    } else if (role === 'customer') {
      await Customer.create({
        userId: user._id,
        firebaseUid: user.firebaseUid
      });
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          email: user.email,
          fullName: user.fullName,
          role: user.role
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    const { firebaseUid } = req.body;

    // Verify Firebase token
    const token = req.headers.authorization?.split('Bearer ')[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    
    if (decodedToken.uid !== firebaseUid) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Find user
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found. Please register first.'
      });
    }

    // Check if account is suspended
    if (user.accountStatus === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Account is suspended. Please contact support.'
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Get role-specific profile
    let profile = null;
    if (user.role === 'worker') {
      profile = await Worker.findOne({ userId: user._id });
    } else if (user.role === 'customer') {
      profile = await Customer.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          phoneNumber: user.phoneNumber,
          fullName: user.fullName,
          role: user.role,
          profileImage: user.profileImage,
          accountStatus: user.accountStatus
        },
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
exports.logout = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    // Clear FCM token
    await User.findOneAndUpdate(
      { firebaseUid },
      { fcmToken: null }
    );

    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify Firebase token
 * @route   POST /api/auth/verify-token
 * @access  Public
 */
exports.verifyToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token);

    res.status(200).json({
      success: true,
      data: {
        uid: decodedToken.uid,
        email: decodedToken.email,
        email_verified: decodedToken.email_verified
      }
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

/**
 * @desc    Update FCM token
 * @route   PUT /api/auth/fcm-token
 * @access  Private
 */
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { fcmToken } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { fcmToken },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully',
      data: { fcmToken: user.fcmToken }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Request password reset
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Firebase handles password reset emails
    // This is just for logging/tracking
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if user exists
      return res.status(200).json({
        success: true,
        message: 'If an account exists with this email, a password reset link will be sent.'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Password reset email sent successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify phone number (OTP verification)
 * @route   POST /api/auth/verify-phone
 * @access  Private
 */
exports.verifyPhone = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { isVerified } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { isPhoneVerified: isVerified },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Phone verification status updated',
      data: { isPhoneVerified: user.isPhoneVerified }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/auth/delete-account
 * @access  Private
 */
exports.deleteAccount = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    // Soft delete - mark account as deleted
    await User.findOneAndUpdate(
      { firebaseUid },
      { accountStatus: 'deleted' }
    );

    // Delete from Firebase Auth
    await admin.auth().deleteUser(firebaseUid);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};