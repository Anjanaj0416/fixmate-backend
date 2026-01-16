const { Worker, User, Review, Booking } = require('../models');
const mongoose = require('mongoose');


/**
 * ✅ NEW - Get nearby workers filtered by service type and location
 * @desc    Get nearby workers filtered by service type
 * @route   GET /workers/nearby
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
 * Update availability AND verification status
 * @route   PUT /api/workers/availability
 * @access  Private/Worker
 * 
 * ✅ UPDATED: Now also updates isVerified field
 * When availability = true → isVerified = true
 * When availability = false → isVerified = false
 */
exports.updateAvailability = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { availability, isVerified } = req.body;

    console.log('🔄 Updating worker availability and verification:', {
      firebaseUid,
      availability,
      isVerified
    });

    const user = await User.findOne({ firebaseUid });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // ✅ Update both availability AND isVerified
    const worker = await Worker.findOneAndUpdate(
      { userId: user._id },
      {
        availability: availability,
        isVerified: isVerified !== undefined ? isVerified : availability  // Default to availability value if not provided
      },
      { new: true }
    ).populate('userId', 'fullName email phoneNumber profileImage');

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    console.log('✅ Worker updated successfully:', {
      workerId: worker._id,
      availability: worker.availability,
      isVerified: worker.isVerified
    });

    res.status(200).json({
      success: true,
      message: 'Availability and verification status updated successfully',
      data: {
        availability: worker.availability,
        isVerified: worker.isVerified,
        worker: worker
      }
    });
  } catch (error) {
    console.error('❌ Error updating availability:', error);
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
 * @route   GET /workers/:id/profile
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

/**
 * Get worker's OWN profile (authenticated worker viewing their own profile)
 * @desc    Get current worker's profile with stats
 * @route   GET /api/v1/workers/profile
 * @access  Private/Worker
 */
exports.getWorkerOwnProfile = async (req, res, next) => {
  try {
    console.log('📋 Fetching own worker profile for user:', req.user.email);

    // Find worker by userId (from auth token)
    const worker = await Worker.findOne({ userId: req.user._id })
      .populate('userId', 'fullName email phoneNumber profileImage createdAt location')
      .lean();

    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    console.log('✅ Worker own profile fetched successfully');

    res.status(200).json({
      success: true,
      data: worker
    });

  } catch (error) {
    console.error('❌ Error fetching worker own profile:', error);
    next(error);
  }
};


/**
 * ✅ NEW - Get worker dashboard data
 * @desc    Get worker dashboard data with stats and recent bookings
 * @route   GET /workers/dashboard
 * @access  Private/Worker
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;

    console.log('📊 Fetching dashboard for worker:', firebaseUid);

    // Find user
    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find worker profile
    const worker = await Worker.findOne({ userId: user._id });
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker profile not found'
      });
    }

    console.log('👷 Worker found:', worker._id);

    // Get booking statistics
    const pendingRequestsCount = await Booking.countDocuments({
      sentToWorkers: worker._id,
      status: { $in: ['quote_requested', 'pending'] }
    });

    const activeJobsCount = await Booking.countDocuments({
      workerId: user._id,
      status: { $in: ['accepted', 'in-progress'] }
    });

    const completedJobsCount = await Booking.countDocuments({
      workerId: user._id,
      status: 'completed'
    });

    // Calculate total earnings (if Payment model exists)
    let totalEarnings = 0;
    try {
      const Payment = require('../models/Payment');
      const payments = await Payment.find({
        workerId: user._id,
        status: 'completed'
      });
      totalEarnings = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
    } catch (err) {
      console.log('ℹ️  Payment model not available, skipping earnings calculation');
    }

    const stats = {
      pendingRequests: pendingRequestsCount,
      activeJobs: activeJobsCount,
      completedJobs: completedJobsCount,
      totalEarnings: totalEarnings
    };

    console.log('📈 Stats calculated:', stats);

    // Get recent bookings (both pending requests and accepted jobs)
    const recentBookings = await Booking.find({
      $or: [
        { sentToWorkers: worker._id, status: { $in: ['quote_requested', 'pending'] } },
        { workerId: user._id }
      ]
    })
      .populate('customerId', 'fullName profileImage phoneNumber email')
      .sort({ createdAt: -1 })
      .limit(10);

    console.log('📋 Found', recentBookings.length, 'recent bookings');

    // Calculate profile completion percentage
    const profileCompletion = calculateProfileCompletion(worker);

    res.status(200).json({
      success: true,
      data: {
        stats,
        recentBookings,
        worker: {
          id: worker._id,
          userId: user._id,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profileImage: user.profileImage,
          completionRate: worker.completionRate || 0,
          rating: worker.rating || 0,
          totalReviews: worker.totalReviews || 0,
          isVerified: worker.isVerified || false,
          availability: worker.availability || true,
          profileCompletion: profileCompletion,
          serviceCategories: worker.serviceCategories || [],
          bio: worker.bio || '',
          experience: worker.experience || ''
        }
      }
    });

    console.log('✅ Dashboard data sent successfully');

  } catch (error) {
    console.error('❌ Error fetching dashboard:', error);
    next(error);
  }
};

/**
 * Helper function to calculate profile completion percentage
 */
function calculateProfileCompletion(worker) {
  let completedFields = 0;
  const totalFields = 10;

  // Check essential fields
  if (worker.bio && worker.bio.length > 20) completedFields++;
  if (worker.experience && worker.experience > 0) completedFields++;
  if (worker.serviceCategories && worker.serviceCategories.length > 0) completedFields++;
  if (worker.specializations && worker.specializations.length > 0) completedFields++;
  if (worker.serviceAreas && worker.serviceAreas.length > 0) completedFields++;
  if (worker.hourlyRate && worker.hourlyRate > 0) completedFields++;
  if (worker.availability !== undefined) completedFields++;
  if (worker.profileImage) completedFields++;
  if (worker.portfolio && worker.portfolio.length > 0) completedFields++;
  if (worker.certifications && worker.certifications.length > 0) completedFields++;

  return Math.round((completedFields / totalFields) * 100);
}

/**
 * ✅ FIXED - Get worker profile by ID (for customers to view)
 * @desc    Get detailed worker profile including reviews with images
 * @route   GET /api/v1/workers/:id/profile
 * @access  Public
 */
exports.getWorkerProfileById = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log('📋 Fetching worker profile by ID:', id);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid worker ID format'
      });
    }

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

    console.log('✅ Worker found:', worker.userId?.fullName);

    // ✅ FIX: Get worker's reviews with CORRECT field name
    // Changed from 'status' to 'moderationStatus' to match Review schema
    const reviews = await Review.find({
      workerId: new mongoose.Types.ObjectId(id),  // Ensure proper ObjectId
      moderationStatus: 'approved',  // ✅ FIXED: Changed from 'status'
      isVisible: true
    })
      .populate('customerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    console.log(`📊 Found ${reviews.length} approved reviews for worker ${id}`);
    
    // Log detailed review data for debugging
    if (reviews.length > 0) {
      reviews.forEach((review, index) => {
        console.log(`  Review ${index + 1}:`, {
          id: review._id,
          rating: review.rating,
          customerName: review.customerId?.fullName || 'Anonymous',
          hasComment: !!review.comment,
          hasImages: review.images?.length > 0,
          imageCount: review.images?.length || 0,
          wouldRecommend: review.wouldRecommend,
          createdAt: review.createdAt
        });

        // Log image details if present
        if (review.images && review.images.length > 0) {
          review.images.forEach((img, imgIndex) => {
            console.log(`    Image ${imgIndex + 1}:`, {
              hasUrl: !!img.imageUrl,
              urlLength: img.imageUrl?.length || 0,
              hasCaption: !!img.caption,
              isBase64: img.imageUrl?.startsWith('data:') || false
            });
          });
        }
      });
    } else {
      console.log('⚠️ No reviews found. Checking database...');
      
      // Debug: Check if any reviews exist for this worker with any status
      const allReviews = await Review.find({ workerId: new mongoose.Types.ObjectId(id) }).lean();
      console.log(`  Total reviews in DB for this worker: ${allReviews.length}`);
      
      if (allReviews.length > 0) {
        console.log('  Review statuses:', allReviews.map(r => ({
          id: r._id,
          moderationStatus: r.moderationStatus,
          isVisible: r.isVisible,
          rating: r.rating
        })));
      }
    }

    // Get completed bookings count
    const completedBookings = await Booking.countDocuments({
      workerId: new mongoose.Types.ObjectId(id),
      status: 'completed'
    });

    console.log(`📦 Completed bookings: ${completedBookings}`);

    // Calculate rating statistics from reviews
    const ratingStats = await Review.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(id),
          moderationStatus: 'approved',
          isVisible: true
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    console.log('📈 Rating distribution:', ratingStats);

    // Calculate average rating and total
    let averageRating = 0;
    let totalReviews = 0;
    if (ratingStats.length > 0) {
      totalReviews = ratingStats.reduce((sum, item) => sum + item.count, 0);
      const totalScore = ratingStats.reduce((sum, item) => sum + (item._id * item.count), 0);
      averageRating = totalReviews > 0 ? (totalScore / totalReviews).toFixed(1) : 0;
    }

    console.log(`⭐ Average rating: ${averageRating} (${totalReviews} reviews)`);

    // Compile profile data with review statistics
    const profileData = {
      ...worker,
      memberSince: worker.userId?.createdAt,
      reviewStats: {
        average: parseFloat(averageRating),
        total: totalReviews,
        distribution: ratingStats
      }
    };

    console.log('✅ Worker profile compiled successfully');

    res.status(200).json({
      success: true,
      data: {
        worker: profileData,
        reviews: reviews,
        completedJobs: completedBookings
      }
    });

  } catch (error) {
    console.error('❌ Error fetching worker profile:', error);
    next(error);
  }
};

/**
 * ✅ FIXED - Get worker reviews (alternative endpoint)
 * @desc    Get worker reviews with pagination
 * @route   GET /api/v1/workers/:id/reviews
 * @access  Public
 */
exports.getWorkerReviews = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    console.log('📋 Fetching paginated reviews for worker:', id);

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid worker ID format'
      });
    }

    const worker = await Worker.findById(id);
    if (!worker) {
      return res.status(404).json({
        success: false,
        message: 'Worker not found'
      });
    }

    // Build query with CORRECT field names
    const query = {
      workerId: new mongoose.Types.ObjectId(id),
      isVisible: true,
      moderationStatus: 'approved'  // ✅ FIXED: Changed from 'status'
    };

    if (rating) {
      query.rating = parseInt(rating);
      console.log(`  Filtering by rating: ${rating}`);
    }

    // Get reviews with pagination
    const reviews = await Review.find(query)
      .populate('customerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .lean();

    const count = await Review.countDocuments(query);

    console.log(`✅ Found ${reviews.length} reviews (page ${page} of ${Math.ceil(count / limit)})`);

    // Calculate rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          workerId: new mongoose.Types.ObjectId(id),
          isVisible: true,
          moderationStatus: 'approved'
        }
      },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: -1 }
      }
    ]);

    // Calculate average rating
    let averageRating = 0;
    if (ratingDistribution.length > 0) {
      const totalRatings = ratingDistribution.reduce((sum, item) => sum + item.count, 0);
      const totalScore = ratingDistribution.reduce((sum, item) => sum + (item._id * item.count), 0);
      averageRating = totalRatings > 0 ? (totalScore / totalRatings).toFixed(1) : 0;
    }

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count,
        averageRating: parseFloat(averageRating),
        ratingDistribution: ratingDistribution
      }
    });
  } catch (error) {
    console.error('❌ Error fetching worker reviews:', error);
    next(error);
  }
};

module.exports = exports;