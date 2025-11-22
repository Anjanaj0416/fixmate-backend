const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Recipient
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Notification Type
  type: {
    type: String,
    enum: [
      'booking-received',      // Worker receives new booking
      'booking-accepted',      // Customer: worker accepted booking
      'booking-declined',      // Customer: worker declined booking
      'booking-cancelled',     // Booking cancelled
      'booking-completed',     // Booking completed
      'quote-received',        // Customer receives quote
      'quote-accepted',        // Worker: customer accepted quote
      'quote-declined',        // Worker: customer declined quote
      'new-message',           // New chat message
      'review-received',       // Worker receives review
      'payment-received',      // Worker: payment received
      'payment-reminder',      // Customer: payment reminder
      'profile-verified',      // Worker: profile verified
      'profile-rejected',      // Worker: profile rejected
      'booking-reminder',      // Reminder for upcoming booking
      'worker-nearby',         // Customer: worker nearby
      'promotion',             // Promotional notification
      'system-update',         // System updates
      'account-suspended',     // Account suspended
      'account-reactivated'    // Account reactivated
    ],
    required: true,
    index: true
  },
  
  // Notification Content
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  
  message: {
    type: String,
    required: true,
    maxlength: 500
  },
  
  // Related References
  relatedBooking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  
  relatedUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  relatedReview: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Review',
    default: null
  },
  
  // Action Data (for deep linking)
  actionData: {
    screen: String, // Screen to navigate to
    params: mongoose.Schema.Types.Mixed // Parameters for navigation
  },
  
  // Rich Content
  imageUrl: {
    type: String,
    default: null
  },
  
  icon: {
    type: String,
    default: null
  },
  
  // Notification Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // Delivery Status
  deliveryStatus: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'failed'],
    default: 'pending'
  },
  
  sentAt: Date,
  
  deliveredAt: Date,
  
  failureReason: String,
  
  // FCM Details
  fcmMessageId: String,
  
  // Priority
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  
  // Expiry
  expiresAt: {
    type: Date,
    default: null
  },
  
  // Grouping (for notification grouping in UI)
  groupKey: {
    type: String,
    default: null
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
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });
notificationSchema.index({ relatedBooking: 1 });
// NOTE: TTL index below creates an index on expiresAt, no need for separate index

// Methods
notificationSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

notificationSchema.methods.markAsSent = async function(fcmMessageId = null) {
  this.deliveryStatus = 'sent';
  this.sentAt = new Date();
  if (fcmMessageId) this.fcmMessageId = fcmMessageId;
  await this.save();
};

notificationSchema.methods.markAsDelivered = async function() {
  this.deliveryStatus = 'delivered';
  this.deliveredAt = new Date();
  await this.save();
};

notificationSchema.methods.markAsFailed = async function(reason) {
  this.deliveryStatus = 'failed';
  this.failureReason = reason;
  await this.save();
};

// Static methods
notificationSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    userId,
    isRead: false,
    $or: [
      { expiresAt: { $exists: false } },
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  });
};

notificationSchema.statics.markAllAsRead = async function(userId) {
  await this.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );
};

notificationSchema.statics.deleteExpired = async function() {
  await this.deleteMany({
    expiresAt: { $lt: new Date() }
  });
};

// Update timestamp before save
notificationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// TTL Index - Auto-delete notifications after expiry
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Notification', notificationSchema);