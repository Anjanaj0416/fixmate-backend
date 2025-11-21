const mongoose = require('mongoose');

const workerSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Professional Information
  specializations: [{
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
  
  experience: {
    type: Number, // Years of experience
    required: true,
    min: 0
  },
  
  // Pricing
  hourlyRate: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Availability
  availability: {
    type: Boolean,
    default: true
  },
  
  workingHours: {
    monday: { start: String, end: String, available: { type: Boolean, default: true } },
    tuesday: { start: String, end: String, available: { type: Boolean, default: true } },
    wednesday: { start: String, end: String, available: { type: Boolean, default: true } },
    thursday: { start: String, end: String, available: { type: Boolean, default: true } },
    friday: { start: String, end: String, available: { type: Boolean, default: true } },
    saturday: { start: String, end: String, available: { type: Boolean, default: true } },
    sunday: { start: String, end: String, available: { type: Boolean, default: false } }
  },
  
  // Location & Service Area
  serviceLocations: [{
    city: String,
    district: String
  }],
  
  // Portfolio
  portfolio: [{
    imageUrl: String, // URL or base64
    caption: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Bio & Description
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
  
  // Rating & Reviews
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
  
  // Statistics
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
  
  // Verification
  isVerified: {
    type: Boolean,
    default: false
  },
  
  verificationDocuments: [{
    type: String,
    docType: String,
    uploadedAt: Date,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  }],
  
  // Profile Status
  profileStatus: {
    type: String,
    enum: ['incomplete', 'pending-review', 'active', 'suspended'],
    default: 'incomplete'
  },
  
  // Bank Details (for payments)
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
workerSchema.index({ userId: 1 });
workerSchema.index({ firebaseUid: 1 });
workerSchema.index({ specializations: 1 });
workerSchema.index({ 'rating.average': -1 });
workerSchema.index({ availability: 1 });
workerSchema.index({ profileStatus: 1 });

// Methods
workerSchema.methods.updateRating = async function(newRating) {
  const totalRating = (this.rating.average * this.rating.count) + newRating;
  this.rating.count += 1;
  this.rating.average = totalRating / this.rating.count;
  await this.save();
};

workerSchema.methods.incrementCompletedJobs = async function() {
  this.completedJobs += 1;
  await this.save();
};

// Update timestamp before save
workerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Worker', workerSchema);