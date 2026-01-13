const Review = require('../models/Review');
const Booking = require('../models/Booking');
const Notification = require('../models/Notification');
const { uploadImage, isCloudinaryConfigured } = require('../config/cloudinary');
const fs = require('fs');

/**
 * @desc    Create a review
 * @route   POST /api/reviews
 * @access  Private/Customer
 * 
 * ✅ FIXED: Proper image upload handling with Cloudinary
 */
exports.createReview = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      bookingId,
      workerId,
      rating,
      comment,
      wouldRecommend,
      detailedRatings
    } = req.body;

    console.log('📝 ReviewController - Creating review:', {
      bookingId,
      workerId,
      rating,
      hasFiles: req.files?.length > 0
    });

    // Get customer user
    const User = require('../models/User');
    const customer = await User.findOne({ firebaseUid });
    
    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'Customer not found'
      });
    }

    // Verify booking exists and is completed
    const booking = await Booking.findOne({
      _id: bookingId,
      customerId: customer._id,
      status: 'completed'
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not completed'
      });
    }

    // Check if review already exists for this booking
    const existingReview = await Review.findOne({ bookingId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this booking'
      });
    }

    // Handle image uploads with proper error handling and fallback
    const images = [];
    if (req.files && req.files.length > 0) {
      console.log(`📸 Processing ${req.files.length} images`);
      
      // Check if Cloudinary is configured AND has valid credentials
      let useCloudinary = isCloudinaryConfigured();
      
      // Validate Cloudinary credentials aren't placeholders
      if (useCloudinary) {
        if (process.env.CLOUDINARY_CLOUD_NAME === 'your_cloud_name' ||
            process.env.CLOUDINARY_API_KEY === 'your_api_key' ||
            !process.env.CLOUDINARY_CLOUD_NAME ||
            !process.env.CLOUDINARY_API_KEY) {
          console.warn('⚠️  Cloudinary has invalid/placeholder values, using MongoDB storage');
          useCloudinary = false;
        }
      }
      
      if (useCloudinary) {
        console.log('Using Cloudinary for image storage');
        for (const file of req.files) {
          try {
            const buffer = fs.readFileSync(file.path);
            const result = await uploadImage(buffer, {
              folder: 'fixmate/reviews',
              resource_type: 'auto'
            });
            
            images.push({
              imageUrl: result.url,
              caption: ''
            });
            
            console.log(`✅ Image uploaded to Cloudinary`);
            fs.unlinkSync(file.path);
          } catch (uploadError) {
            console.error('❌ Cloudinary upload failed:', uploadError.message);
            // Fallback to base64 if Cloudinary fails
            try {
              const buffer = fs.readFileSync(file.path);
              const base64Image = buffer.toString('base64');
              images.push({
                imageUrl: `data:${file.mimetype};base64,${base64Image}`,
                caption: ''
              });
              console.log(`✅ Fallback: Image stored as base64`);
              fs.unlinkSync(file.path);
            } catch (fallbackError) {
              console.error('❌ Fallback also failed:', fallbackError);
            }
          }
        }
      } else {
        console.log('Using MongoDB base64 storage');
        // Store as base64 in MongoDB
        for (const file of req.files) {
          try {
            const buffer = fs.readFileSync(file.path);
            const base64Image = buffer.toString('base64');
            
            images.push({
              imageUrl: `data:${file.mimetype};base64,${base64Image}`,
              caption: ''
            });
            
            console.log(`✅ Image stored as base64`);
            fs.unlinkSync(file.path);
          } catch (error) {
            console.error('❌ Error processing image:', error);
          }
        }
      }
    }

    // Parse detailed ratings if it's a string
    let parsedDetailedRatings = detailedRatings;
    if (typeof detailedRatings === 'string') {
      try {
        parsedDetailedRatings = JSON.parse(detailedRatings);
      } catch (e) {
        console.error('Error parsing detailed ratings:', e);
        parsedDetailedRatings = {};
      }
    }

    // Create review
    const review = await Review.create({
      bookingId,
      customerId: customer._id,
      workerId,
      rating: Number(rating),
      comment: comment?.trim() || '',
      detailedRatings: parsedDetailedRatings,
      images,
      wouldRecommend: wouldRecommend === 'true' || wouldRecommend === true,
      serviceType: booking.serviceType
    });

    console.log('✅ Review created successfully:', review._id);

    // Notify worker
    await Notification.create({
      userId: workerId,
      type: 'review-received',
      title: 'New Review',
      message: `You received a ${rating}-star review`,
      relatedReview: review._id,
      relatedUser: customer._id
    });

    // Populate review before sending response
    const populatedReview = await Review.findById(review._id)
      .populate('customerId', 'fullName profileImage')
      .populate('workerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt');

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: { review: populatedReview }
    });
  } catch (error) {
    console.error('❌ Error creating review:', error);
    
    // Send user-friendly error response
    return res.status(500).json({
      success: false,
      message: 'Failed to submit review. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get review for a specific booking
 * @route   GET /api/reviews/booking/:bookingId
 * @access  Private
 */
exports.getBookingReview = async (req, res, next) => {
  try {
    const { bookingId } = req.params;

    const review = await Review.findOne({ bookingId })
      .populate('customerId', 'fullName profileImage')
      .populate('workerId', 'fullName profileImage')
      .populate('bookingId', 'serviceType completedAt');

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'No review found for this booking'
      });
    }

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    console.error('Error getting booking review:', error);
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
    const mongoose = require('mongoose');
    const ratingDistribution = await Review.aggregate([
      {
        $match: {
          workerId: mongoose.Types.ObjectId(workerId),
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
    console.error('Error getting worker reviews:', error);
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

    const User = require('../models/User');
    const customer = await User.findOne({ firebaseUid });
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

    // Handle new image uploads
    if (req.files && req.files.length > 0) {
      const newImages = [];
      const useCloudinary = isCloudinaryConfigured();
      
      for (const file of req.files) {
        try {
          if (useCloudinary) {
            const buffer = fs.readFileSync(file.path);
            const result = await uploadImage(buffer, {
              folder: 'fixmate/reviews',
              resource_type: 'auto'
            });
            newImages.push({
              imageUrl: result.url,
              caption: ''
            });
            fs.unlinkSync(file.path);
          } else {
            const buffer = fs.readFileSync(file.path);
            const base64Image = buffer.toString('base64');
            newImages.push({
              imageUrl: `data:${file.mimetype};base64,${base64Image}`,
              caption: ''
            });
            fs.unlinkSync(file.path);
          }
        } catch (uploadError) {
          console.error('Error uploading image:', uploadError);
        }
      }
      updateData.images = [...review.images, ...newImages];
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).populate('customerId', 'fullName profileImage')
     .populate('workerId', 'fullName profileImage');

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

    const User = require('../models/User');
    const customer = await User.findOne({ firebaseUid });
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

    await review.remove();

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

    const User = require('../models/User');
    const worker = await User.findOne({ firebaseUid });
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

    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid });
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
      message: 'Marked as helpful'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Flag review for moderation
 * @route   POST /api/reviews/:id/flag
 * @access  Private
 */
exports.flagReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;
    const { reason } = req.body;

    const User = require('../models/User');
    const user = await User.findOne({ firebaseUid });
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

    const User = require('../models/User');
    const customer = await User.findOne({ firebaseUid });

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
    const existingRating = await Review.findOne({
      bookingId,
      customerId,
      workerId: workerUser._id,
      reviewType: 'worker-to-customer'
    });

    if (existingRating) {
      console.warn('⚠️ Duplicate rating attempt');
      return res.status(400).json({
        success: false,
        message: 'You have already rated this customer for this booking'
      });
    }

    // Create the rating
    const customerRating = await Review.create({
      bookingId,
      customerId,
      workerId: workerUser._id,
      rating: Number(rating),
      comment: comment?.trim() || '',
      reviewType: 'worker-to-customer',
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
      const allCustomerRatings = await Review.find({
        customerId,
        reviewType: 'worker-to-customer',
        isVisible: true
      });

      const totalRatings = allCustomerRatings.length;
      const sumRatings = allCustomerRatings.reduce((sum, r) => sum + r.rating, 0);
      const newAverageRating = Math.round((sumRatings / totalRatings) * 10) / 10;

      customer.averageRating = newAverageRating;
      customer.totalRatings = totalRatings;
      await customer.save();

      console.log('📊 Customer rating updated:', {
        average: newAverageRating,
        total: totalRatings
      });
    }

    // Create notification
    await Notification.create({
      userId: customerId,
      type: 'review-received',
      title: 'New Rating',
      message: `You received a ${rating}-star rating from a worker`,
      relatedReview: customerRating._id,
      relatedUser: workerUser._id
    });

    res.status(201).json({
      success: true,
      message: 'Customer rated successfully',
      data: { rating: customerRating }
    });
  } catch (error) {
    console.error('❌ Error rating customer:', error);
    next(error);
  }
};

module.exports = exports;