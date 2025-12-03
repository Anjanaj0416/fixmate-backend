const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Parties Involved
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // ✅ Removed: index: true (using explicit index below instead)
  },
  
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
    // ✅ Removed: index: true (using explicit index below instead)
  },
  
  // Service Details
  serviceType: {
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
    // ✅ Removed: index: true (using explicit index below instead)
  },
  
  // Problem Description
  problemDescription: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // ✅ FIXED: Simplified problemImages to accept array of strings (base64 or URLs)
  problemImages: [{
    type: String // Can be base64 or URL
  }],
  
  // Location Details - Where in the house/building is the issue
  issueLocation: {
    type: String,
    enum: ['Kitchen', 'Bathroom', 'Living room', 'Bedroom', 'Garage', 'Basement', 'Outdoor area', 'Rooftop', 'Other']
  },
  
  // ✅ UPDATED: Service Location - Customer's location (MANUAL SELECTION - No GPS required)
  // This is where the worker needs to go to provide the service
  serviceLocation: {
    address: {
      type: String,
      required: false // Full address (optional)
    },
    city: {
      type: String,
      required: false // Town/City name (e.g., "Negombo")
      // ✅ Removed: index: true (using explicit index below instead)
    },
    district: {
      type: String,
      required: false // District name (e.g., "Gampaha")
      // ✅ Removed: index: true (using explicit index below instead)
    },
    coordinates: {
      // ✅ OPTIONAL: GPS coordinates (for future use, not required now)
      latitude: {
        type: Number,
        required: false
      },
      longitude: {
        type: Number,
        required: false
      }
    }
  },
  
  // Contact Information
  contactPhone: {
    type: String,
    required: false
  },
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  
  preferredTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'flexible']
  },
  
  // Budget - ✅ UPDATED: max can be null for "50000+" budgets
  customerBudget: {
    min: {
      type: Number,
      required: false
    },
    max: {
      type: Number,
      required: false // ✅ Can be null for open-ended budgets like "50000+"
    }
  },
  
  quotedPrice: {
    type: Number,
    min: 0
  },
  
  finalPrice: {
    type: Number,
    min: 0
  },
  
  // Urgency - ✅ FIXED: Matching frontend values
  urgency: {
    type: String,
    enum: ['low', 'normal', 'high', 'emergency'],
    default: 'normal'
  },
  
  // Booking Status
  status: {
    type: String,
    enum: [
      'quote_requested',  // Customer created quote request
      'quotes_sent',      // Sent to workers
      'pending',          // Waiting for worker response
      'accepted',         // Worker accepted
      'declined',         // Worker declined
      'in-progress',      // Work in progress
      'completed',        // Work completed
      'cancelled',        // Booking cancelled
      'disputed'          // Dispute raised
    ],
    default: 'quote_requested' // ✅ Default is quote_requested for new quotes
    // ✅ Index added explicitly below
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['pending', 'unpaid', 'paid', 'refunded', 'disputed'],
    default: 'pending'
    // ✅ Index added explicitly below
  },
  
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'mobile-wallet']
  },
  
  paymentDetails: {
    transactionId: String,
    paidAt: Date,
    amount: Number
  },
  
  // ✅ Quote Request Tracking - Track which workers received this quote
  quoteRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  // ✅ NEW FEATURE: Track all workers this quote was sent to
  // This allows customers to send quotes to multiple workers
  sentToWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker', // ✅ References Worker model (not User)
    default: []
  }],
  
  // Quote Information - When a specific worker provides a quote
  quote: {
    amount: Number,
    details: String,
    createdAt: Date,
    validUntil: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined']
    }
  },
  
  // Work Progress
  workProgress: [{
    status: String,
    note: String,
    images: [String],
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Completion Details
  completedAt: Date,
  workCompletionNotes: String,
  completionImages: [String],
  
  // Cancellation
  cancellationReason: String,
  cancelledBy: {
    type: String,
    enum: ['customer', 'worker', 'admin']
  },
  cancelledAt: Date,
  
  // Special Instructions
  specialInstructions: String,
  
  // Worker Response
  workerResponse: {
    respondedAt: Date,
    responseTime: Number, // in minutes
    action: {
      type: String,
      enum: ['accepted', 'declined', 'quote-provided']
    },
    declineReason: String
  },
  
  // Rating & Review (after completion)
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  review: {
    type: String,
    maxlength: 500
  },
  
  reviewedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
    // ✅ Index added explicitly below
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// ============================================
// INDEXES FOR BETTER QUERY PERFORMANCE
// ✅ All indexes defined here in one place to avoid duplicates
// ============================================

// Customer and Worker lookups
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, createdAt: -1 });

// Status and scheduling
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ status: 1, createdAt: -1 });

// Service type
bookingSchema.index({ serviceType: 1 });

// Payment status
bookingSchema.index({ paymentStatus: 1 });

// ✅ NEW: Location-based indexes for finding bookings by area
bookingSchema.index({ 'serviceLocation.district': 1, 'serviceLocation.city': 1 });
bookingSchema.index({ 'serviceLocation.district': 1 });
bookingSchema.index({ 'serviceLocation.city': 1 });

// ✅ NEW: Index for tracking which workers received quotes
bookingSchema.index({ sentToWorkers: 1 });

// ✅ NEW: Compound index for service type + location searches
bookingSchema.index({ serviceType: 1, 'serviceLocation.district': 1 });

// Created date for sorting
bookingSchema.index({ createdAt: -1 });

// ============================================
// METHODS
// ============================================

/**
 * Update booking status
 * @param {String} newStatus - New status value
 * @param {String} userId - ID of user making the change
 * @param {String} role - Role of user (customer/worker/admin)
 */
bookingSchema.methods.updateStatus = async function(newStatus, userId, role) {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancelledBy = role;
  }
  
  await this.save();
  return this;
};

/**
 * Accept a quote from a worker
 */
bookingSchema.methods.acceptQuote = async function() {
  if (this.quote && this.quote.status === 'pending') {
    this.quote.status = 'accepted';
    this.quotedPrice = this.quote.amount;
    this.status = 'accepted';
    await this.save();
  }
  return this;
};

/**
 * ✅ NEW: Add worker to sentToWorkers list
 * @param {ObjectId} workerId - Worker ID to add
 */
bookingSchema.methods.addWorkerToSent = async function(workerId) {
  if (!this.sentToWorkers) {
    this.sentToWorkers = [];
  }
  
  // Check if already sent to this worker
  const alreadySent = this.sentToWorkers.some(
    id => id.toString() === workerId.toString()
  );
  
  if (!alreadySent) {
    this.sentToWorkers.push(workerId);
    await this.save();
  }
  
  return this;
};

/**
 * ✅ NEW: Check if quote was sent to specific worker
 * @param {ObjectId} workerId - Worker ID to check
 * @returns {Boolean}
 */
bookingSchema.methods.wasSentToWorker = function(workerId) {
  if (!this.sentToWorkers || this.sentToWorkers.length === 0) {
    return false;
  }
  
  return this.sentToWorkers.some(
    id => id.toString() === workerId.toString()
  );
};

/**
 * ✅ NEW: Get location string for display
 * @returns {String} Formatted location string
 */
bookingSchema.methods.getLocationString = function() {
  if (this.serviceLocation) {
    const parts = [];
    if (this.serviceLocation.city) parts.push(this.serviceLocation.city);
    if (this.serviceLocation.district) parts.push(this.serviceLocation.district);
    return parts.join(', ') || 'Location not specified';
  }
  return 'Location not specified';
};

/**
 * ✅ NEW: Check if booking is in quote request phase
 * @returns {Boolean}
 */
bookingSchema.methods.isQuoteRequest = function() {
  return ['quote_requested', 'quotes_sent'].includes(this.status);
};

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Calculate response time when worker responds
 */
bookingSchema.pre('save', function(next) {
  // Calculate worker response time
  if (this.workerResponse && this.workerResponse.respondedAt && !this.workerResponse.responseTime) {
    const diffInMs = this.workerResponse.respondedAt - this.createdAt;
    this.workerResponse.responseTime = Math.round(diffInMs / 60000); // Convert to minutes
  }
  
  // Update timestamp
  this.updatedAt = Date.now();
  
  next();
});

/**
 * ✅ NEW: Validate serviceLocation before saving
 */
bookingSchema.pre('save', function(next) {
  // If this is a quote request, ensure we have at least city or district
  if (this.isQuoteRequest() && this.serviceLocation) {
    if (!this.serviceLocation.city && !this.serviceLocation.district) {
      const error = new Error('Service location must have at least city or district specified');
      return next(error);
    }
  }
  next();
});

// ============================================
// STATIC METHODS
// ============================================

/**
 * ✅ NEW: Find bookings by location
 * @param {String} district - District name
 * @param {String} city - City/Town name (optional)
 * @returns {Promise<Array>} Array of bookings
 */
bookingSchema.statics.findByLocation = function(district, city = null) {
  const query = { 'serviceLocation.district': district };
  if (city) {
    query['serviceLocation.city'] = city;
  }
  return this.find(query).sort({ createdAt: -1 });
};

/**
 * ✅ NEW: Find quote requests sent to a specific worker
 * @param {ObjectId} workerId - Worker ID
 * @returns {Promise<Array>} Array of bookings
 */
bookingSchema.statics.findQuotesSentToWorker = function(workerId) {
  return this.find({
    sentToWorkers: workerId,
    status: { $in: ['quote_requested', 'quotes_sent', 'pending'] }
  })
    .populate('customerId', 'fullName phoneNumber email profileImage')
    .sort({ createdAt: -1 });
};

/**
 * ✅ NEW: Find customer's quote requests
 * @param {ObjectId} customerId - Customer ID
 * @returns {Promise<Array>} Array of bookings
 */
bookingSchema.statics.findCustomerQuotes = function(customerId) {
  return this.find({
    customerId: customerId,
    status: { $in: ['quote_requested', 'quotes_sent', 'pending', 'accepted', 'in-progress', 'completed', 'cancelled'] }
  })
    .populate('sentToWorkers')
    .populate({
      path: 'sentToWorkers',
      populate: {
        path: 'userId',
        select: 'fullName profileImage'
      }
    })
    .sort({ createdAt: -1 });
};

// ============================================
// VIRTUAL PROPERTIES
// ============================================

/**
 * ✅ NEW: Virtual property for number of workers quote was sent to
 */
bookingSchema.virtual('sentToWorkersCount').get(function() {
  return this.sentToWorkers ? this.sentToWorkers.length : 0;
});

/**
 * ✅ NEW: Virtual property to check if booking has location
 */
bookingSchema.virtual('hasLocation').get(function() {
  return !!(this.serviceLocation && 
    (this.serviceLocation.city || this.serviceLocation.district));
});

// Ensure virtuals are included when converting to JSON
bookingSchema.set('toJSON', { virtuals: true });
bookingSchema.set('toObject', { virtuals: true });

// ============================================
// EXPORT MODEL
// ============================================

module.exports = mongoose.model('Booking', bookingSchema);