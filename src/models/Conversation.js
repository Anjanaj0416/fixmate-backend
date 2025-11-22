const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
  // Participants
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }],
  
  // Conversation ID (format: "userId1_userId2")
  conversationId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  // Related Booking (if conversation is about a specific booking)
  bookingId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    default: null
  },
  
  // Last Message
  lastMessage: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  
  lastMessageText: {
    type: String,
    default: null
  },
  
  lastMessageAt: {
    type: Date,
    default: Date.now
  },
  
  // Unread Count for each participant
  unreadCount: {
    type: Map,
    of: Number,
    default: {}
  },
  
  // Conversation Status
  isActive: {
    type: Boolean,
    default: true
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  
  // Muted Status
  mutedBy: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    mutedUntil: Date
  }],
  
  // Typing Indicators
  typingUsers: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastTypingAt: Date
  }],
  
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
conversationSchema.index({ participants: 1 });
conversationSchema.index({ lastMessageAt: -1 });
conversationSchema.index({ isActive: 1, lastMessageAt: -1 });

// Static method to generate conversation ID
conversationSchema.statics.generateConversationId = function(userId1, userId2) {
  const id1 = userId1.toString();
  const id2 = userId2.toString();
  return id1 < id2 ? `${id1}_${id2}` : `${id2}_${id1}`;
};

// Static method to find or create conversation
conversationSchema.statics.findOrCreate = async function(userId1, userId2, bookingId = null) {
  const conversationId = this.generateConversationId(userId1, userId2);
  
  let conversation = await this.findOne({ conversationId });
  
  if (!conversation) {
    conversation = await this.create({
      conversationId,
      participants: [userId1, userId2],
      bookingId,
      unreadCount: {
        [userId1.toString()]: 0,
        [userId2.toString()]: 0
      }
    });
  }
  
  return conversation;
};

// Methods
conversationSchema.methods.updateLastMessage = async function(messageId, messageText) {
  this.lastMessage = messageId;
  this.lastMessageText = messageText;
  this.lastMessageAt = new Date();
  await this.save();
};

conversationSchema.methods.incrementUnread = async function(userId) {
  const userIdStr = userId.toString();
  const currentCount = this.unreadCount.get(userIdStr) || 0;
  this.unreadCount.set(userIdStr, currentCount + 1);
  await this.save();
};

conversationSchema.methods.resetUnread = async function(userId) {
  const userIdStr = userId.toString();
  this.unreadCount.set(userIdStr, 0);
  await this.save();
};

conversationSchema.methods.archiveFor = async function(userId) {
  if (!this.archivedBy.includes(userId)) {
    this.archivedBy.push(userId);
    await this.save();
  }
};

conversationSchema.methods.unarchiveFor = async function(userId) {
  this.archivedBy = this.archivedBy.filter(
    id => id.toString() !== userId.toString()
  );
  await this.save();
};

conversationSchema.methods.muteFor = async function(userId, duration = null) {
  // Remove existing mute for this user
  this.mutedBy = this.mutedBy.filter(
    m => m.userId.toString() !== userId.toString()
  );
  
  // Add new mute
  const muteData = { userId };
  if (duration) {
    muteData.mutedUntil = new Date(Date.now() + duration);
  }
  
  this.mutedBy.push(muteData);
  await this.save();
};

conversationSchema.methods.unmuteFor = async function(userId) {
  this.mutedBy = this.mutedBy.filter(
    m => m.userId.toString() !== userId.toString()
  );
  await this.save();
};

conversationSchema.methods.setTyping = async function(userId, isTyping = true) {
  if (isTyping) {
    // Remove existing entry
    this.typingUsers = this.typingUsers.filter(
      t => t.userId.toString() !== userId.toString()
    );
    
    // Add new entry
    this.typingUsers.push({
      userId,
      lastTypingAt: new Date()
    });
  } else {
    // Remove typing indicator
    this.typingUsers = this.typingUsers.filter(
      t => t.userId.toString() !== userId.toString()
    );
  }
  
  await this.save();
};

// Update timestamp before save
conversationSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Conversation', conversationSchema);