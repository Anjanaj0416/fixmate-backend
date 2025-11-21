const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  // Category Details
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  description: {
    type: String,
    maxlength: 500
  },
  
  // Visual
  icon: {
    type: String, // Icon name or URL
    required: true
  },
  
  imageUrl: {
    type: String,
    default: null
  },
  
  color: {
    type: String, // Hex color code
    default: '#FF6B35'
  },
  
  // Parent Category (for subcategories)
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  
  // Subcategories
  subcategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  
  // Category Type
  type: {
    type: String,
    enum: ['parent', 'subcategory', 'standalone'],
    default: 'standalone'
  },
  
  // Common Problems (for AI matching)
  commonProblems: [{
    keyword: String,
    description: String
  }],
  
  // Pricing Range (for customer reference)
  priceRange: {
    min: Number,
    max: Number,
    unit: {
      type: String,
      enum: ['per-hour', 'per-job', 'per-sqft'],
      default: 'per-job'
    }
  },
  
  // Average Service Duration
  averageDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  
  // Popular Keywords for Search
  keywords: [{
    type: String
  }],
  
  // Questions for Service Assessment
  assessmentQuestions: [{
    question: String,
    type: {
      type: String,
      enum: ['text', 'multiple-choice', 'yes-no', 'number'],
      default: 'text'
    },
    options: [String], // For multiple-choice questions
    isRequired: {
      type: Boolean,
      default: false
    }
  }],
  
  // Statistics
  stats: {
    totalWorkers: {
      type: Number,
      default: 0
    },
    totalBookings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    popularityScore: {
      type: Number,
      default: 0
    }
  },
  
  // Status
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  // Display Order
  displayOrder: {
    type: Number,
    default: 0
  },
  
  // SEO
  seoTitle: String,
  seoDescription: String,
  seoKeywords: [String],
  
  // Admin Notes
  adminNotes: String,
  
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
categorySchema.index({ slug: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ 'stats.popularityScore': -1 });

// Virtual for full path (including parent)
categorySchema.virtual('fullPath').get(function() {
  if (this.parentCategory) {
    return `${this.parentCategory.name} > ${this.name}`;
  }
  return this.name;
});

// Methods
categorySchema.methods.incrementStats = async function(field) {
  if (this.stats[field] !== undefined) {
    this.stats[field] += 1;
    await this.save();
  }
};

categorySchema.methods.updatePopularity = async function() {
  // Calculate popularity based on bookings and workers
  const popularity = (this.stats.totalBookings * 0.7) + (this.stats.totalWorkers * 0.3);
  this.stats.popularityScore = Math.round(popularity);
  await this.save();
};

// Static methods
categorySchema.statics.getActiveCategories = async function() {
  return await this.find({ isActive: true })
    .sort({ displayOrder: 1, name: 1 })
    .populate('subcategories');
};

categorySchema.statics.getFeaturedCategories = async function() {
  return await this.find({ isActive: true, isFeatured: true })
    .sort({ displayOrder: 1 })
    .limit(6);
};

categorySchema.statics.getPopularCategories = async function(limit = 10) {
  return await this.find({ isActive: true })
    .sort({ 'stats.popularityScore': -1 })
    .limit(limit);
};

// Pre-save middleware to generate slug
categorySchema.pre('save', function(next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Category', categorySchema);