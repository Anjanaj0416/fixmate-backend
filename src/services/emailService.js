const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * Email Service
 * Handles all email notification operations
 */

class EmailService {
  constructor() {
    // Create reusable transporter
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'noreply@fixmate.lk';
    this.fromName = process.env.SMTP_FROM_NAME || 'FixMate';
  }

  /**
   * Send email
   */
  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
        ...(text && { text })
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info(`Email sent: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`Error sending email: ${error.message}`);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(userEmail, userName, accountType) {
    const subject = 'Welcome to FixMate! 🎉';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to FixMate! 🎉</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>Thank you for joining FixMate as a <strong>${accountType === 'worker' ? 'Skilled Worker' : 'Customer'}</strong>.</p>
            
            ${accountType === 'worker' ? `
              <p>As a skilled worker, you can now:</p>
              <ul>
                <li>✅ Receive booking requests from customers</li>
                <li>💼 Showcase your portfolio and skills</li>
                <li>💰 Manage your earnings and payments</li>
                <li>⭐ Build your reputation with reviews</li>
              </ul>
            ` : `
              <p>As a customer, you can now:</p>
              <ul>
                <li>🔍 Find skilled workers in your area</li>
                <li>🤖 Use AI-powered recommendations</li>
                <li>📅 Book services instantly</li>
                <li>⭐ Rate and review workers</li>
              </ul>
            `}
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}" class="button">Get Started</a>
            </p>
            
            <p>If you have any questions, feel free to contact our support team.</p>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
          <div class="footer">
            <p>© 2024 FixMate. All rights reserved.</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send booking confirmation email
   */
  async sendBookingConfirmationEmail(userEmail, userName, bookingDetails) {
    const subject = 'Booking Confirmation - FixMate';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .booking-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
          .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #667eea; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Booking Confirmed!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>Your booking has been confirmed. Here are the details:</p>
            
            <div class="booking-card">
              <h3>Booking Details</h3>
              <div class="detail-row">
                <span class="label">Booking ID:</span>
                <span>${bookingDetails.bookingId}</span>
              </div>
              <div class="detail-row">
                <span class="label">Service Type:</span>
                <span>${bookingDetails.serviceType}</span>
              </div>
              <div class="detail-row">
                <span class="label">Worker:</span>
                <span>${bookingDetails.workerName}</span>
              </div>
              <div class="detail-row">
                <span class="label">Scheduled Date:</span>
                <span>${new Date(bookingDetails.scheduledDate).toLocaleDateString()}</span>
              </div>
              <div class="detail-row">
                <span class="label">Location:</span>
                <span>${bookingDetails.location}</span>
              </div>
              ${bookingDetails.estimatedCost ? `
                <div class="detail-row">
                  <span class="label">Estimated Cost:</span>
                  <span>LKR ${bookingDetails.estimatedCost}</span>
                </div>
              ` : ''}
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/bookings/${bookingDetails.bookingId}" class="button">View Booking</a>
            </p>
            
            <p><strong>What's Next?</strong></p>
            <ul>
              <li>The worker will contact you shortly to confirm the appointment</li>
              <li>You'll receive notifications about booking updates</li>
              <li>You can chat with the worker through the app</li>
            </ul>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send booking status update email
   */
  async sendBookingStatusUpdateEmail(userEmail, userName, bookingDetails, status) {
    const statusMessages = {
      accepted: { title: '✅ Booking Accepted', message: 'Great news! Your booking has been accepted.' },
      rejected: { title: '❌ Booking Declined', message: 'Unfortunately, your booking request has been declined.' },
      cancelled: { title: '🚫 Booking Cancelled', message: 'Your booking has been cancelled.' },
      completed: { title: '✔️ Booking Completed', message: 'Your booking has been marked as completed.' },
      in_progress: { title: '🔧 Work Started', message: 'The worker has started working on your booking.' }
    };

    const statusInfo = statusMessages[status] || { title: 'Booking Update', message: 'Your booking status has been updated.' };
    
    const subject = `${statusInfo.title} - FixMate`;
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${statusInfo.title}</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>${statusInfo.message}</p>
            <p><strong>Booking ID:</strong> ${bookingDetails.bookingId}</p>
            <p><strong>Service Type:</strong> ${bookingDetails.serviceType}</p>
            
            ${status === 'completed' ? `
              <p>We hope you're satisfied with the service! Please take a moment to rate and review the worker.</p>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/bookings/${bookingDetails.bookingId}" class="button">View Details</a>
            </p>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail, userName, resetLink) {
    const subject = 'Reset Your Password - FixMate';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Password Reset Request</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>We received a request to reset your password for your FixMate account.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            
            <p><strong>This link will expire in 1 hour.</strong></p>
            
            <div class="warning">
              <strong>⚠️ Security Notice:</strong><br>
              If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
            </div>
            
            <p>For security reasons, we recommend:</p>
            <ul>
              <li>Using a strong, unique password</li>
              <li>Not sharing your password with anyone</li>
              <li>Enabling two-factor authentication</li>
            </ul>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send new review notification email
   */
  async sendReviewNotificationEmail(userEmail, userName, reviewDetails) {
    const subject = '⭐ New Review Received - FixMate';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .review-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ffc107; }
          .stars { color: #ffc107; font-size: 24px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⭐ New Review Received!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>You've received a new review for your service!</p>
            
            <div class="review-card">
              <div class="stars">${'⭐'.repeat(reviewDetails.rating)}</div>
              <p><strong>Rating:</strong> ${reviewDetails.rating}/5</p>
              <p><strong>Comment:</strong></p>
              <p>${reviewDetails.comment || 'No comment provided'}</p>
              <p><strong>Service:</strong> ${reviewDetails.serviceType}</p>
            </div>
            
            <p style="text-align: center;">
              <a href="${process.env.FRONTEND_URL}/reviews/${reviewDetails.reviewId}" class="button">View Review</a>
            </p>
            
            <p>Keep up the great work! Reviews help build your reputation and attract more customers.</p>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send payment receipt email
   */
  async sendPaymentReceiptEmail(userEmail, userName, paymentDetails) {
    const subject = '💰 Payment Receipt - FixMate';
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .receipt { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .total { font-size: 24px; font-weight: bold; color: #667eea; text-align: center; padding: 20px; background: #f0f4ff; border-radius: 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💰 Payment Receipt</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            <p>Thank you for your payment. Here's your receipt:</p>
            
            <div class="receipt">
              <p><strong>Payment ID:</strong> ${paymentDetails.paymentId}</p>
              <p><strong>Booking ID:</strong> ${paymentDetails.bookingId}</p>
              <p><strong>Service:</strong> ${paymentDetails.serviceType}</p>
              <p><strong>Date:</strong> ${new Date(paymentDetails.date).toLocaleDateString()}</p>
              <p><strong>Payment Method:</strong> ${paymentDetails.method}</p>
              
              <div class="total">
                Total Paid: LKR ${paymentDetails.amount.toFixed(2)}
              </div>
            </div>
            
            <p>This payment has been processed successfully. You can view your payment history in your account.</p>
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Send worker verification email
   */
  async sendWorkerVerificationEmail(userEmail, userName, verificationStatus) {
    const subject = verificationStatus === 'approved' 
      ? '✅ Worker Verification Approved - FixMate'
      : '❌ Worker Verification Pending - FixMate';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${verificationStatus === 'approved' ? '#28a745' : '#ffc107'}; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${verificationStatus === 'approved' ? '✅ Verification Approved!' : '⏳ Verification Pending'}</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName}!</h2>
            
            ${verificationStatus === 'approved' ? `
              <p>Congratulations! Your worker profile has been verified.</p>
              <p>You can now:</p>
              <ul>
                <li>Receive booking requests from customers</li>
                <li>Showcase your verified badge</li>
                <li>Build your reputation on the platform</li>
              </ul>
              <p style="text-align: center;">
                <a href="${process.env.FRONTEND_URL}/worker/dashboard" class="button">Go to Dashboard</a>
              </p>
            ` : `
              <p>Thank you for submitting your verification documents. Our team is currently reviewing your application.</p>
              <p>This process typically takes 2-3 business days. We'll notify you once the review is complete.</p>
            `}
            
            <p>Best regards,<br>The FixMate Team</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(userEmail, subject, html);
  }

  /**
   * Verify email configuration
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('Email service is ready to send emails');
      return true;
    } catch (error) {
      logger.error(`Email service configuration error: ${error.message}`);
      return false;
    }
  }
}

module.exports = new EmailService();