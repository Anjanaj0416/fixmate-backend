const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  // Booking Reference
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
    // NOTE: Removed index: true - it's included in compound indexes below
  },
  
  // Parties
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // NOTE: Removed index: true - it's included in compound index below
  },
  
  workerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
    // NOTE: Removed index: true - it's included in compound index below
  },
  
  // Payment Amount
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  
  currency: {
    type: String,
    default: 'LKR'
  },
  
  // Platform Fee
  platformFee: {
    amount: Number,
    percentage: Number
  },
  
  workerEarnings: {
    type: Number,
    required: true
  },
  
  // Payment Method
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'bank-transfer', 'mobile-wallet', 'online'],
    required: true
  },
  
  paymentProvider: {
    type: String, // e.g., 'stripe', 'payhere', 'manual'
    default: 'manual'
  },
  
  // Payment Status
  status: {
    type: String,
    enum: [
      'pending',
      'processing',
      'completed',
      'failed',
      'cancelled',
      'refunded',
      'partially-refunded'
    ],
    default: 'pending'
  },
  
  // Transaction Details
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  
  externalTransactionId: {
    type: String, // From payment gateway
    sparse: true
  },
  
  // Payment Gateway Response
  gatewayResponse: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },
  
  // Timestamps
  initiatedAt: {
    type: Date,
    default: Date.now
  },
  
  completedAt: Date,
  
  failedAt: Date,
  
  // Refund Details
  refund: {
    amount: Number,
    reason: String,
    refundedAt: Date,
    refundTransactionId: String,
    initiatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Payment Breakdown
  breakdown: {
    subtotal: Number,
    tax: Number,
    discount: Number,
    tips: Number,
    total: Number
  },
  
  // Customer Payment Details
  customerPaymentDetails: {
    cardLastFour: String,
    cardBrand: String,
    bankName: String,
    accountLastFour: String
  },
  
  // Worker Payout Details
  workerPayoutDetails: {
    accountName: String,
    accountNumber: String,
    bankName: String,
    payoutStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    payoutDate: Date,
    payoutTransactionId: String
  },
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  verifiedAt: Date,
  
  // Dispute
  dispute: {
    isDisputed: {
      type: Boolean,
      default: false
    },
    reason: String,
    disputedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    disputedAt: Date,
    status: {
      type: String,
      enum: ['open', 'investigating', 'resolved', 'closed']
    },
    resolution: String,
    resolvedAt: Date
  },
  
  // Receipt
  receiptUrl: String,
  
  receiptNumber: String,
  
  // Notes
  customerNotes: String,
  
  workerNotes: String,
  
  adminNotes: String,
  
  // Metadata
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  // Timestamps
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

// Indexes
// NOTE: These compound indexes also index the first field (customerId, workerId)
paymentSchema.index({ customerId: 1, status: 1, createdAt: -1 });
paymentSchema.index({ workerId: 1, status: 1, createdAt: -1 });
// NOTE: transactionId already has unique: true which creates an index
paymentSchema.index({ 'workerPayoutDetails.payoutStatus': 1 });

// Generate unique transaction ID
paymentSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    this.transactionId = `TXN${timestamp}${random}`;
  }
  
  if (!this.receiptNumber && this.status === 'completed') {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    this.receiptNumber = `RCP${date}${this._id.toString().slice(-6)}`;
  }
  
  this.updatedAt = Date.now();
  next();
});

// Methods
paymentSchema.methods.markAsCompleted = async function() {
  this.status = 'completed';
  this.completedAt = new Date();
  await this.save();
  
  // Update booking payment status
  const Booking = mongoose.model('Booking');
  await Booking.findByIdAndUpdate(this.bookingId, {
    paymentStatus: 'paid',
    'paymentDetails.paidAt': this.completedAt,
    'paymentDetails.transactionId': this.transactionId
  });
};

paymentSchema.methods.markAsFailed = async function(reason) {
  this.status = 'failed';
  this.failedAt = new Date();
  this.adminNotes = reason;
  await this.save();
};

paymentSchema.methods.processRefund = async function(amount, reason, userId) {
  this.refund = {
    amount,
    reason,
    refundedAt: new Date(),
    initiatedBy: userId
  };
  
  if (amount >= this.amount) {
    this.status = 'refunded';
  } else {
    this.status = 'partially-refunded';
  }
  
  await this.save();
};

paymentSchema.methods.initiateDispute = async function(reason, userId) {
  this.dispute = {
    isDisputed: true,
    reason,
    disputedBy: userId,
    disputedAt: new Date(),
    status: 'open'
  };
  this.status = 'disputed';
  await this.save();
};

paymentSchema.methods.resolveDispute = async function(resolution) {
  this.dispute.status = 'resolved';
  this.dispute.resolution = resolution;
  this.dispute.resolvedAt = new Date();
  await this.save();
};

// Static methods
paymentSchema.statics.getTotalEarnings = async function(workerId, startDate, endDate) {
  // FIX: Use 'new' keyword with mongoose.Types.ObjectId for newer Mongoose versions
  const result = await this.aggregate([
    {
      $match: {
        workerId: new mongoose.Types.ObjectId(workerId),
        status: 'completed',
        completedAt: {
          $gte: startDate,
          $lte: endDate
        }
      }
    },
    {
      $group: {
        _id: null,
        totalEarnings: { $sum: '$workerEarnings' },
        totalTransactions: { $sum: 1 }
      }
    }
  ]);
  
  return result[0] || { totalEarnings: 0, totalTransactions: 0 };
};

paymentSchema.statics.getPendingPayouts = async function() {
  return await this.find({
    status: 'completed',
    'workerPayoutDetails.payoutStatus': 'pending'
  }).populate('workerId').sort({ completedAt: 1 });
};

module.exports = mongoose.model('Payment', paymentSchema);