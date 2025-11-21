const admin = require('../config/firebase-admin');
const Notification = require('../models/Notification');
const logger = require('../utils/logger');

/**
 * Firebase Cloud Messaging Service
 * Handles all FCM push notification operations
 */

class FirebaseService {
  /**
   * Send push notification to a single device
   */
  async sendToDevice(fcmToken, notification, data = {}) {
    try {
      if (!fcmToken) {
        throw new Error('FCM token is required');
      }

      const message = {
        token: fcmToken,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: notification.type || 'default',
            priority: 'high',
            defaultSound: true,
            defaultVibrateTimings: true
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1,
              contentAvailable: true
            }
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Notification sent successfully: ${response}`);
      
      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      logger.error(`Error sending notification: ${error.message}`);
      
      // Handle invalid or expired tokens
      if (error.code === 'messaging/invalid-registration-token' || 
          error.code === 'messaging/registration-token-not-registered') {
        // Token is invalid - should be removed from database
        return {
          success: false,
          error: 'Invalid FCM token',
          invalidToken: true
        };
      }
      
      throw error;
    }
  }

  /**
   * Send push notification to multiple devices
   */
  async sendToMultipleDevices(fcmTokens, notification, data = {}) {
    try {
      if (!fcmTokens || fcmTokens.length === 0) {
        throw new Error('At least one FCM token is required');
      }

      // Filter out any null or undefined tokens
      const validTokens = fcmTokens.filter(token => token);

      if (validTokens.length === 0) {
        throw new Error('No valid FCM tokens provided');
      }

      const message = {
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: notification.type || 'default',
            priority: 'high'
          }
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              badge: 1
            }
          }
        },
        tokens: validTokens
      };

      const response = await admin.messaging().sendEachForMulticast(message);
      
      logger.info(`Batch notification sent: ${response.successCount} successful, ${response.failureCount} failed`);
      
      // Collect invalid tokens
      const invalidTokens = [];
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success && 
              (resp.error.code === 'messaging/invalid-registration-token' ||
               resp.error.code === 'messaging/registration-token-not-registered')) {
            invalidTokens.push(validTokens[idx]);
          }
        });
      }

      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens
      };
    } catch (error) {
      logger.error(`Error sending batch notifications: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification by topic
   */
  async sendToTopic(topic, notification, data = {}) {
    try {
      const message = {
        topic,
        notification: {
          title: notification.title,
          body: notification.body,
          ...(notification.imageUrl && { imageUrl: notification.imageUrl })
        },
        data: {
          ...data,
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
          timestamp: new Date().toISOString()
        },
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            channelId: notification.type || 'default'
          }
        }
      };

      const response = await admin.messaging().send(message);
      logger.info(`Topic notification sent successfully: ${response}`);
      
      return {
        success: true,
        messageId: response
      };
    } catch (error) {
      logger.error(`Error sending topic notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Subscribe device to a topic
   */
  async subscribeToTopic(fcmTokens, topic) {
    try {
      const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
      const response = await admin.messaging().subscribeToTopic(tokens, topic);
      
      logger.info(`Subscribed to topic ${topic}: ${response.successCount} successful`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      logger.error(`Error subscribing to topic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Unsubscribe device from a topic
   */
  async unsubscribeFromTopic(fcmTokens, topic) {
    try {
      const tokens = Array.isArray(fcmTokens) ? fcmTokens : [fcmTokens];
      const response = await admin.messaging().unsubscribeFromTopic(tokens, topic);
      
      logger.info(`Unsubscribed from topic ${topic}: ${response.successCount} successful`);
      
      return {
        success: true,
        successCount: response.successCount,
        failureCount: response.failureCount
      };
    } catch (error) {
      logger.error(`Error unsubscribing from topic: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send notification and save to database
   */
  async sendAndSaveNotification(userId, notificationData, fcmToken) {
    try {
      // Save to database
      const notification = await Notification.create({
        userId,
        type: notificationData.type,
        title: notificationData.title,
        message: notificationData.body,
        data: notificationData.data || {},
        priority: notificationData.priority || 'normal'
      });

      // Send push notification if FCM token exists
      if (fcmToken) {
        await this.sendToDevice(fcmToken, {
          title: notificationData.title,
          body: notificationData.body,
          imageUrl: notificationData.imageUrl,
          type: notificationData.type
        }, {
          notificationId: notification._id.toString(),
          ...notificationData.data
        });
      }

      return notification;
    } catch (error) {
      logger.error(`Error sending and saving notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send booking notification
   */
  async sendBookingNotification(userId, fcmToken, bookingData) {
    const notificationData = {
      type: 'booking',
      title: '🔔 New Booking Request',
      body: `You have a new booking request for ${bookingData.serviceType}`,
      data: {
        bookingId: bookingData.bookingId,
        type: 'booking_request'
      },
      priority: 'high'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }

  /**
   * Send booking status update notification
   */
  async sendBookingStatusNotification(userId, fcmToken, bookingData) {
    const statusMessages = {
      accepted: '✅ Your booking has been accepted',
      rejected: '❌ Your booking has been declined',
      cancelled: '🚫 Booking has been cancelled',
      completed: '✔️ Booking completed successfully',
      in_progress: '🔧 Work is now in progress'
    };

    const notificationData = {
      type: 'booking_status',
      title: 'Booking Update',
      body: statusMessages[bookingData.status] || 'Booking status updated',
      data: {
        bookingId: bookingData.bookingId,
        status: bookingData.status,
        type: 'booking_status'
      },
      priority: 'high'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }

  /**
   * Send new message notification
   */
  async sendMessageNotification(userId, fcmToken, messageData) {
    const notificationData = {
      type: 'message',
      title: `💬 Message from ${messageData.senderName}`,
      body: messageData.text.substring(0, 100),
      data: {
        conversationId: messageData.conversationId,
        senderId: messageData.senderId,
        type: 'new_message'
      },
      priority: 'high'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }

  /**
   * Send review notification
   */
  async sendReviewNotification(userId, fcmToken, reviewData) {
    const notificationData = {
      type: 'review',
      title: '⭐ New Review',
      body: `You received a ${reviewData.rating}-star review`,
      data: {
        reviewId: reviewData.reviewId,
        bookingId: reviewData.bookingId,
        rating: reviewData.rating.toString(),
        type: 'new_review'
      },
      priority: 'normal'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }

  /**
   * Send payment notification
   */
  async sendPaymentNotification(userId, fcmToken, paymentData) {
    const notificationData = {
      type: 'payment',
      title: '💰 Payment Received',
      body: `Payment of LKR ${paymentData.amount} has been processed`,
      data: {
        paymentId: paymentData.paymentId,
        amount: paymentData.amount.toString(),
        type: 'payment_received'
      },
      priority: 'high'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }

  /**
   * Send reminder notification
   */
  async sendReminderNotification(userId, fcmToken, reminderData) {
    const notificationData = {
      type: 'reminder',
      title: '⏰ Reminder',
      body: reminderData.message,
      data: {
        bookingId: reminderData.bookingId,
        type: 'reminder'
      },
      priority: 'normal'
    };

    return await this.sendAndSaveNotification(userId, notificationData, fcmToken);
  }
}

module.exports = new FirebaseService();