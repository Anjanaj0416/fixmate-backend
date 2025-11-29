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
exports.register = async (req, res, next) => {
  try {
    console.log('📥 Registration request received');
    console.log('Role:', req.body.role);
    
    const {  
      // Basic user info
      firebaseUid, 
      email, 
      phoneNumber, 
      fullName,
      firstName,
      lastName,
      role,
      address,
      
      // Worker-specific fields (from Worker Registration Flow)
      serviceCategory,
      specializations,
      yearsOfExperience,
      languagesSpoken,
      bio,
      
      // Business info
      businessName,
      businessAddress,
      city,
      stateProvince,
      postalCode,
      website,
      
      // Service area
      serviceArea,
      serviceAddress,
      serviceCity,
      serviceProvince,
      servicePostalCode,
      serviceRadius,
      
      // Pricing
      pricing,
      dailyWage,
      halfDayRate,
      minimumCharge,
      overtimeHourlyRate,
      
      // Availability & Settings
      availability,
      availableDays,
      workingHours,
      availableOnWeekends,
      emergencyServices,
      ownTools,
      vehicleAvailable,
      certified,
      insured,
      whatsappAvailable
    } = req.body;

    // Validate required fields
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'Firebase UID is required'
      });
    }

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Role is required'
      });
    }

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
      fullName: fullName || `${firstName} ${lastName}`,
      role,
      address: address || {},
      accountStatus: 'active',
      isEmailVerified: false,
      isPhoneVerified: true // Assuming phone was verified in BasicInfoRegistration
    });

    console.log('✅ User created:', user._id);

    // Create role-specific profile
    if (role === 'worker') {
      console.log('🔧 Creating worker profile with complete data...');
      
      // ✅ Build working hours from the form data
      const buildWorkingHours = () => {
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const hours = {};
        
        days.forEach(day => {
          hours[day] = {
            start: workingHours?.startTime || '08:00',
            end: workingHours?.endTime || '18:00',
            available: availableDays ? availableDays.includes(day) : (day !== 'sunday')
          };
        });
        
        return hours;
      };

      // ✅ Calculate hourly rate from daily wage
      const calculateHourlyRate = () => {
        if (dailyWage) {
          return Math.round(parseFloat(dailyWage) / 8); // Assuming 8-hour workday
        }
        if (pricing && pricing.dailyWage) {
          return Math.round(parseFloat(pricing.dailyWage) / 8);
        }
        return 1000; // Default minimum
      };

      // ✅ Build service locations array
      const buildServiceLocations = () => {
        if (serviceArea) {
          return [{
            city: serviceArea.city || serviceCity,
            district: serviceArea.province || serviceProvince,
            address: serviceArea.address || serviceAddress,
            postalCode: serviceArea.postalCode || servicePostalCode
          }];
        }
        if (serviceCity || serviceAddress) {
          return [{
            city: serviceCity,
            district: serviceProvince || 'sri lanka',
            address: serviceAddress,
            postalCode: servicePostalCode
          }];
        }
        return [];
      };

      // ✅ Create worker with COMPLETE profile data
      await Worker.create({
        userId: user._id,
        firebaseUid: firebaseUid,
        
        // ✅ Service information (from form, not defaults)
        specializations: specializations && specializations.length > 0 
          ? specializations 
          : [serviceCategory || 'other'],
        experience: yearsOfExperience ? parseInt(yearsOfExperience) : 0,
        
        // ✅ Pricing (from form)
        hourlyRate: calculateHourlyRate(),
        
        // ✅ Boolean availability (NOT an object!)
        availability: availability !== undefined 
          ? (typeof availability === 'boolean' ? availability : true)
          : true,
        
        // ✅ Complete working hours from form
        workingHours: buildWorkingHours(),
        
        // ✅ Service locations from form
        serviceLocations: buildServiceLocations(),
        
        // ✅ Profile information from form
        bio: bio || '',
        skills: specializations || [],
        
        // Portfolio (empty for now, can be added later)
        portfolio: [],
        certifications: [],
        
        // Rating & Statistics (start at 0)
        rating: {
          average: 0,
          count: 0
        },
        completedJobs: 0,
        totalEarnings: 0,
        responseTime: 0,
        acceptanceRate: 0,
        
        // Verification
        isVerified: certified || false,
        verificationDocuments: [],
        
        // ✅ Profile is COMPLETE now (not 'incomplete')
        profileStatus: 'active'
      });
      
      console.log('✅ Worker profile created with complete data from form');
      console.log('   - Specializations:', specializations || [serviceCategory]);
      console.log('   - Experience:', yearsOfExperience || 0, 'years');
      console.log('   - Hourly Rate: LKR', calculateHourlyRate());
      console.log('   - Service Locations:', buildServiceLocations().length);
      
    } else if (role === 'customer') {
      await Customer.create({
        userId: user._id,
        firebaseUid: firebaseUid,
        savedWorkers: [],
        addresses: address ? [{
          address: typeof address === 'string' ? address : address.address,
          city: address.city || '',
          district: address.district || '',
          postalCode: address.postalCode || '',
          isDefault: true
        }] : [],
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
        message: 'User already exists with this email or phone number'
      });
    }
    
    // Log validation errors in detail
    if (error.name === 'ValidationError') {
      console.error('❌ Validation Error Details:');
      Object.keys(error.errors).forEach(key => {
        console.error(`   - ${key}: ${error.errors[key].message}`);
      });
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed: ' + Object.keys(error.errors).map(k => error.errors[k].message).join(', '),
        errors: error.errors
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