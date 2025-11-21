const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  // Parties Involved
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
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
  
  // AI Analysis (if image was uploaded)
  problemImages: [{
    imageUrl: String, // URL or base64
    aiAnalysis: {
      detectedProblem: String,
      confidence: Number,
      suggestedService: String,
      estimatedCost: {
        min: Number,
        max: Number
      },
      urgency: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical']
      }
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Location
  serviceLocation: {
    address: {
      type: String,
      required: true
    },
    city: String,
    district: String,
    coordinates: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true
      }
    },
    accessInstructions: String // e.g., "Gate code: 1234"
  },
  
  // Scheduling
  scheduledDate: {
    type: Date,
    required: true
  },
  
  preferredTimeSlot: {
    type: String,
    enum: ['morning', 'afternoon', 'evening', 'anytime'],
    default: 'anytime'
  },
  
  estimatedDuration: {
    type: Number, // in hours
    default: null
  },
  
  // Pricing
  customerBudget: {
    type: Number,
    min: 0
  },
  
  quotedPrice: {
    type: Number,
    default: null
  },
  
  finalPrice: {
    type: Number,
    default: null
  },
  
  // Booking Status
  status: {
    type: String,
    enum: [
      'pending',        // Customer created booking
      'quote-requested', // Customer requested quote
      'quoted',         // Worker provided quote
      'accepted',       // Worker accepted booking
      'in-progress',    // Work started
      'completed',      // Work completed
      'cancelled',      // Cancelled by either party
      'disputed'        // Under dispute
    ],
    default: 'pending',
    index: true
  },
  
  // Quote Details (if quote was requested)
  quote: {
    amount: Number,
    breakdown: [{
      item: String,
      cost: Number
    }],
    validUntil: Date,
    notes: String,
    createdAt: Date,
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'expired'],
      default: 'pending'
    }
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
  
  // Urgency
  urgency: {
    type: String,
    enum: ['low', 'medium', 'high', 'emergency'],
    default: 'medium'
  },
  
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

// Indexes
bookingSchema.index({ customerId: 1, createdAt: -1 });
bookingSchema.index({ workerId: 1, createdAt: -1 });
bookingSchema.index({ status: 1, scheduledDate: 1 });
bookingSchema.index({ 'serviceLocation.coordinates': '2dsphere' });
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