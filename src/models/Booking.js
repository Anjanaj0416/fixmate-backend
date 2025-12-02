const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Parties Involved
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  
  // Location Details
  issueLocation: {
    type: String,
    enum: ['Kitchen', 'Bathroom', 'Living room', 'Bedroom', 'Garage', 'Basement', 'Outdoor area', 'Other']
  },
  
  // Service Location
  serviceLocation: {
    address: String,
    city: String,
    district: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  
  // Contact Information
  contactPhone: String,
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  
  preferredTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'flexible']
  },
  
  // Budget
  customerBudget: {
    min: Number,
    max: Number
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
    default: 'pending',
    index: true
  },
  
  // Payment
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'paid', 'refunded', 'disputed'],
    default: 'unpaid',
    index: true
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
  
  // Quote Request Tracking
  quoteRequestId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  },
  
  sentToWorkers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Worker'
  }],
  
  // Quote Information
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
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes for better query performance
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ serviceType: 1 });

// Methods
bookingSchema.methods.updateStatus = async function(newStatus, userId, role) {
  this.status = newStatus;
  
  if (newStatus === 'completed') {
    this.completedAt = new Date();
  } else if (newStatus === 'cancelled') {
    this.cancelledAt = new Date();
    this.cancelledBy = role;
  }
  
  await this.save();
};

bookingSchema.methods.acceptQuote = async function() {
  if (this.quote && this.quote.status === 'pending') {
    this.quote.status = 'accepted';
    this.quotedPrice = this.quote.amount;
    this.status = 'accepted';
    await this.save();
  }
};

// Calculate response time when worker responds
bookingSchema.pre('save', function(next) {
  if (this.workerResponse && this.workerResponse.respondedAt && !this.workerResponse.responseTime) {
    const diffInMs = this.workerResponse.respondedAt - this.createdAt;
    this.workerResponse.responseTime = Math.round(diffInMs / 60000); // Convert to minutes
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);