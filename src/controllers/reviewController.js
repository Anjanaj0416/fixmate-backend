const { Review, Booking, Worker, Notification } = require('../models');

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