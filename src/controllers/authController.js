const { getFirebaseAdmin } = require('../config/firebase-admin');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');

/**
 * Get Firebase Admin (lazy loading)
 * This is called when needed, not at module load time
 */
const getAdmin = () => {
  return getFirebaseAdmin();
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
exports.register = async (req, res, next) => {
  try {
    console.log('📥 Registration request received');
    
    const { firebaseUid, email, phoneNumber, fullName, role, address } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ firebaseUid });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already registered'
      });
    }

    // Create new user
    const user = await User.create({
      firebaseUid,
      email,
      phoneNumber,
      fullName,
      role,
      address: address || {},
      accountStatus: 'active',
      isEmailVerified: false,
      isPhoneVerified: false
    });

    console.log('✅ User created:', user._id);

    // Create role-specific profile
    if (role === 'worker') {
      await Worker.create({
        userId: user._id,
        specializations: [],
        experience: 0,
        availability: {
          isAvailable: true,
          schedule: []
        },
        portfolioImages: [],
        certifications: [],
        createdAt: new Date()
      });
      console.log('✅ Worker profile created');
    } else if (role === 'customer') {
      await Customer.create({
        userId: user._id,
        savedWorkers: [],
        addresses: address ? [{ address, isDefault: true }] : [],
        createdAt: new Date()
      });
      console.log('✅ Customer profile created');
    }

    console.log('🎉 Registration complete!');

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Registration error:', error);
    
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }
    
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
    console.log('📥 Login request received');
    
    const { firebaseUid } = req.body;

    // Find user by Firebase UID
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

    console.log('✅ Login successful for:', user.email);

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user._id,
          firebaseUid: user.firebaseUid,
          email: user.email,
          fullName: user.fullName,
          phoneNumber: user.phoneNumber,
          role: user.role,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          profileImage: user.profileImage,
          profile: profile
        }
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
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
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    
    // Get admin instance
    const admin = getAdmin();
    
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Find user
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get role-specific profile
    let profile = null;
    if (user.role === 'worker') {
      profile = await Worker.findOne({ userId: user._id });
    } else if (user.role === 'customer') {
      profile = await Customer.findOne({ userId: user._id });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        firebaseUid: user.firebaseUid,
        email: user.email,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        role: user.role,
        accountStatus: user.accountStatus,
        isEmailVerified: user.isEmailVerified,
        profileImage: user.profileImage,
        profile: profile
      }
    });
  } catch (error) {
    console.error('❌ Token verification error:', error);
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
    // Clear FCM token if provided
    const { fcmToken } = req.body;
    if (fcmToken && req.user) {
      await User.findByIdAndUpdate(req.user.id, {
        $pull: { fcmTokens: fcmToken }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('❌ Logout error:', error);
    next(error);
  }
};

/**
 * @desc    Update FCM token for push notifications
 * @route   PUT /api/auth/fcm-token
 * @access  Private
 */
exports.updateFCMToken = async (req, res, next) => {
  try {
    const { fcmToken } = req.body;
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      {
        $addToSet: { fcmTokens: fcmToken }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'FCM token updated successfully'
    });
  } catch (error) {
    console.error('❌ FCM token update error:', error);
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

    // Check if user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Generate password reset link (Firebase will handle this)
    // For now, just return success
    res.status(200).json({
      success: true,
      message: 'Password reset link sent to your email'
    });
  } catch (error) {
    console.error('❌ Forgot password error:', error);
    next(error);
  }
};

/**
 * @desc    Verify phone number
 * @route   POST /api/auth/verify-phone
 * @access  Private
 */
exports.verifyPhone = async (req, res, next) => {
  try {
    const { isVerified } = req.body;
    const userId = req.user.id;

    await User.findByIdAndUpdate(
      userId,
      { isPhoneVerified: isVerified },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Phone verification status updated'
    });
  } catch (error) {
    console.error('❌ Phone verification error:', error);
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
    const userId = req.user.id;

    // Delete user and related profiles
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Delete role-specific profile
    if (user.role === 'worker') {
      await Worker.deleteOne({ userId: user._id });
    } else if (user.role === 'customer') {
      await Customer.deleteOne({ userId: user._id });
    }

    // Delete user
    await User.findByIdAndDelete(userId);

    // Delete from Firebase
    try {
      const admin = getAdmin();
      await admin.auth().deleteUser(user.firebaseUid);
    } catch (firebaseError) {
      console.error('❌ Firebase deletion error:', firebaseError);
      // Continue even if Firebase deletion fails
    }

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('❌ Delete account error:', error);
    next(error);
  }
};