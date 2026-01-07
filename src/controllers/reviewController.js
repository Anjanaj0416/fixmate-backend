const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Worker = require('../models/Worker');
const User = require('../models/User');
const Notification = require('../models/Notification');

/**
 * @desc    Create a review
 * @route   POST /api/reviews
 * @access  Private/Customer
 */
exports.createReview = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      bookingId,
      workerId,
      rating,
      comment,
      detailedRatings,
      images,
      wouldRecommend
    } = req.body;

    const customer = await require('../models/User').findOne({ firebaseUid });

    // Verify booking exists and is completed
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    if (booking.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    const review = await Review.create({
      bookingId,
      customerId: customer._id,
      workerId,
      rating,
      comment,
      detailedRatings,
      images: images || [],
      wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : true,
      serviceType: booking.serviceType
    });

    // Notify worker
    await Notification.create({
      userId: workerId,
      type: 'review-received',
      title: 'New Review',
      message: `You received a ${rating}-star review`,
      relatedReview: review._id,
      relatedUser: customer._id
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get reviews for a worker
 * @route   GET /api/reviews/worker/:workerId
 * @access  Public
 */
exports.getWorkerReviews = async (req, res, next) => {
  try {
    const { workerId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;

    const query = {
      workerId,
      isVisible: true,
      moderationStatus: 'approved'
    };

    if (rating) query.rating = parseInt(rating);

    const reviews = await Review.find(query)
      .populate('customerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Review.countDocuments(query);

    // Get rating distribution
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          workerId: require('mongoose').Types.ObjectId(workerId),
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

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
        ratingDistribution
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get review by ID
 * @route   GET /api/reviews/:id
 * @access  Public
 */
exports.getReviewById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const review = await Review.findById(id)
      .populate('customerId', 'fullName profileImage')
      .populate('workerId', 'fullName')
      .populate('bookingId', 'serviceType completedAt');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private/Customer
 */
exports.updateReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { rating, comment, detailedRatings, wouldRecommend } = req.body;

    const customer = await require('../models/User').findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const updateData = {};
    if (rating) updateData.rating = rating;
    if (comment) updateData.comment = comment;
    if (detailedRatings) updateData.detailedRatings = detailedRatings;
    if (wouldRecommend !== undefined) updateData.wouldRecommend = wouldRecommend;

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    // Update worker rating
    const worker = await Worker.findOne({ userId: review.workerId });
    if (worker) {
      // Recalculate worker rating
      const reviews = await Review.find({ 
        workerId: review.workerId,
        isVisible: true,
        moderationStatus: 'approved'
      });
      
      const totalRating = reviews.reduce((sum, r) => sum + r.rating, 0);
      worker.rating.average = totalRating / reviews.length;
      worker.rating.count = reviews.length;
      await worker.save();
    }

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: { review: updatedReview }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private/Customer
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const customer = await require('../models/User').findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Soft delete
    review.isVisible = false;
    await review.save();

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Worker response to review
 * @route   POST /api/reviews/:id/response
 * @access  Private/Worker
 */
exports.respondToReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { message } = req.body;

    const worker = await require('../models/User').findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.workerId.toString() !== worker._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    review.workerResponse = {
      message,
      respondedAt: new Date()
    };

    await review.save();

    res.status(200).json({
      success: true,
      message: 'Response added successfully',
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark review as helpful
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
exports.markHelpful = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const user = await require('../models/User').findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.markHelpful(user._id);

    res.status(200).json({
      success: true,
      message: 'Review marked as helpful',
      data: { helpfulVotes: review.helpfulVotes }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag review
 * @route   POST /api/reviews/:id/flag
 * @access  Private
 */
exports.flagReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { reason } = req.body;

    const user = await require('../models/User').findOne({ firebaseUid });
    const review = await Review.findById(id);

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    await review.flag(reason, user._id);

    res.status(200).json({
      success: true,
      message: 'Review flagged for moderation'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get customer's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private/Customer
 */
exports.getMyReviews = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { page = 1, limit = 10 } = req.query;

    const customer = await require('../models/User').findOne({ firebaseUid });

    const reviews = await Review.find({ customerId: customer._id })
      .populate('workerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Review.countDocuments({ customerId: customer._id });

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
 * @desc    Worker rates a customer after completing a booking
 * @route   POST /api/reviews/rate-customer
 * @access  Private/Worker
 * 
 * ADD THIS METHOD TO: fixmate-backend/src/controllers/reviewController.js
 */
exports.rateCustomer = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { bookingId, customerId, rating, comment } = req.body;

    console.log('⭐ Worker rating customer:', {
      bookingId,
      customerId,
      rating,
      hasComment: !!comment
    });

    // Validate rating
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: 'Booking ID is required'
      });
    }

    // Get worker user
    const User = require('../models/User');
    const workerUser = await User.findOne({ firebaseUid });
    if (!workerUser) {
      return res.status(404).json({
        success: false,
        message: 'Worker user not found'
      });
    }

    // Verify booking exists and worker completed it
    const Booking = require('../models/Booking');
    const booking = await Booking.findOne({
      _id: bookingId,
      workerId: workerUser._id,
      status: 'completed'
    });

    if (!booking) {
      console.warn('⚠️ Invalid booking or unauthorized rating attempt');
      return res.status(403).json({
        success: false,
        message: 'Invalid booking or you are not authorized to rate this customer. The job must be completed.'
      });
    }

    console.log('📋 Booking verified:', booking._id);

    // Check if worker already rated this customer for this booking
    const Review = require('../models/Review');
    const existingRating = await Review.findOne({
      bookingId,
      customerId,
      workerId: workerUser._id,
      reviewType: 'worker-to-customer' // To distinguish from customer-to-worker reviews
    });

    if (existingRating) {
      console.warn('⚠️ Duplicate rating attempt');
      return res.status(400).json({
        success: false,
        message: 'You have already rated this customer for this booking'
      });
    }

    // Create the rating (using Review model with additional field)
    const customerRating = await Review.create({
      bookingId,
      customerId,
      workerId: workerUser._id,
      rating: Number(rating),
      comment: comment?.trim() || '',
      reviewType: 'worker-to-customer', // New field to distinguish type
      isVisible: true,
      moderationStatus: 'approved',
      serviceType: booking.serviceType,
      createdAt: new Date()
    });

    console.log('✅ Customer rated successfully');

    // Update customer's average rating
    const Customer = require('../models/Customer');
    const customer = await Customer.findOne({ userId: customerId });
    
    if (customer) {
      // Calculate new average rating for customer
      const allCustomerRatings = await Review.find({
        customerId,
        reviewType: 'worker-to-customer',
        isVisible: true
      });

      const totalRatings = allCustomerRatings.length;
      const sumRatings = allCustomerRatings.reduce((sum, r) => sum + r.rating, 0);
      const newAverageRating = Math.round((sumRatings / totalRatings) * 10) / 10;

      // Update customer rating (if Customer model has rating field)
      // Note: You may need to add a 'rating' field to Customer model
      customer.averageRating = newAverageRating;
      customer.totalRatings = totalRatings;
      await customer.save();

      console.log('📊 Customer rating updated:', {
        average: newAverageRating,
        total: totalRatings
      });
    }

    // Create notification for customer
    try {
      const Notification = require('../models/Notification');
      await Notification.create({
        userId: customerId,
        type: 'rating-received',
        title: 'New Rating from Worker',
        message: `You received a ${rating}-star rating from ${workerUser.fullName}`,
        relatedBooking: bookingId,
        relatedUser: workerUser._id
      });
      console.log('✅ Notification created');
    } catch (notifError) {
      console.warn('⚠️ Failed to create notification:', notifError.message);
      // Don't fail the request if notification fails
    }

    res.status(200).json({
      success: true,
      message: 'Customer rated successfully',
      data: {
        rating: customerRating.rating,
        comment: customerRating.comment,
        createdAt: customerRating.createdAt,
        customerAverageRating: customer?.averageRating || null,
        customerTotalRatings: customer?.totalRatings || null
      }
    });
  } catch (error) {
    console.error('❌ Error rating customer:', error);
    next(error);
  }
};

/**
 * @desc    Create a review (UPDATED VERSION with image handling)
 * @route   POST /api/v1/reviews
 * @access  Private/Customer
 */
exports.createReview = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    
    console.log('📝 Creating review - Request body:', req.body);
    console.log('📝 Files:', req.files);

    const {
      bookingId,
      workerId,
      rating,
      comment,
      detailedRatings,
      wouldRecommend
    } = req.body;

    // Validate required fields
    if (!bookingId || !workerId || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: bookingId, workerId, rating, and comment are required'
      });
    }

    // Validate rating
    const ratingNum = parseInt(rating);
    if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be a number between 1 and 5'
      });
    }

    const customer = await User.findOne({ firebaseUid });
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify booking exists and is completed
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }

    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Can only review completed bookings'
      });
    }

    if (booking.customerId.toString() !== customer._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized - You can only review your own bookings'
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Review already exists for this booking'
      });
    }

    // Process images if provided
    let imageUrls = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} review images`);
      
      // Store file paths (in production, upload to Cloudinary)
      imageUrls = req.files.map(file => ({
        imageUrl: `/uploads/reviews/${file.filename}`,
        caption: ''
      }));
    }

    // Parse detailed ratings if provided
    let parsedDetailedRatings = null;
    if (detailedRatings) {
      try {
        parsedDetailedRatings = typeof detailedRatings === 'string' 
          ? JSON.parse(detailedRatings) 
          : detailedRatings;
      } catch (err) {
        console.warn('⚠️ Failed to parse detailedRatings:', err);
      }
    }

    // Create review
    const review = await Review.create({
      bookingId,
      customerId: customer._id,
      workerId,
      rating: ratingNum,
      comment: comment.trim(),
      detailedRatings: parsedDetailedRatings,
      images: imageUrls,
      wouldRecommend: wouldRecommend === 'true' || wouldRecommend === true,
      serviceType: booking.serviceType
    });

    console.log('✅ Review created successfully:', review._id);

    // Populate the review for response
    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'fullName profileImage')
      .populate('workerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt');

    // Update worker's rating
    const worker = await Worker.findOne({ userId: workerId });
    if (worker) {
      // Recalculate average rating
      const allReviews = await Review.find({ 
        workerId,
        isVisible: true,
        moderationStatus: 'approved'
      });
      
      const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0);
      const avgRating = allReviews.length > 0 ? totalRating / allReviews.length : 0;
      
      worker.rating = {
        average: avgRating,
        count: allReviews.length
      };
      await worker.save();
      
      console.log(`✅ Updated worker rating: ${avgRating.toFixed(2)} (${allReviews.length} reviews)`);
    }

    // Send notification to worker
    try {
      await Notification.create({
        userId: workerId,
        type: 'review-received',
        title: 'New Review Received',
        message: `You received a ${ratingNum}-star review from ${customer.fullName}`,
        relatedReview: review._id,
        relatedUser: customer._id
      });
      console.log('✅ Notification sent to worker');
    } catch (notifError) {
      console.warn('⚠️ Failed to send notification:', notifError);
    }

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review: populatedReview }
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    next(error);
  }
};

/**
 * @desc    Get review for a specific booking
 * @route   GET /api/v1/reviews/booking/:bookingId
 * @access  Private
 */
exports.getBookingReview = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { firebaseUid } = req.user;

    console.log('📋 Getting review for booking:', bookingId);

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Find review for this booking
    const review = await Review.findOne({ bookingId })
      .populate('customerId', 'fullName profileImage email')
      .populate('workerId', 'fullName profileImage email')
      .populate('bookingId', 'serviceType completedAt');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'No review found for this booking'
      });
    }

    // Verify user has access to this review
    const hasAccess = 
      review.customerId._id.toString() === user._id.toString() ||
      review.workerId._id.toString() === user._id.toString();

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this review'
      });
    }

    console.log('✅ Review found:', review._id);

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('❌ Error getting booking review:', error);
    next(error);
  }
};

/**
 * @desc    Check if booking can be reviewed
 * @route   GET /api/v1/reviews/booking/:bookingId/can-review
 * @access  Private
 */
exports.canReviewBooking = async (req, res, next) => {
  try {
    const { bookingId } = req.params;
    const { firebaseUid } = req.user;

    console.log('🔍 Checking if booking can be reviewed:', bookingId);

    const user = await User.findOne({ firebaseUid });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get booking
    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found',
        canReview: false
      });
    }

    // Check if user is the customer
    const isCustomer = booking.customerId.toString() === user._id.toString();
    if (!isCustomer) {
      return res.status(403).json({
        success: false,
        message: 'Only the customer can review this booking',
        canReview: false
      });
    }

    // Check if booking is completed
    if (booking.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Booking must be completed before reviewing',
        canReview: false
      });
    }

    // Check if review already exists
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(200).json({
        success: true,
        message: 'Review already exists for this booking',
        canReview: false,
        hasReview: true,
        review: existingReview
      });
    }

    console.log('✅ Booking can be reviewed');

    res.status(200).json({
      success: true,
      message: 'Booking can be reviewed',
      canReview: true,
      hasReview: false
    });
  } catch (error) {
    console.error('❌ Error checking review eligibility:', error);
    next(error);
  }
};