const { Notification, User } = require('../models');
const admin = require('../config/firebase-admin');

/**
 * @desc    Get user notifications
 * @route   GET /api/notifications
 * @access  Private
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { page = 1, limit = 20, type, isRead } = req.query;

    const user = await User.findOne({ firebaseUid });

    const query = { userId: user._id };
    if (type) query.type = type;
    if (isRead !== undefined) query.isRead = isRead === 'true';

    const notifications = await Notification.find(query)
      .populate('relatedUser', 'fullName profileImage')
      .populate('relatedBooking', 'serviceType status')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const count = await Notification.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        notifications,
        totalPages: Math.ceil(count / limit),
        currentPage: page,
        total: count
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get unread notification count
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    const unreadCount = await Notification.getUnreadCount(user._id);

    res.status(200).json({
      success: true,
      data: { unreadCount }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark notification as read
 * @route   PUT /api/notifications/:id/read
 * @access  Private
 */
exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await notification.markAsRead();

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Mark all notifications as read
 * @route   PUT /api/notifications/read-all
 * @access  Private
 */
exports.markAllAsRead = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    await Notification.markAllAsRead(user._id);

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete notification
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
exports.deleteNotification = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { firebaseUid } = req.user;

    const user = await User.findOne({ firebaseUid });
    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (notification.userId.toString() !== user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Send push notification (for testing)
 * @route   POST /api/notifications/send
 * @access  Private/Admin
 */
exports.sendPushNotification = async (req, res, next) => {
  try {
    const { userId, title, message, type } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Create notification in database
    const notification = await Notification.create({
      userId: user._id,
      type: type || 'system-update',
      title,
      message,
      priority: 'normal'
    });

    // Send FCM notification if user has token
    if (user.fcmToken && user.notificationSettings.pushEnabled) {
      try {
        const fcmMessage = {
          notification: {
            title,
            body: message
          },
          data: {
            notificationId: notification._id.toString(),
            type: type || 'system-update'
          },
          token: user.fcmToken
        };

        const response = await admin.messaging().send(fcmMessage);
        
        await notification.markAsSent(response);
        await notification.markAsDelivered();

        res.status(200).json({
          success: true,
          message: 'Push notification sent successfully',
          data: { notification, fcmResponse: response }
        });
      } catch (fcmError) {
        await notification.markAsFailed(fcmError.message);
        
        res.status(200).json({
          success: true,
          message: 'Notification created but FCM delivery failed',
          data: { notification, error: fcmError.message }
        });
      }
    } else {
      res.status(200).json({
        success: true,
        message: 'Notification created (Push notifications disabled for user)',
        data: { notification }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear all notifications
 * @route   DELETE /api/notifications/clear-all
 * @access  Private
 */
exports.clearAllNotifications = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    await Notification.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      message: 'All notifications cleared'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get notification settings
 * @route   GET /api/notifications/settings
 * @access  Private
 */
exports.getNotificationSettings = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const user = await User.findOne({ firebaseUid });

    res.status(200).json({
      success: true,
      data: { notificationSettings: user.notificationSettings }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update notification settings
 * @route   PUT /api/notifications/settings
 * @access  Private
 */
exports.updateNotificationSettings = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { pushEnabled, emailEnabled, smsEnabled } = req.body;

    const user = await User.findOneAndUpdate(
      { firebaseUid },
      {
        notificationSettings: {
          pushEnabled,
          emailEnabled,
          smsEnabled
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Notification settings updated successfully',
      data: { notificationSettings: user.notificationSettings }
    });
  } catch (error) {
    next(error);
  }
};