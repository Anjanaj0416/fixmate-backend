const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Firebase Authentication
  firebaseUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Basic Information
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  
  phoneNumber: {
    type: String,
    required: true,
    trim: true
  },
  
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Profile
  profileImage: {
    type: String, // URL or base64
    default: null
  },
  
  // User Role
  role: {
    type: String,
    enum: ['customer', 'worker', 'admin'],
    required: true,
    default: 'customer'
  },
  
  // Account Status
  accountStatus: {
    type: String,
    enum: ['active', 'suspended', 'deleted'],
    default: 'active'
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  
  // Location
  location: {
    address: String,
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
        default: [0, 0]
      }
    }
  },
  
  // Notifications
  fcmToken: {
    type: String,
    default: null
  },
  
  notificationSettings: {
    pushEnabled: { type: Boolean, default: true },
    emailEnabled: { type: Boolean, default: true },
    smsEnabled: { type: Boolean, default: false }
  },
  
  // Activity
  lastLogin: {
    type: Date,
    default: null
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
// NOTE: email and firebaseUid already have unique: true which creates indexes
userSchema.index({ 'location.coordinates': '2dsphere' });
userSchema.index({ role: 1 });
userSchema.index({ accountStatus: 1 });

// Methods
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.__v;
  return user;
};

// Update timestamp before save
userSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('User', userSchema);