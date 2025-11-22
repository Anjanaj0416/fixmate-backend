const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  // References
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true,
    unique: true // One review per booking - This creates an index automatically
    // NOTE: Removed index: true to avoid duplicate
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
  
  // Rating (1-5 stars)
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  
  // Detailed Ratings
  detailedRatings: {
    quality: {
      type: Number,
      min: 1,
      max: 5
    },
    punctuality: {
      type: Number,
      min: 1,
      max: 5
    },
    professionalism: {
      type: Number,
      min: 1,
      max: 5
    },
    communication: {
      type: Number,
      min: 1,
      max: 5
    },
    value: {
      type: Number,
      min: 1,
      max: 5
    }
  },
  
  // Written Review
  comment: {
    type: String,
    maxlength: 500,
    trim: true
  },
  
  // Review Images
  images: [{
    imageUrl: String,
    caption: String
  }],
  
  // Would recommend?
  wouldRecommend: {
    type: Boolean,
    default: true
  },
  
  // Service Type
  serviceType: {
    type: String,
    required: true
  },
  
  // Moderation
  moderationStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'flagged'],
    default: 'approved'
  },
  
  moderationReason: String,
  
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  moderatedAt: Date,
  
  // Flags
  isFlagged: {
    type: Boolean,
    default: false
  },
  
  flagReasons: [{
    reason: String,
    flaggedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    flaggedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Helpful votes
  helpfulVotes: {
    type: Number,
    default: 0
  },
  
  votedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Worker Response
  workerResponse: {
    message: String,
    respondedAt: Date
  },
  
  // Visibility
  isVisible: {
    type: Boolean,
    default: true
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
reviewSchema.index({ workerId: 1, rating: -1 });
reviewSchema.index({ customerId: 1 });
reviewSchema.index({ rating: -1, createdAt: -1 });
reviewSchema.index({ moderationStatus: 1 });

// Methods
reviewSchema.methods.markHelpful = async function(userId) {
  if (!this.votedBy.includes(userId)) {
    this.votedBy.push(userId);
    this.helpfulVotes += 1;
    await this.save();
  }
};

reviewSchema.methods.flag = async function(reason, flaggedBy) {
  this.isFlagged = true;
  this.flagReasons.push({
    reason,
    flaggedBy,
    flaggedAt: new Date()
  });
  this.moderationStatus = 'flagged';
  await this.save();
};

reviewSchema.methods.moderate = async function(status, moderatorId, reason = null) {
  this.moderationStatus = status;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  if (reason) this.moderationReason = reason;
  
  if (status === 'rejected') {
    this.isVisible = false;
  }
  
  await this.save();
};

// Update timestamp before save
reviewSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Update worker rating after review is saved
reviewSchema.post('save', async function(doc) {
  if (doc.moderationStatus === 'approved' && doc.isVisible) {
    const Worker = mongoose.model('Worker');
    const worker = await Worker.findOne({ userId: doc.workerId });
    
    if (worker) {
      await worker.updateRating(doc.rating);
    }
  }
});

module.exports = mongoose.model('Review', reviewSchema);