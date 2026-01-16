const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  // ==========================================
  // USER REFERENCE
  // ==========================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
    // ✅ REMOVED: index: true (unique already creates index)
  },

  firebaseUid: {
    type: String,
    required: true,
    unique: true
    // ✅ REMOVED: index: true (unique already creates index)
  },

  // ==========================================
  // SERVICE INFORMATION
  // ==========================================

  // Main service categories (enum-based for filtering)
  serviceCategories: [{
    type: String,
    required: true,
    enum: [
      'plumbing',
      'electrical',
      'carpentry',
      'painting',
      'masonry',
      'welding',
      'air-conditioning',
      'appliance-repair',
      'landscaping',
      'roofing',
      'flooring',
      'pest-control',
      'cleaning',
      'moving',
      'other'
    ]
  }],

  // Detailed specializations (flexible, no enum)
  specializations: [{
    type: String,
    trim: true
  }],

  // Experience
  yearsOfExperience: {
    type: Number,
    required: true,
    min: 0
  },

  experienceLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'expert'],
    required: true
  },

  // ==========================================
  // BUSINESS INFORMATION
  // ==========================================

  businessName: {
    type: String,
    trim: true
  },

  businessRegistrationNumber: {
    type: String,
    trim: true
  },

  bio: {
    type: String,
    maxlength: 500,
    trim: true
  },

  // ==========================================
  // SERVICE AREA
  // ==========================================

  serviceAreas: [{
    district: {
      type: String,
      required: true
    },
    towns: [{
      type: String
    }]
  }],

  maxTravelDistance: {
    type: Number,
    default: 20 // in kilometers
  },

  // ==========================================
  // PRICING
  // ==========================================

  hourlyRate: {
    type: Number,
    min: 0
  },

  minimumCharge: {
    type: Number,
    min: 0
  },

  calloutFee: {
    type: Number,
    default: 0
  },

  // ==========================================
  // VERIFICATION & DOCUMENTS
  // ==========================================

  isVerified: {
    type: Boolean,
    default: false
  },

  verificationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },

  verifiedAt: Date,

  verificationDocuments: [{
    type: {
      type: String,
      enum: ['id', 'license', 'certification', 'insurance', 'other']
    },
    documentUrl: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    expiryDate: Date,
    certificateUrl: String
  }],

  // ==========================================
  // PORTFOLIO
  // ==========================================

  portfolio: [{
    imageUrl: String,
    caption: String,
    projectType: String,
    completedDate: Date,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==========================================
  // RATINGS & REVIEWS
  // ==========================================

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  totalReviews: {
    type: Number,
    default: 0
  },

  ratingBreakdown: {
    5: { type: Number, default: 0 },
    4: { type: Number, default: 0 },
    3: { type: Number, default: 0 },
    2: { type: Number, default: 0 },
    1: { type: Number, default: 0 }
  },

  // ==========================================
  // WORK STATISTICS
  // ==========================================

  completedJobs: {
    type: Number,
    default: 0
  },

  ongoingJobs: {
    type: Number,
    default: 0
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  acceptanceRate: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
  },

  responseTime: {
    type: Number, // in minutes
    default: 0
  },

  // ==========================================
  // AVAILABILITY
  // ==========================================

  isAvailable: {
    type: Boolean,
    default: true
  },

  availability: {
    monday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    tuesday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    wednesday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    thursday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    friday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    saturday: {
      available: { type: Boolean, default: true },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    },
    sunday: {
      available: { type: Boolean, default: false },
      startTime: { type: String, default: '08:00' },
      endTime: { type: String, default: '18:00' }
    }
  },

  // ==========================================
  // BANK DETAILS (for payments)
  // ==========================================

  bankDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    branchName: String,
    isVerified: {
      type: Boolean,
      default: false
    }
  },

  // ==========================================
  // EMERGENCY CONTACT
  // ==========================================

  emergencyContact: {
    name: String,
    phoneNumber: String,
    relationship: String
  },

  // ==========================================
  // PREFERENCES
  // ==========================================

  preferences: {
    autoAcceptBookings: {
      type: Boolean,
      default: false
    },
    instantBookingEnabled: {
      type: Boolean,
      default: false
    },
    notifyNewBookings: {
      type: Boolean,
      default: true
    },
    notifyMessages: {
      type: Boolean,
      default: true
    }
  },

  // ==========================================
  // TIMESTAMPS
  // ==========================================

  createdAt: {
    type: Date,
    default: Date.now
  },

  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ✅ FIXED: Indexes
// NOTE: userId and firebaseUid already have unique: true which creates indexes
// Only add compound and search indexes here
workerSchema.index({ 'serviceAreas.district': 1 });
workerSchema.index({ rating: -1, totalReviews: -1 });
workerSchema.index({ isVerified: 1, rating: -1 });
workerSchema.index({ serviceCategories: 1, 'serviceAreas.district': 1 });
workerSchema.index({ completedJobs: -1 });

// ==========================================
// METHODS
// ==========================================

/**
 * Update worker's rating
 */
workerSchema.methods.updateRating = async function (newRating) {
  const Review = require('./Review');

  // Get all approved and visible reviews for this worker
  const reviews = await Review.find({
    workerId: this.userId,
    isVisible: true,
    moderationStatus: 'approved'
  });

  if (reviews.length === 0) {
    // No reviews yet
    this.rating = 0;
    this.totalReviews = 0;
  } else {
    // Calculate average rating
    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    this.rating = Math.round((totalRating / reviews.length) * 10) / 10;
    this.totalReviews = reviews.length;

    // Update rating breakdown
    this.ratingBreakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(review => {
      this.ratingBreakdown[review.rating] += 1;
    });
  }

  // ✅ FIX: Only validate the fields that were actually modified
  // This prevents validation errors on required fields like experienceLevel and yearsOfExperience
  // that weren't changed by this method
  await this.save({ validateModifiedOnly: true });
};

/**
 * Update worker statistics
 */
workerSchema.methods.updateStats = async function () {
  const Booking = require('./Booking');

  const stats = await Booking.aggregate([
    { $match: { workerId: this.userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  let completedJobs = 0;
  let ongoingJobs = 0;

  stats.forEach(stat => {
    if (stat._id === 'completed') completedJobs = stat.count;
    if (['accepted', 'in_progress'].includes(stat._id)) ongoingJobs += stat.count;
  });

  this.completedJobs = completedJobs;
  this.ongoingJobs = ongoingJobs;

  await this.save();
};

/**
 * Check if worker serves a specific location
 */
workerSchema.methods.servesLocation = function (district, town = null) {
  const serviceArea = this.serviceAreas.find(area => area.district === district);

  if (!serviceArea) return false;
  if (!town) return true;

  return serviceArea.towns.length === 0 || serviceArea.towns.includes(town);
};

// ==========================================
// MIDDLEWARE
// ==========================================

// Update timestamp before save
workerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Worker', workerSchema);