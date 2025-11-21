const { User, Worker, Customer, Booking, Review, Payment } = require('../models');

/**
 * @desc    Get dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Private/Admin
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const totalCustomers = await User.countDocuments({ role: 'customer' });
    const totalWorkers = await User.countDocuments({ role: 'worker' });
    const activeUsers = await User.countDocuments({ accountStatus: 'active' });
    const suspendedUsers = await User.countDocuments({ accountStatus: 'suspended' });

    // New users this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const newUsersThisMonth = await User.countDocuments({
      createdAt: { $gte: startOfMonth }
    });

    // Booking statistics
    const totalBookings = await Booking.countDocuments();
    const completedBookings = await Booking.countDocuments({ status: 'completed' });
    const activeBookings = await Booking.countDocuments({ 
      status: { $in: ['pending', 'accepted', 'in-progress'] }
    });

    // Revenue statistics
    const totalRevenue = await Payment.aggregate([
      {
        $match: { status: 'completed' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$platformFee.amount' }
        }
      }
    ]);

    const monthlyRevenue = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$platformFee.amount' }
        }
      }
    ]);

    // Review statistics
    const totalReviews = await Review.countDocuments();
    const pendingReviews = await Review.countDocuments({ moderationStatus: 'pending' });
    const flaggedReviews = await Review.countDocuments({ isFlagged: true });

    // Recent activity
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('fullName email role createdAt');

    const recentBookings = await Booking.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('customerId', 'fullName')
      .populate('workerId', 'fullName')
      .select('serviceType status createdAt');

    const stats = {
      users: {
        total: totalUsers,
        customers: totalCustomers,
        workers: totalWorkers,
        active: activeUsers,
        suspended: suspendedUsers,
        newThisMonth: newUsersThisMonth
      },
      bookings: {
        total: totalBookings,
        completed: completedBookings,
        active: activeBookings
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
        thisMonth: monthlyRevenue[0]?.total || 0
      },
      reviews: {
        total: totalReviews,
        pending: pendingReviews,
        flagged: flaggedReviews
      },
      recentActivity: {
        users: recentUsers,
        bookings: recentBookings
      }
    };

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { 
      role, 
      status, 
      search, 
      page = 1, 
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.accountStatus = status;
    if (search) {
      query.$or = [
        { fullName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phoneNumber: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 });

    const count = await User.countDocuments(query);

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
 * @desc    Suspend user account
 * @route   PUT /api/admin/users/:id/suspend
 * @access  Private/Admin
 */
exports.suspendUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const user = await User.findByIdAndUpdate(
      id,
      { accountStatus: 'suspended' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send notification
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: user._id,
      type: 'account-suspended',
      title: 'Account Suspended',
      message: `Your account has been suspended. Reason: ${reason}`,
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'User suspended successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reactivate user account
 * @route   PUT /api/admin/users/:id/reactivate
 * @access  Private/Admin
 */
exports.reactivateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findByIdAndUpdate(
      id,
      { accountStatus: 'active' },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Send notification
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: user._id,
      type: 'account-reactivated',
      title: 'Account Reactivated',
      message: 'Your account has been reactivated',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'User reactivated successfully',
      data: { user }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user account
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
exports.deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete
    user.accountStatus = 'deleted';
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews for moderation
 * @route   GET /api/admin/reviews
 * @access  Private/Admin
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const { status, flagged, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.moderationStatus = status;
    if (flagged === 'true') query.isFlagged = true;

    const reviews = await Review.find(query)
      .populate('customerId', 'fullName email')
      .populate('workerId', 'fullName email')
      .populate('bookingId', 'serviceType')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
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
 * @desc    Moderate review
 * @route   PUT /api/admin/reviews/:id/moderate
 * @access  Private/Admin
 */
exports.moderateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;
    const { firebaseUid } = req.user;

    const admin = await User.findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.moderate(status, admin._id, reason);

    res.status(200).json({
      success: true,
      message: 'Review moderated successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Verify worker profile
 * @route   PUT /api/admin/workers/:id/verify
 * @access  Private/Admin
 */
exports.verifyWorker = async (req, res, next) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findByIdAndUpdate(
      id,
      { 
        isVerified: true,
        profileStatus: 'active'
      },
      { new: true }
    );

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Send notification
    const Notification = require('../models/Notification');
    await Notification.create({
      userId: worker.userId,
      type: 'profile-verified',
      title: 'Profile Verified',
      message: 'Your worker profile has been verified and is now active',
      priority: 'high'
    });

    res.status(200).json({
      success: true,
      message: 'Worker verified successfully',
      data: { worker }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all bookings
 * @route   GET /api/admin/bookings
 * @access  Private/Admin
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    const { status, serviceType, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (serviceType) query.serviceType = serviceType;

    const bookings = await Booking.find(query)
      .populate('customerId', 'fullName email phoneNumber')
      .populate('workerId', 'fullName email phoneNumber')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Booking.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        bookings,
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
 * @desc    Get analytics data
 * @route   GET /api/admin/analytics
 * @access  Private/Admin
 */
exports.getAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date(new Date().setMonth(new Date().getMonth() - 6));
    const end = endDate ? new Date(endDate) : new Date();

    // User growth
    const userGrowth = await User.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Booking trends
    const bookingTrends = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
            status: '$status'
          },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Revenue trends
    const revenueTrends = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          completedAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$completedAt' },
            month: { $month: '$completedAt' }
          },
          revenue: { $sum: '$platformFee.amount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 }
      }
    ]);

    // Popular services
    const popularServices = await Booking.aggregate([
      {
        $match: {
          createdAt: { $gte: start, $lte: end }
        }
      },
      {
        $group: {
          _id: '$serviceType',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $limit: 10
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        userGrowth,
        bookingTrends,
        revenueTrends,
        popularServices
      }
    });
  } catch (error) {
    next(error);
  }
};