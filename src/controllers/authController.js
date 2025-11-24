const admin = require('../config/firebase-admin');
const { User, Worker, Customer } = require('../models');

/**
 * @desc    Register a new user (Signup)
 * @route   POST /api/v1/auth/signup
 * @access  Public (but requires Firebase token)
 */
exports.signup = async (req, res, next) => {
  try {
    console.log('📥 Signup request received');
    console.log('Headers:', {
      authorization: req.headers.authorization ? 'Present' : 'Missing',
      contentType: req.headers['content-type']
    });
    console.log('Body:', req.body);

    const { firebaseUid, email, fullName, phoneNumber, address, role } = req.body;

    // Validate required fields
    if (!firebaseUid || !email || !fullName || !role) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: firebaseUid, email, fullName, and role are required'
      });
    }

    // Verify Firebase token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ Missing or invalid authorization header');
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('🔐 Verifying Firebase token...');

    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ Token verified for user:', decodedToken.uid);
    } catch (tokenError) {
      console.error('❌ Token verification failed:', tokenError);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }
    
    // Verify the firebaseUid matches the token
    if (decodedToken.uid !== firebaseUid) {
      console.log('❌ Token UID mismatch');
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - Token does not match user'
      });
    }

    // Check if user already exists
    console.log('🔍 Checking if user exists...');
    const existingUser = await User.findOne({ 
      $or: [{ firebaseUid }, { email }] 
    });
    
    if (existingUser) {
      console.log('❌ User already exists:', existingUser.email);
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email or Firebase account'
      });
    }

    console.log('📝 Creating new user in MongoDB...');

    // Create user in MongoDB
    const user = await User.create({
      firebaseUid,
      email,
      fullName,
      phoneNumber: phoneNumber || '',
      address: address || '',
      role: role || 'customer',
      isEmailVerified: decodedToken.email_verified || false,
      accountStatus: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log('✅ User created in MongoDB:', user._id);

    // Create role-specific profile
    if (role === 'worker') {
      console.log('👷 Creating worker profile...');
      await Worker.create({
        userId: user._id,
        firebaseUid: user.firebaseUid,
        isProfileComplete: false,
        specializations: [],
        experience: 0,
        hourlyRate: 0,
        serviceAreas: [],
        availability: {
          monday: { available: false, slots: [] },
          tuesday: { available: false, slots: [] },
          wednesday: { available: false, slots: [] },
          thursday: { available: false, slots: [] },
          friday: { available: false, slots: [] },
          saturday: { available: false, slots: [] },
          sunday: { available: false, slots: [] }
        },
        createdAt: new Date()
      });
      console.log('✅ Worker profile created');
    } else {
      console.log('👤 Creating customer profile...');
      await Customer.create({
        userId: user._id,
        firebaseUid: user.firebaseUid,
        addresses: address ? [{ address, isDefault: true }] : [],
        createdAt: new Date()
      });
      console.log('✅ Customer profile created');
    }

    console.log('🎉 Registration complete!');

    // Return success with user data
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
          address: user.address,
          role: user.role,
          accountStatus: user.accountStatus,
          isEmailVerified: user.isEmailVerified,
          createdAt: user.createdAt
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Signup error:', error);
    
    // Check for MongoDB duplicate key error
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
 * @route   POST /api/v1/auth/login
 * @access  Public
 */
exports.login = async (req, res, next) => {
  try {
    console.log('📥 Login request received');
    
    const { email } = req.body;

    // Verify Firebase token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Authorization token required'
      });
    }

    const token = authHeader.split('Bearer ')[1];
    let decodedToken;
    
    try {
      decodedToken = await admin.auth().verifyIdToken(token);
    } catch (tokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Find user by Firebase UID (more reliable than email)
    const user = await User.findOne({ firebaseUid: decodedToken.uid });
    
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
 * @route   POST /api/v1/auth/verify-token
 * @access  Private
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
 * @desc    Refresh session
 * @route   POST /api/v1/auth/refresh
 * @access  Private
 */
exports.refreshSession = async (req, res, next) => {
  try {
    // Same as verifyToken for now
    return exports.verifyToken(req, res, next);
  } catch (error) {
    console.error('❌ Session refresh error:', error);
    next(error);
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/v1/auth/logout
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

module.exports = exports;