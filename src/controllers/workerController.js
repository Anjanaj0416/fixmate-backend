const { Worker, User, Review, Booking } = require('../models');

/**
 * @desc    Get all workers with filters
 * @route   GET /api/workers
 * @access  Public
 */
exports.getWorkers = async (req, res, next) => {
  try {
    const {
      specialization,
      city,
      district,
      minRating,
      maxRate,
      availability,
      page = 1,
      limit = 20,
      sortBy = 'rating.average'
    } = req.query;

    const query = { profileStatus: 'active' };

    if (specialization) query.specializations = specialization;
    if (availability) query.availability = availability === 'true';
    if (minRating) query['rating.average'] = { $gte: parseFloat(minRating) };
    if (maxRate) query.hourlyRate = { $lte: parseFloat(maxRate) };

    const workers = await Worker.find(query)
      .populate('userId', 'fullName email phoneNumber profileImage location')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ [sortBy]: -1 });

    const count = await Worker.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        workers,
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
 * @desc    Get worker by ID
 * @route   GET /api/workers/:id
 * @access  Public
 */
exports.getWorkerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const worker = await Worker.findById(id)
      .populate('userId', 'fullName email phoneNumber profileImage location');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Get recent reviews
    const reviews = await Review.find({ workerId: worker.userId })
      .populate('customerId', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(10);

    res.status(200).json({
      success: true,
      data: { worker, reviews }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create/Update worker profile
 * @route   PUT /api/workers/profile
 * @access  Private/Worker
 */
exports.updateWorkerProfile = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      specializations,
      experience,
      hourlyRate,
      bio,
      skills,
      workingHours,
      serviceLocations
    } = req.body;

    const user = await User.findOne({ firebaseUid });

    let worker = await Worker.findOne({ userId: user._id });

    const updateData = {};
    if (specializations) updateData.specializations = specializations;
    if (experience !== undefined) updateData.experience = experience;
    if (hourlyRate !== undefined) updateData.hourlyRate = hourlyRate;
    if (bio) updateData.bio = bio;
    if (skills) updateData.skills = skills;
    if (workingHours) updateData.workingHours = workingHours;
    if (serviceLocations) updateData.serviceLocations = serviceLocations;

    // Check if profile is complete
    if (specializations && experience !== undefined && hourlyRate !== undefined) {
      updateData.profileStatus = 'active';
    }

    if (!worker) {
      worker = await Worker.create({
        userId: user._id,
        firebaseUid: user.firebaseUid,
        ...updateData
      });
    } else {
      worker = await Worker.findOneAndUpdate(
        { userId: user._id },
        updateData,
        { new: true, runValidators: true }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Worker profile updated successfully',
      data: { worker }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add portfolio image
 * @route   POST /api/workers/portfolio
 * @access  Private/Worker
 */
exports.addPortfolioImage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { imageUrl, caption } = req.body;

    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOne({ userId: user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    worker.portfolio.push({
      imageUrl,
      caption,
      uploadedAt: new Date()
    });

    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio image added successfully',
      data: { portfolio: worker.portfolio }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove portfolio image
 * @route   DELETE /api/workers/portfolio/:imageId
 * @access  Private/Worker
 */
exports.removePortfolioImage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { imageId } = req.params;

    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOne({ userId: user._id });

    worker.portfolio = worker.portfolio.filter(
      img => img._id.toString() !== imageId
    );

    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Portfolio image removed successfully',
      data: { portfolio: worker.portfolio }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update availability
 * @route   PUT /api/workers/availability
 * @access  Private/Worker
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { availability } = req.body;

    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOneAndUpdate(
      { userId: user._id },
      { availability },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Availability updated successfully',
      data: { availability: worker.availability }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get worker statistics
 * @route   GET /api/workers/stats
 * @access  Private/Worker
 */
exports.getWorkerStats = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOne({ userId: user._id });

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    // Get booking stats
    const totalBookings = await Booking.countDocuments({ workerId: user._id });
    const pendingBookings = await Booking.countDocuments({ 
      workerId: user._id, 
      status: 'pending' 
    });
    const activeBookings = await Booking.countDocuments({ 
      workerId: user._id, 
      status: { $in: ['accepted', 'in-progress'] }
    });

    // Get earnings this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const Payment = require('../models/Payment');
    const monthlyEarnings = await Payment.aggregate([
      {
        $match: {
          workerId: user._id,
          status: 'completed',
          completedAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$workerEarnings' }
        }
      }
    ]);

    const stats = {
      profile: {
        rating: worker.rating,
        completedJobs: worker.completedJobs,
        totalEarnings: worker.totalEarnings,
        acceptanceRate: worker.acceptanceRate,
        responseTime: worker.responseTime
      },
      bookings: {
        total: totalBookings,
        pending: pendingBookings,
        active: activeBookings
      },
      earnings: {
        thisMonth: monthlyEarnings[0]?.total || 0,
        allTime: worker.totalEarnings
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
 * ✅ NEW FUNCTION - Get current worker's profile
 * @desc    Get current worker's profile
 * @route   GET /api/v1/workers/profile
 * @access  Private/Worker
 */
exports.getWorkerProfile = async (req, res, next) => {
  try {
    // Get firebaseUid from authenticated user (set by authMiddleware)
    const { firebaseUid } = req.user;
    
    console.log('🔍 Getting worker profile for:', firebaseUid);
    
    // Find user document
    const user = await User.findOne({ firebaseUid });
    
    if (!user) {
      console.error('❌ User not found for firebaseUid:', firebaseUid);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    console.log('✅ User found:', user._id);

    // Find worker profile
    const worker = await Worker.findOne({ userId: user._id });
    
    if (!worker) {
      console.error('❌ Worker profile not found for userId:', user._id);
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found. Please complete your worker registration.'
      });
    }

    console.log('✅ Worker profile found:', {
      workerId: worker._id,
      serviceCategories: worker.serviceCategories,
      specializations: worker.specializations,
      experience: worker.experience,
      hourlyRate: worker.hourlyRate
    });

    // Return worker data
    res.status(200).json({
      success: true,
      data: worker
    });
    
  } catch (error) {
    console.error('❌ Error in getWorkerProfile:', error);
    next(error);
  }
};

/**
 * @desc    Search workers with filters
 * @route   GET /api/workers/search
 * @access  Public
 */
exports.searchWorkers = async (req, res, next) => {
  try {
    const {
      query,
      specialization,
      longitude,
      latitude,
      maxDistance = 10000,
      minRating,
      page = 1,
      limit = 20
    } = req.query;

    const searchQuery = { profileStatus: 'active' };

    // Text search
    if (query) {
      const users = await User.find({
        $or: [
          { fullName: { $regex: query, $options: 'i' } },
          { 'location.city': { $regex: query, $options: 'i' } },
          { 'location.district': { $regex: query, $options: 'i' } }
        ]
      }).select('_id');

      searchQuery.userId = { $in: users.map(u => u._id) };
    }

    // Specialization filter
    if (specialization) {
      searchQuery.specializations = specialization;
    }

    // Rating filter
    if (minRating) {
      searchQuery['rating.average'] = { $gte: parseFloat(minRating) };
    }

    let workers;

    // Location-based search
    if (longitude && latitude) {
      const userIds = await User.find({
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(longitude), parseFloat(latitude)]
            },
            $maxDistance: parseInt(maxDistance)
          }
        }
      }).select('_id');

      searchQuery.userId = { $in: userIds.map(u => u._id) };
    }

    workers = await Worker.find(searchQuery)
      .populate('userId', 'fullName profileImage location')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ 'rating.average': -1 });

    const count = await Worker.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      data: {
        workers,
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
 * @desc    Get worker reviews
 * @route   GET /api/workers/:id/reviews
 * @access  Public
 */
exports.getWorkerReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    const reviews = await Review.find({ 
      workerId: worker.userId,
      isVisible: true,
      moderationStatus: 'approved'
    })
      .populate('customerId', 'fullName profileImage')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Review.countDocuments({ 
      workerId: worker.userId,
      isVisible: true,
      moderationStatus: 'approved'
    });

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
        averageRating: worker.rating.average
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add certification
 * @route   POST /api/workers/certifications
 * @access  Private/Worker
 */
exports.addCertification = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { name, issuedBy, issuedDate, imageUrl } = req.body;

    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOne({ userId: user._id });

    worker.certifications.push({
      name,
      issuedBy,
      issuedDate,
      imageUrl
    });

    await worker.save();

    res.status(200).json({
      success: true,
      message: 'Certification added successfully',
      data: { certifications: worker.certifications }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update bank details
 * @route   PUT /api/workers/bank-details
 * @access  Private/Worker
 */
exports.updateBankDetails = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { accountName, accountNumber, bankName, branchName } = req.body;

    const user = await User.findOne({ firebaseUid });
    const worker = await Worker.findOneAndUpdate(
      { userId: user._id },
      {
        bankDetails: {
          accountName,
          accountNumber,
          bankName,
          branchName,
          isVerified: false // Admin needs to verify
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Bank details updated successfully. Pending verification.',
      data: { bankDetails: worker.bankDetails }
    });
  } catch (error) {
    next(error);
  }
};