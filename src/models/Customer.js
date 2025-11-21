const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
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
        required: true
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

// Indexes
customerSchema.index({ userId: 1 });
customerSchema.index({ firebaseUid: 1 });
customerSchema.index({ 'savedAddresses.coordinates': '2dsphere' });

// Methods
customerSchema.methods.addFavoriteWorker = async function(workerId) {
  const exists = this.favoriteWorkers.some(
    fav => fav.workerId.toString() === workerId.toString()
  );
  
  if (!exists) {
    this.favoriteWorkers.push({ workerId, addedAt: new Date() });
    await this.save();
  }
};

customerSchema.methods.removeFavoriteWorker = async function(workerId) {
  this.favoriteWorkers = this.favoriteWorkers.filter(
    fav => fav.workerId.toString() !== workerId.toString()
  );
  await this.save();
};

customerSchema.methods.incrementBookings = async function(completed = false, cancelled = false) {
  this.totalBookings += 1;
  if (completed) this.completedBookings += 1;
  if (cancelled) this.cancelledBookings += 1;
  await this.save();
};

// Update timestamp before save
customerSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Customer', customerSchema);