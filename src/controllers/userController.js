const { User, Worker, Customer } = require('../models');

/**
 * @desc    Get current user profile
 * @route   GET /api/users/me
 * @access  Private
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });

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
      data: {
        user,
        profile
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user by ID
 * @route   GET /api/users/:id
 * @access  Public
 */
exports.getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-fcmToken');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { fullName, phoneNumber, profileImage, location, notificationSettings } = req.body;

    const updateData = {};
    if (fullName) updateData.fullName = fullName;
    if (phoneNumber) updateData.phoneNumber = phoneNumber;
    if (profileImage) updateData.profileImage = profileImage;
    if (location) updateData.location = location;
    if (notificationSettings) updateData.notificationSettings = notificationSettings;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      updateData,
      { new: true, runValidators: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update profile image
 * @route   PUT /api/users/profile-image
 * @access  Private
 */
exports.updateProfileImage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { profileImage } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { profileImage },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Profile image updated successfully',
      data: { profileImage: user.profileImage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user location
 * @route   PUT /api/users/location
 * @access  Private
 */
exports.updateLocation = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { address, city, district, coordinates } = req.body;

    const location = {
      address,
      city,
      district,
      coordinates: {
        type: 'Point',
        coordinates: [coordinates.longitude, coordinates.latitude]
      }
    };

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      { location },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Location updated successfully',
      data: { location: user.location }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification settings
 * @route   PUT /api/users/notification-settings
 * @access  Private
 */
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { pushEnabled, emailEnabled, smsEnabled } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        notificationSettings: {
          pushEnabled,
          emailEnabled,
          smsEnabled
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: { notificationSettings: user.notificationSettings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get user statistics
 * @route   GET /api/users/stats
 * @access  Private
 */
exports.getUserStats = async (req, res, next) => {
  try {
    const { firebaseUid, role } = req.user;

    const user = await User.findOne({ firebaseUid });

    let stats = {};

    if (role === 'customer') {
      const customer = await Customer.findOne({ userId: user._id });
      stats = {
        totalBookings: customer.totalBookings,
        completedBookings: customer.completedBookings,
        cancelledBookings: customer.cancelledBookings,
        totalSpent: customer.totalSpent,
        favoriteWorkers: customer.favoriteWorkers.length
      };
    } else if (role === 'worker') {
      const Worker = require('../models/Worker');
      const worker = await Worker.findOne({ userId: user._id });
      stats = {
        completedJobs: worker.completedJobs,
        totalEarnings: worker.totalEarnings,
        rating: worker.rating,
        acceptanceRate: worker.acceptanceRate,
        responseTime: worker.responseTime
      };
    }

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search users (Admin only)
 * @route   GET /api/users/search
 * @access  Private/Admin
 */
exports.searchUsers = async (req, res, next) => {
  try {
    const { query, role, status, page = 1, limit = 20 } = req.query;

    const searchQuery = {};

    if (query) {
      searchQuery.$or = [
        { fullName: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } },
        { phoneNumber: { $regex: query, $options: 'i' } }
      ];
    }

    if (role) searchQuery.role = role;
    if (status) searchQuery.accountStatus = status;

    const users = await User.find(searchQuery)
      .select('-fcmToken')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        users,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get nearby users (for location-based features)
 * @route   GET /api/users/nearby
 * @access  Private
 */
exports.getNearbyUsers = async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance = 10000, role } = req.query;

    const query = {
      'location.coordinates': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    };

    if (role) query.role = role;

    const users = await User.find(query)
      .select('fullName profileImage location role')
      .limit(50);

    res.status(200).json({
      success: true,
      data: { users, count: users.length }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Report a user
 * @route   POST /api/users/:id/report
 * @access  Private
 */
exports.reportUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason, description } = req.body;
    const { firebaseUid } = req.user;

    // In production, save this to a Reports collection
    // For now, just log it
    console.log(`User ${firebaseUid} reported user ${id} for ${reason}`);

    res.status(200).json({
      success: true,
      message: 'Report submitted successfully. We will review it shortly.'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Block a user
 * @route   POST /api/users/:id/block
 * @access  Private
 */
exports.blockUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });

    // In production, save blocked users list
    console.log(`User ${user._id} blocked user ${id}`);

    res.status(200).json({
      success: true,
      message: 'User blocked successfully'
    });
  } catch (error) {
    next(error);
  }
};