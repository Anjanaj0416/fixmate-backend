const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  // Reference to User
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
    // ✅ REMOVED: index: true (unique already creates index)
  },
  
  firebaseUid: {
    type: String,
    required: true,
    unique: true
    // ✅ REMOVED: index: true (unique already creates index)
  },
  
  // Customer Preferences
  preferredServiceCategories: [{
    type: String
  }],
  
  // Saved/Favorite Workers
  favoriteWorkers: [{
    workerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Worker'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Booking History Stats
  totalBookings: {
    type: Number,
    default: 0
  },
  
  completedBookings: {
    type: Number,
    default: 0
  },
  
  cancelledBookings: {
    type: Number,
    default: 0
  },
  
  totalSpent: {
    type: Number,
    default: 0
  },
  
  // Saved Addresses
  savedAddresses: [{
    label: {
      type: String, // 'home', 'work', 'other'
      required: true
    },
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
        required: false,
        default: undefined
      }
    },
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // Payment Methods
  savedPaymentMethods: [{
    type: {
      type: String,
      enum: ['card', 'bank', 'mobile-wallet']
    },
    lastFourDigits: String,
    isDefault: {
      type: Boolean,
      default: false
    }
  }],
  
  // AI Preferences
  aiPreferences: {
    autoMatchEnabled: {
      type: Boolean,
      default: true
    },
    maxBudget: Number,
    preferredDistance: Number, // in km
    preferredExperience: {
      type: String,
      enum: ['any', 'beginner', 'intermediate', 'expert'],
      default: 'any'
    }
  },
  
  // Customer Reliability Score
  reliabilityScore: {
    type: Number,
    default: 100,
    min: 0,
    max: 100
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

// ✅ FIXED: Indexes
// NOTE: userId and firebaseUid already have unique: true which creates indexes
// Only add compound indexes here if needed
customerSchema.index({ totalBookings: -1 });
customerSchema.index({ completedBookings: -1 });

// Methods
customerSchema.methods.updateBookingStats = async function() {
  const Booking = require('./Booking');
  
  const stats = await Booking.aggregate([
    { $match: { customerId: this.userId } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  let totalBookings = 0;
  let completedBookings = 0;
  let cancelledBookings = 0;

  stats.forEach(stat => {
    totalBookings += stat.count;
    if (stat._id === 'completed') completedBookings = stat.count;
    if (stat._id === 'cancelled') cancelledBookings = stat.count;
  });

  this.totalBookings = totalBookings;
  this.completedBookings = completedBookings;
  this.cancelledBookings = cancelledBookings;

  await this.save();
};

// Update timestamp before save
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);