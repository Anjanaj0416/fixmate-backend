const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  // Conversation Identifier
  conversationId: {
    type: String,
    required: true,
    index: true
    // Format: "customerId_workerId" or "smaller_id_larger_id"
  },
  
  // Participants
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Booking Reference (if message is related to a booking)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null,
    index: true
  },
  
  // Message Content
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'location', 'quote', 'booking-update'],
    default: 'text'
  },
  
  message: {
    type: String,
    required: function() {
      return this.messageType === 'text';
    },
    maxlength: 1000
  },
  
  // Media Content
  mediaUrl: {
    type: String, // For images or files
    default: null
  },
  
  mediaType: {
    type: String, // 'image/jpeg', 'application/pdf', etc.
    default: null
  },
  
  mediaThumbnail: {
    type: String, // Thumbnail for images/videos
    default: null
  },
  
  // Location Sharing
  location: {
    coordinates: {
      type: {
        type: String,
        enum: ['Point']
      },
      coordinates: [Number] // [longitude, latitude]
    },
    address: String
  },
  
  // Quote Reference (if message contains a quote)
  quoteReference: {
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Quote'
    },
    amount: Number,
    description: String
  },
  
  // Booking Update Reference
  bookingUpdateReference: {
    status: String,
    message: String
  },
  
  // Message Status
  isRead: {
    type: Boolean,
    default: false,
    index: true
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  isDelivered: {
    type: Boolean,
    default: false
  },
  
  deliveredAt: {
    type: Date,
    default: null
  },
  
  // Message Metadata
  isEdited: {
    type: Boolean,
    default: false
  },
  
  editedAt: Date,
  
  isDeleted: {
    type: Boolean,
    default: false
  },
  
  deletedAt: Date,
  
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  // Reply To (for threaded messages)
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  // Reactions
  reactions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    emoji: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Timestamp
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
messageSchema.index({ conversationId: 1, timestamp: -1 });
messageSchema.index({ senderId: 1, timestamp: -1 });
messageSchema.index({ receiverId: 1, isRead: 1 });
messageSchema.index({ bookingId: 1 });

// Statics - Generate conversation ID
messageSchema.statics.generateConversationId = function(userId1, userId2) {
  const id1 = userId1.toString();
  const id2 = userId2.toString();
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
};

// Methods
messageSchema.methods.markAsRead = async function() {
  if (!this.isRead) {
    this.isRead = true;
    this.readAt = new Date();
    await this.save();
  }
};

messageSchema.methods.markAsDelivered = async function() {
  if (!this.isDelivered) {
    this.isDelivered = true;
    this.deliveredAt = new Date();
    await this.save();
  }
};

messageSchema.methods.softDelete = async function(userId) {
  this.isDeleted = true;
  this.deletedAt = new Date();
  this.deletedBy = userId;
  await this.save();
};

messageSchema.methods.addReaction = async function(userId, emoji) {
  // Remove existing reaction from this user
  this.reactions = this.reactions.filter(
    r => r.userId.toString() !== userId.toString()
  );
  
  // Add new reaction
  this.reactions.push({
    userId,
    emoji,
    timestamp: new Date()
  });
  
  await this.save();
};

// Update delivered status for all undelivered messages
messageSchema.statics.markConversationAsDelivered = async function(conversationId, userId) {
  await this.updateMany(
    {
      conversationId,
      receiverId: userId,
      isDelivered: false
    },
    {
      isDelivered: true,
      deliveredAt: new Date()
    }
  );
};

// Get unread count for a user
messageSchema.statics.getUnreadCount = async function(userId) {
  return await this.countDocuments({
    receiverId: userId,
    isRead: false,
    isDeleted: false
  });
};

module.exports = mongoose.model('Message', messageSchema);