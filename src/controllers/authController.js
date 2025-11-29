const { getFirebaseAdmin } = require('../config/firebase-admin');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Customer = require('../models/Customer');

/**
 * Get Firebase Admin (lazy loading)
 */
const getAdmin = () => {
  return getFirebaseAdmin();
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register OR POST /api/auth/signup
 * @access  Public
 * 
 * ✅ FIXED: Accepts COMPLETE worker registration data from Worker Registration Flow
 */
// Updated exports.register function in authController.js
// This replaces the worker profile creation section (around line 200-300)

exports.register = async (req, res, next) => {
  try {
    console.log('\n📨 Registration request received');
    console.log('Role:', req.body.role);

    const {
      firstName,
      lastName,
      fullName,
      email,
      phoneNumber,
      address,
      role,
      firebaseUid,
      // Worker-specific fields
      serviceCategories,
      specializations,
      experience,
      hourlyRate,
      skills,
      bio,
      serviceLocations,
      availability,
      workingHours,
      settings
    } = req.body;

    // Validate required fields
    if (!email || !firebaseUid || !role) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: email, firebaseUid, or role'
      });
    }

    // Check if user already exists
    let existingUser = await User.findOne({
      $or: [{ email }, { firebaseUid }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists'
      });
    }

    // Create new user
    const newUser = await User.create({
      firstName: firstName || '',
      lastName: lastName || '',
      fullName: fullName || `${firstName || ''} ${lastName || ''}`.trim(),
      email,
      phoneNumber: phoneNumber || '',
      address: address || '',
      role,
      firebaseUid,
      emailVerified: true,
      phoneVerified: !!phoneNumber
    });

    console.log('✅ User created:', newUser._id);

    // Handle worker registration
    if (role === 'worker') {
      console.log('🔧 Creating worker profile with complete data...');

      try {
        // ✅ FIXED: Create worker profile with corrected field mapping
        const workerProfile = await Worker.create({
          userId: newUser._id,
          firebaseUid: newUser.firebaseUid,

          // ✅ Service categories (enum-based, required)
          serviceCategories: serviceCategories || [],

          // ✅ Detailed specializations (flexible strings)
          specializations: specializations || [],

          // Professional info
          experience: experience || 0,
          hourlyRate: hourlyRate || 0,

          // Skills (languages, etc.)
          skills: skills || [],

          // Bio
          bio: bio || '',

          // Service area
          serviceLocations: serviceLocations || [],

          // Availability
          availability: availability !== false,

          // ✅ Working hours (ensure all days are present)
          workingHours: workingHours || {
            monday: { start: '08:00', end: '18:00', available: true },
            tuesday: { start: '08:00', end: '18:00', available: true },
            wednesday: { start: '08:00', end: '18:00', available: true },
            thursday: { start: '08:00', end: '18:00', available: true },
            friday: { start: '08:00', end: '18:00', available: true },
            saturday: { start: '08:00', end: '18:00', available: false },
            sunday: { start: '08:00', end: '18:00', available: false }
          },

          // Set profile as active since registration is complete
          profileStatus: 'active',

          // Initialize rating
          rating: {
            average: 0,
            count: 0
          },

          // Initialize statistics
          completedJobs: 0,
          totalEarnings: 0,
          responseTime: 0,
          acceptanceRate: 0,

          // Verification
          isVerified: false
        });

        console.log('✅ Worker profile created successfully:', workerProfile._id);
        console.log('Worker data:', {
          serviceCategories: workerProfile.serviceCategories,
          specializations: workerProfile.specializations,
          experience: workerProfile.experience,
          hourlyRate: workerProfile.hourlyRate,
          profileStatus: workerProfile.profileStatus
        });

        // Return success response with both user and worker data
        return res.status(201).json({
          success: true,
          message: 'Worker registered successfully',
          data: {
            user: {
              id: newUser._id,
              email: newUser.email,
              fullName: newUser.fullName,
              role: newUser.role,
              firebaseUid: newUser.firebaseUid
            },
            worker: {
              id: workerProfile._id,
              serviceCategories: workerProfile.serviceCategories,
              specializations: workerProfile.specializations,
              experience: workerProfile.experience,
              hourlyRate: workerProfile.hourlyRate,
              profileStatus: workerProfile.profileStatus
            }
          }
        });

      } catch (workerError) {
        console.error('❌ Worker profile creation error:', workerError);

        // If worker creation fails, delete the user
        await User.findByIdAndDelete(newUser._id);

        // Return detailed validation error
        if (workerError.name === 'ValidationError') {
          const errors = {};
          for (let field in workerError.errors) {
            errors[field] = workerError.errors[field].message;
          }

          console.error('❌ Validation Error Details:');
          for (let field in errors) {
            console.error(`   - ${field}: ${errors[field]}`);
          }

          return res.status(400).json({
            success: false,
            message: 'Validation failed',
            details: {
              message: workerError.message,
              errors: errors
            }
          });
        }

        throw workerError;
      }
    }

    // Handle customer registration
    if (role === 'customer') {
      console.log('👤 Creating customer profile...');

      const customerProfile = await Customer.create({
        userId: newUser._id,
        firebaseUid: newUser.firebaseUid,
        preferredPaymentMethod: 'cash',
        savedAddresses: address ? [{
          label: 'Home',
          address: address,
          isDefault: true
        }] : []
      });

      console.log('✅ Customer profile created:', customerProfile._id);

      return res.status(201).json({
        success: true,
        message: 'Customer registered successfully',
        data: {
          user: {
            id: newUser._id,
            email: newUser.email,
            fullName: newUser.fullName,
            role: newUser.role,
            firebaseUid: newUser.firebaseUid
          },
          customer: {
            id: customerProfile._id
          }
        }
      });
    }

    // If role is neither worker nor customer
    return res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: {
          id: newUser._id,
          email: newUser.email,
          fullName: newUser.fullName,
          role: newUser.role,
          firebaseUid: newUser.firebaseUid
        }
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
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
    const { firebaseUid } = req.user;

    await User.findOneAndUpdate(
      { firebaseUid },
      { $addToSet: { fcmTokens: fcmToken } }
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

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this email'
      });
    }

    // Generate password reset link via Firebase
    const admin = getAdmin();
    const resetLink = await admin.auth().generatePasswordResetLink(email);

    // TODO: Send reset link via email service

    res.status(200).json({
      success: true,
      message: 'Password reset link sent to email',
      resetLink // Remove this in production
    });
  } catch (error) {
    console.error('❌ Password reset error:', error);
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
    const { firebaseUid } = req.user;

    await User.findOneAndUpdate(
      { firebaseUid },
      { isPhoneVerified: isVerified }
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
    const { firebaseUid } = req.user;

    // Delete from MongoDB
    await User.findOneAndUpdate(
      { firebaseUid },
      { accountStatus: 'deleted' }
    );

    // Delete from Firebase
    const admin = getAdmin();
    await admin.auth().deleteUser(firebaseUid);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully'
    });
  } catch (error) {
    console.error('❌ Account deletion error:', error);
    next(error);
  }
};

module.exports = exports;