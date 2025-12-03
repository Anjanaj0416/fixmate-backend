const { Worker, User, Review, Booking } = require('../models');



/**
 * ✅ NEW - Get nearby workers filtered by service type and location
 * @desc    Get nearby workers filtered by service type
 * @route   GET /api/v1/workers/nearby
 * @access  Private
 */
exports.getNearbyWorkers = async (req, res, next) => {
  try {
    const {
      serviceType,
      latitude,
      longitude,
      maxDistance = 10000, // 10km in meters
      minRating = 0,
      sortBy = 'distance', // distance, rating, price
      page = 1,
      limit = 20,
    } = req.query;

    console.log('🔍 Finding nearby workers:', {
      serviceType,
      location: `${latitude}, ${longitude}`,
      maxDistance: `${maxDistance}m`,
    });

    // Validate required fields
    if (!serviceType || !latitude || !longitude) {
      return res.status(400).json({
        success: false,
        message: 'Service type, latitude, and longitude are required',
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const maxDist = parseInt(maxDistance);

    // Build query - serviceCategories should match serviceType
    const query = {
      profileStatus: 'active',
      isAvailable: true,
      serviceCategories: serviceType, // Match the service type
    };

    // Add rating filter
    if (minRating > 0) {
      query['rating.average'] = { $gte: parseFloat(minRating) };
    }

    // Find workers with location filter
    let workers = await Worker.find(query)
      .populate('userId', 'fullName email phoneNumber profileImage')
      .lean();

    console.log(`📊 Found ${workers.length} workers with service type ${serviceType}`);

    // Calculate distances and filter by maxDistance
    workers = workers
      .map((worker) => {
        if (!worker.location || !worker.location.coordinates) {
          return null;
        }

        const workerLat = worker.location.coordinates[1]; // GeoJSON: [lng, lat]
        const workerLng = worker.location.coordinates[0];

        const distance = calculateDistance(lat, lng, workerLat, workerLng);

        return {
          ...worker,
          distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        };
      })
      .filter((worker) => worker !== null && worker.distance <= maxDist / 1000);

    console.log(`📍 ${workers.length} workers within ${maxDist}m`);

    // Sort workers
    if (sortBy === 'distance') {
      workers.sort((a, b) => a.distance - b.distance);
    } else if (sortBy === 'rating') {
      workers.sort((a, b) => (b.rating?.average || 0) - (a.rating?.average || 0));
    } else if (sortBy === 'price') {
      workers.sort((a, b) => (a.hourlyRate || 999999) - (b.hourlyRate || 999999));
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const paginatedWorkers = workers.slice(skip, skip + parseInt(limit));

    console.log(`✅ Returning ${paginatedWorkers.length} workers`);

    res.status(200).json({
      success: true,
      count: paginatedWorkers.length,
      total: workers.length,
      page: parseInt(page),
      pages: Math.ceil(workers.length / parseInt(limit)),
      workers: paginatedWorkers,
    });

  } catch (error) {
    console.error('❌ Error getting nearby workers:', error);
    next(error);
  }
};

/**
 * Calculate distance between two coordinates (Haversine formula)
 * @param {number} lat1 - Latitude 1
 * @param {number} lon1 - Longitude 1
 * @param {number} lat2 - Latitude 2
 * @param {number} lon2 - Longitude 2
 * @returns {number} Distance in kilometers
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

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
          isVerified: false
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


exports.searchWorkers = async (req, res, next) => {
  try {
    const {
      serviceType,
      district,
      town,
      availability,
      verified,
      minRating,
      maxDistance,
      sortBy = 'rating' // rating, experience, distance
    } = req.query;

    console.log('🔍 Searching workers with filters:', {
      serviceType,
      district,
      town,
      verified
    });

    // Build query
    const query = {};

    // Service type filter
    if (serviceType) {
      query.serviceCategories = { $in: [serviceType] };
    }

    // Location filter - search in serviceAreas
    if (district || town) {
      const locationQuery = {};
      if (district) locationQuery['serviceAreas.district'] = district;
      if (town) locationQuery['serviceAreas.town'] = town;
      
      // Match workers who serve the specified area
      Object.assign(query, locationQuery);
    }

    // Availability filter
    if (availability === 'true') {
      query.availability = true;
    }

    // Verified filter
    if (verified === 'true') {
      query.isVerified = true;
    }

    // Rating filter
    if (minRating) {
      query.averageRating = { $gte: parseFloat(minRating) };
    }

    console.log('Query:', JSON.stringify(query, null, 2));

    // Execute search with populated user data
    let workers = await Worker.find(query)
      .populate('userId', 'fullName email phoneNumber profileImage')
      .lean();

    console.log(`✅ Found ${workers.length} workers`);

    // Sort results
    if (sortBy === 'rating') {
      workers.sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0));
    } else if (sortBy === 'experience') {
      workers.sort((a, b) => (b.experience || 0) - (a.experience || 0));
    }

    // ✅ Calculate approximate distance if needed (simplified)
    // In a real app, you would use geospatial queries with actual coordinates
    if (town && maxDistance) {
      workers = workers.filter(worker => {
        // Check if worker serves this town
        return worker.serviceAreas?.some(area => area.town === town);
      });
    }

    res.status(200).json({
      success: true,
      data: {
        count: workers.length,
        workers
      }
    });

  } catch (error) {
    console.error('❌ Error searching workers:', error);
    next(error);
  }
};

/**
 * ✅ NEW - Get worker profile by ID (for customers to view)
 * @desc    Get detailed worker profile including reviews
 * @route   GET /api/v1/workers/:id/profile
 * @access  Public/Private
 */
exports.getWorkerProfile = async (req, res, next) => {
  try {
    const { id } = req.params;

    console.log('📋 Fetching worker profile:', id);

    // Find worker with populated data
    const worker = await Worker.findById(id)
      .populate('userId', 'fullName email phoneNumber profileImage createdAt')
      .lean();

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Get worker's reviews
    const Review = require('../models/Review');
    const reviews = await Review.find({
      workerId: id,
      status: 'approved'
    })
      .populate('customerId', 'fullName profileImage')
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    // Get completed bookings count
    const Booking = require('../models/Booking');
    const completedBookings = await Booking.countDocuments({
      workerId: id,
      status: 'completed'
    });

    // Compile profile data
    const profileData = {
      ...worker,
      reviews,
      completedBookingsCount: completedBookings,
      memberSince: worker.userId?.createdAt
    };

    console.log('✅ Worker profile fetched successfully');

    res.status(200).json({
      success: true,
      data: {
        worker: profileData
      }
    });

  } catch (error) {
    console.error('❌ Error fetching worker profile:', error);
    next(error);
  }
};

/**
 * ✅ EXISTING - Update your existing getWorkers method to support location filtering
 * This is an enhancement to your existing method
 */
exports.getWorkers = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      order = 'desc',
      search,
      serviceType,
      district,
      town,
      verified
    } = req.query;

    const query = {};

    // Search filter (name or email)
    if (search) {
      const users = await User.find({
        $or: [
          { fullName: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } }
        ]
      }).select('_id');

      query.userId = { $in: users.map(u => u._id) };
    }

    // Service type filter
    if (serviceType) {
      query.serviceCategories = { $in: [serviceType] };
    }

    // Location filters
    if (district) {
      query['serviceAreas.district'] = district;
    }
    if (town) {
      query['serviceAreas.town'] = town;
    }

    // Verified filter
    if (verified === 'true') {
      query.isVerified = true;
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = { [sortBy]: sortOrder };

    const workers = await Worker.find(query)
      .populate('userId', 'fullName email phoneNumber profileImage accountStatus')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const count = await Worker.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        workers,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });

  } catch (error) {
    console.error('❌ Error fetching workers:', error);
    next(error);
  }
};








