const mongoose = require('mongoose');

const quoteSchema = new mongoose.Schema({
  // References
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    index: true
  },
  
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
  
  // Quote Details
  serviceType: {
    type: String,
    required: true
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Itemized Breakdown
  breakdown: [{
    item: {
      type: String,
      required: true
    },
    description: String,
    quantity: {
      type: Number,
      default: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    totalPrice: {
      type: Number,
      required: true
    }
  }],
  
  // Additional Charges
  additionalCharges: [{
    name: String, // e.g., "Transportation", "Materials"
    amount: Number
  }],
  
  // Discounts
  discount: {
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'fixed'
    },
    value: Number,
    reason: String
  },
  
  // Notes & Terms
  notes: {
    type: String,
    maxlength: 1000
  },
  
  termsAndConditions: {
    type: String,
    maxlength: 1000
  },
  
  // Validity
  validUntil: {
    type: Date,
    required: true,
    index: true
  },
  
  // Estimated Timeline
  estimatedStartDate: Date,
  
  estimatedCompletionDate: Date,
  
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['hours', 'days', 'weeks']
    }
  },
  
  // Status
  status: {
    type: String,
    enum: ['pending', 'sent', 'viewed', 'accepted', 'declined', 'expired', 'withdrawn'],
    default: 'pending',
    index: true
  },
  
  // Customer Actions
  viewedAt: Date,
  
  customerResponse: {
    action: {
      type: String,
      enum: ['accepted', 'declined', 'negotiating']
    },
    message: String,
    respondedAt: Date
  },
  
  // Negotiation History
  negotiationHistory: [{
    type: {
      type: String,
      enum: ['customer-counter', 'worker-revision']
    },
    amount: Number,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Acceptance Details
  acceptedAt: Date,
  
  acceptanceNotes: String,
  
  // Decline Details
  declinedAt: Date,
  
  declineReason: String,
  
  // Attachments
  attachments: [{
    filename: String,
    url: String,
    fileType: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Version (for quote revisions)
  version: {
    type: Number,
    default: 1
  },
  
  previousVersionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Quote'
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
  },
  
  sentAt: Date
}, {
  timestamps: true
});

// Indexes
quoteSchema.index({ workerId: 1, status: 1, createdAt: -1 });
quoteSchema.index({ customerId: 1, status: 1, createdAt: -1 });
quoteSchema.index({ bookingId: 1 });

// Virtual for checking if expired
quoteSchema.virtual('isExpired').get(function() {
  return this.validUntil < new Date();
});

// Methods
quoteSchema.methods.markAsSent = async function() {
  this.status = 'sent';
  this.sentAt = new Date();
  await this.save();
};

quoteSchema.methods.markAsViewed = async function() {
  if (this.status === 'sent') {
    this.status = 'viewed';
    this.viewedAt = new Date();
    await this.save();
  }
};

quoteSchema.methods.accept = async function(notes = null) {
  this.status = 'accepted';
  this.acceptedAt = new Date();
  if (notes) this.acceptanceNotes = notes;
  
  this.customerResponse = {
    action: 'accepted',
    respondedAt: new Date()
  };
  
  await this.save();
  
  // Update booking with quote
  const Booking = mongoose.model('Booking');
  await Booking.findByIdAndUpdate(this.bookingId, {
    'quote.status': 'accepted',
    quotedPrice: this.totalAmount,
    status: 'accepted'
  });
};

quoteSchema.methods.decline = async function(reason) {
  this.status = 'declined';
  this.declinedAt = new Date();
  this.declineReason = reason;
  
  this.customerResponse = {
    action: 'declined',
    message: reason,
    respondedAt: new Date()
  };
  
  await this.save();
  
  // Update booking
  const Booking = mongoose.model('Booking');
  await Booking.findByIdAndUpdate(this.bookingId, {
    'quote.status': 'declined'
  });
};

quoteSchema.methods.createRevision = async function(updates) {
  const Quote = mongoose.model('Quote');
  
  const revision = new Quote({
    ...this.toObject(),
    _id: mongoose.Types.ObjectId(),
    ...updates,
    version: this.version + 1,
    previousVersionId: this._id,
    status: 'pending',
    createdAt: new Date(),
    sentAt: null,
    viewedAt: null,
    acceptedAt: null,
    declinedAt: null
  });
  
  await revision.save();
  return revision;
};

// Check and update expired quotes
quoteSchema.statics.updateExpiredQuotes = async function() {
  await this.updateMany(
    {
      status: { $in: ['pending', 'sent', 'viewed'] },
      validUntil: { $lt: new Date() }
    },
    {
      status: 'expired'
    }
  );
};

// Update timestamp before save
quoteSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Quote', quoteSchema);