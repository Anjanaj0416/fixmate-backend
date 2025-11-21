const mongoose = require('mongoose');

const problemImageSchema = new mongoose.Schema({
  // User Reference
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Booking Reference (if image is part of a booking)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true
  },
  
  // Image Data
  imageUrl: {
    type: String,
    required: true
  },
  
  imageBase64: {
    type: String, // Store base64 if needed for AI processing
    default: null
  },
  
  contentType: {
    type: String,
    default: 'image/jpeg'
  },
  
  fileSize: {
    type: Number, // in bytes
    default: null
  },
  
  dimensions: {
    width: Number,
    height: Number
  },
  
  // AI Analysis Results
  aiAnalysis: {
    // Processing Status
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
      index: true
    },
    
    processedAt: Date,
    
    processingTime: Number, // in milliseconds
    
    // Detected Problem
    detectedProblem: {
      type: String,
      default: null
    },
    
    problemCategory: {
      type: String,
      default: null
    },
    
    // Confidence Score
    confidence: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    // Suggested Service
    suggestedService: {
      type: String,
      default: null
    },
    
    // Alternative Services
    alternativeServices: [{
      service: String,
      confidence: Number
    }],
    
    // Estimated Cost
    estimatedCost: {
      min: Number,
      max: Number,
      currency: {
        type: String,
        default: 'LKR'
      }
    },
    
    // Urgency Level
    urgency: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    },
    
    // Problem Severity
    severity: {
      type: String,
      enum: ['minor', 'moderate', 'severe', 'critical'],
      default: 'moderate'
    },
    
    // Detected Objects/Features
    detectedObjects: [{
      object: String,
      confidence: Number,
      boundingBox: {
        x: Number,
        y: Number,
        width: Number,
        height: Number
      }
    }],
    
    // Technical Details
    technicalDetails: {
      type: String,
      maxlength: 1000
    },
    
    // Recommendations
    recommendations: [{
      type: String
    }],
    
    // Required Materials
    requiredMaterials: [{
      material: String,
      quantity: String,
      estimatedCost: Number
    }],
    
    // Safety Warnings
    safetyWarnings: [{
      type: String
    }],
    
    // Error (if AI analysis failed)
    error: {
      message: String,
      code: String,
      timestamp: Date
    }
  },
  
  // Manual Tags/Labels (added by user or admin)
  tags: [{
    type: String
  }],
  
  userDescription: {
    type: String,
    maxlength: 500
  },
  
  // Feedback on AI Analysis
  aiFeedback: {
    isAccurate: {
      type: Boolean,
      default: null
    },
    feedbackText: String,
    correctedCategory: String,
    submittedAt: Date
  },
  
  // Usage
  isUsedInBooking: {
    type: Boolean,
    default: false
  },
  
  usageCount: {
    type: Number,
    default: 0
  },
  
  // Privacy & Storage
  isPublic: {
    type: Boolean,
    default: false
  },
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  expiresAt: {
    type: Date,
    default: null // Auto-delete after certain period
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
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
problemImageSchema.index({ customerId: 1, uploadedAt: -1 });
problemImageSchema.index({ bookingId: 1 });
problemImageSchema.index({ 'aiAnalysis.status': 1 });
problemImageSchema.index({ 'aiAnalysis.suggestedService': 1 });
problemImageSchema.index({ expiresAt: 1 });

// Methods
problemImageSchema.methods.updateAIAnalysis = async function(analysisResult) {
  this.aiAnalysis = {
    ...this.aiAnalysis,
    ...analysisResult,
    status: 'completed',
    processedAt: new Date()
  };
  await this.save();
};

problemImageSchema.methods.markAsFailed = async function(errorMessage, errorCode) {
  this.aiAnalysis.status = 'failed';
  this.aiAnalysis.error = {
    message: errorMessage,
    code: errorCode,
    timestamp: new Date()
  };
  await this.save();
};

problemImageSchema.methods.submitFeedback = async function(isAccurate, feedbackText = null, correctedCategory = null) {
  this.aiFeedback = {
    isAccurate,
    feedbackText,
    correctedCategory,
    submittedAt: new Date()
  };
  await this.save();
};

problemImageSchema.methods.softDelete = async function() {
  this.isDeleted = true;
  this.deletedAt = new Date();
  await this.save();
};

// Static methods
problemImageSchema.statics.getPendingAnalysis = async function(limit = 10) {
  return await this.find({
    'aiAnalysis.status': { $in: ['pending', 'processing'] }
  })
    .sort({ uploadedAt: 1 })
    .limit(limit);
};

problemImageSchema.statics.getFailedAnalysis = async function() {
  return await this.find({
    'aiAnalysis.status': 'failed'
  })
    .sort({ uploadedAt: -1 });
};

// Update timestamp before save
problemImageSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// TTL Index - Auto-delete expired images
problemImageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('ProblemImage', problemImageSchema);