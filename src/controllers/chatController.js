const { Message, User, Notification } = require('../models');

/**
 * @desc    Send a message
 * @route   POST /api/chat/messages
 * @access  Private
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      receiverId,
      message,
      messageType,
      mediaUrl,
      location,
      bookingId
    } = req.body;

    const sender = await User.findOne({ firebaseUid });

    // Generate conversation ID
    const conversationId = Message.generateConversationId(sender._id, receiverId);

    const newMessage = await Message.create({
      conversationId,
      senderId: sender._id,
      receiverId,
      messageType: messageType || 'text',
      message,
      mediaUrl,
      location,
      bookingId
    });

    // Populate sender and receiver info
    await newMessage.populate('senderId', 'fullName profileImage');
    await newMessage.populate('receiverId', 'fullName profileImage');

    // Send push notification to receiver
    const receiver = await User.findById(receiverId);
    if (receiver.fcmToken && receiver.notificationSettings.pushEnabled) {
      await Notification.create({
        userId: receiverId,
        type: 'new-message',
        title: `Message from ${sender.fullName}`,
        message: messageType === 'text' ? message : `Sent a ${messageType}`,
        relatedUser: sender._id,
        priority: 'normal'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message: newMessage }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get conversation messages
 * @route   GET /api/chat/conversations/:userId
 * @access  Private
 */
exports.getConversation = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const currentUser = await User.findOne({ firebaseUid });
    const conversationId = Message.generateConversationId(currentUser._id, userId);

    const messages = await Message.find({
      conversationId,
      isDeleted: false
    })
      .populate('senderId', 'fullName profileImage')
      .populate('receiverId', 'fullName profileImage')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ timestamp: -1 });

    const count = await Message.countDocuments({
      conversationId,
      isDeleted: false
    });

    // Mark messages as delivered
    await Message.markConversationAsDelivered(conversationId, currentUser._id);

    res.status(200).json({
      success: true,
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count,
        conversationId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all conversations
 * @route   GET /api/chat/conversations
 * @access  Private
 * ✅ FIXED: Added deduplication to prevent duplicate conversations
 */
exports.getConversations = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    console.log('📥 Getting conversations for user:', user._id);

    // Get all unique conversation partners
    const messages = await Message.aggregate([
      {
        $match: {
          $or: [
            { senderId: user._id },
            { receiverId: user._id }
          ],
          isDeleted: false
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $group: {
          _id: '$conversationId',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $sort: { 'lastMessage.timestamp': -1 }
      }
    ]);

    console.log('📊 Raw aggregation results:', messages.length);

    // Populate user details
    const conversations = await Promise.all(
      messages.map(async (conv) => {
        const lastMsg = await Message.findById(conv.lastMessage._id)
          .populate('senderId', 'fullName profileImage')
          .populate('receiverId', 'fullName profileImage');

        const otherUserId = lastMsg.senderId._id.toString() === user._id.toString()
          ? lastMsg.receiverId
          : lastMsg.senderId;

        return {
          conversationId: conv._id,
          otherUser: otherUserId,
          lastMessage: lastMsg,
          unreadCount: conv.unreadCount
        };
      })
    );

    console.log('💬 Conversations before dedup:', conversations.length);

    // ✅ CRITICAL FIX: Deduplicate conversations by conversationId
    // This prevents duplicate conversations from being sent to frontend
    const uniqueConversationsMap = new Map();
    
    conversations.forEach((conv) => {
      const convId = conv.conversationId;
      
      // If we haven't seen this conversation yet, add it
      if (!uniqueConversationsMap.has(convId)) {
        uniqueConversationsMap.set(convId, conv);
      } else {
        // Compare timestamps and keep the one with more recent lastMessage
        const existing = uniqueConversationsMap.get(convId);
        const existingTime = new Date(existing.lastMessage?.timestamp || 0).getTime();
        const currentTime = new Date(conv.lastMessage?.timestamp || 0).getTime();
        
        if (currentTime > existingTime) {
          uniqueConversationsMap.set(convId, conv);
          console.log(`🔄 Updated conversation ${convId} with more recent message`);
        }
      }
    });

    // Convert Map back to array
    const uniqueConversations = Array.from(uniqueConversationsMap.values());
    
    console.log('✅ Conversations after dedup:', uniqueConversations.length);
    console.log('🗑️ Duplicates removed:', conversations.length - uniqueConversations.length);

    res.status(200).json({
      success: true,
      data: { 
        conversations: uniqueConversations,
        total: uniqueConversations.length
      }
    });
  } catch (error) {
    console.error('❌ Error in getConversations:', error);
    next(error);
  }
};

/**
 * @desc    Mark messages as read
 * @route   PUT /api/chat/messages/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { conversationId } = req.body;

    const user = await User.findOne({ firebaseUid });

    await Message.updateMany(
      {
        conversationId,
        receiverId: user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );

    res.status(200).json({
      success: true,
      message: 'Messages marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete message
 * @route   DELETE /api/chat/messages/:id
 * @access  Private
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;

    const user = await User.findOne({ firebaseUid });
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (message.senderId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await message.softDelete(user._id);

    res.status(200).json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread message count
 * @route   GET /api/chat/unread-count
 * @access  Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    const unreadCount = await Message.getUnreadCount(user._id);

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Search messages
 * @route   GET /api/chat/search
 * @access  Private
 */
exports.searchMessages = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { query, conversationId } = req.query;

    const user = await User.findOne({ firebaseUid });

    const searchQuery = {
      $or: [
        { senderId: user._id },
        { receiverId: user._id }
      ],
      message: { $regex: query, $options: 'i' },
      messageType: 'text',
      isDeleted: false
    };

    if (conversationId) {
      searchQuery.conversationId = conversationId;
    }

    const messages = await Message.find(searchQuery)
      .populate('senderId', 'fullName profileImage')
      .populate('receiverId', 'fullName profileImage')
      .sort({ timestamp: -1 })
      .limit(50);

    res.status(200).json({
      success: true,
      data: { messages, count: messages.length }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add reaction to message
 * @route   POST /api/chat/messages/:id/reaction
 * @access  Private
 */
exports.addReaction = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { id } = req.params;
    const { emoji } = req.body;

    const user = await User.findOne({ firebaseUid });
    const message = await Message.findById(id);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.addReaction(user._id, emoji);

    res.status(200).json({
      success: true,
      message: 'Reaction added successfully',
      data: { reactions: message.reactions }
    });
  } catch (error) {
    next(error);
  }
};