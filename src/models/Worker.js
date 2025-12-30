const mongoose = require('mongoose');

/**
 * Worker Model Schema
 * 
 * ✅ UPDATED: Fixed specializations validation error
 * 
 * CHANGES MADE:
 * 1. OLD: specializations (enum-based) → NEW: serviceCategories (enum-based)
 * 2. NEW: specializations (flexible string array, no enum restriction)
 * 
 * This allows:
 * - serviceCategories: ['plumbing'] ← For filtering/searching
 * - specializations: ['Drain Cleaning', 'Pipe Repair'] ← For display/detail
 */

const workerSchema = new mongoose.Schema({
  // ==========================================
  // USER REFERENCE
  // ==========================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },

  firebaseUid: {
    type: String,
    required: true,
    unique: true
  },

  // ==========================================
  // ✅ UPDATED: SERVICE INFORMATION
  // ==========================================

  // ✅ NEW FIELD: Main service categories (enum-based for filtering)
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

  // ✅ UPDATED FIELD: Detailed specializations (flexible, no enum)
  // This field now accepts ANY string value like "Drain Cleaning", "Pipe Repair", etc.
  specializations: [{
    type: String,
    required: false  // Changed from true to false
    // NO ENUM - accepts any specialization string
  }],

  // ==========================================
  // PROFESSIONAL INFORMATION
  // ==========================================
  experience: {
    type: Number, // Years of experience
    required: true,
    min: 0
  },

  // ==========================================
  // PRICING
  // ==========================================
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },

  // ==========================================
  // AVAILABILITY
  // ==========================================
  availability: {
    type: Boolean,
    default: true
  },

  workingHours: {
    monday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    tuesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    wednesday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    thursday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    friday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    saturday: {
      start: String,
      end: String,
      available: { type: Boolean, default: true }
    },
    sunday: {
      start: String,
      end: String,
      available: { type: Boolean, default: false }
    }
  },

  // ==========================================
  // LOCATION & SERVICE AREA
  // ==========================================
  // ✅ Service areas where worker provides services
  // Changed from serviceLocations to serviceAreas, city to town
  serviceAreas: [{
    town: {
      type: String,
      required: false
    },
    district: {
      type: String,
      required: false
    }
  }],
  // ==========================================
  // PORTFOLIO
  // ==========================================
  portfolio: [{
    imageUrl: String, // URL or base64
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==========================================
  // PROFILE INFORMATION
  // ==========================================
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },

  skills: [{
    type: String
  }],

  certifications: [{
    name: String,
    issuedBy: String,
    issuedDate: Date,
    imageUrl: String
  }],

  // ==========================================
  // RATING & REVIEWS
  // ==========================================
  rating: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },

  // ==========================================
  // STATISTICS
  // ==========================================
  completedJobs: {
    type: Number,
    default: 0
  },

  totalEarnings: {
    type: Number,
    default: 0
  },

  responseTime: {
    type: Number, // Average in minutes
    default: 0
  },

  acceptanceRate: {
    type: Number, // Percentage
    default: 0
  },

  // ==========================================
  // VERIFICATION
  // ==========================================
  isVerified: {
    type: Boolean,
    default: false
  },

  verificationDocuments: [{
    url: String,
    docType: String,
    uploadedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],

  // ==========================================
  // PROFILE STATUS
  // ==========================================
  profileStatus: {
    type: String,
    enum: ['incomplete', 'pending-review', 'active', 'suspended'],
    default: 'incomplete'
  },

  // ==========================================
  // BANK DETAILS
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

// ==========================================
// INDEXES
// ==========================================
workerSchema.index({ userId: 1 });
workerSchema.index({ firebaseUid: 1 });
workerSchema.index({ serviceCategories: 1 }); // ✅ NEW: Index for filtering by category
workerSchema.index({ specializations: 1 });
workerSchema.index({ 'rating.average': -1 });
workerSchema.index({ availability: 1 });
workerSchema.index({ profileStatus: 1 });
workerSchema.index({ 'serviceAreas.town': 1 });
workerSchema.index({ 'serviceAreas.district': 1 });

// ==========================================
// METHODS
// ==========================================

/**
 * Update worker rating with new review
 */
workerSchema.methods.updateRating = async function (newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  await this.save();
};

/**
 * Increment completed jobs counter
 */
workerSchema.methods.incrementCompletedJobs = async function () {
  this.completedJobs += 1;
  await this.save();
};

// ==========================================
// MIDDLEWARE
// ==========================================

/**
 * Update timestamp before save
 */
workerSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

// ==========================================
// EXPORT
// ==========================================
module.exports = mongoose.model('Worker', workerSchema);