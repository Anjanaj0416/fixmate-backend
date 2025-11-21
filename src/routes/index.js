const express = require('express');
const router = express.Router();

/**
 * Main API Router
 * Combines all route modules
 */

// Import route modules
const authRoutes = require('./authRoutes');
const userRoutes = require('./userRoutes');
const workerRoutes = require('./workerRoutes');
const bookingRoutes = require('./bookingRoutes');
const reviewRoutes = require('./reviewRoutes');
const chatRoutes = require('./chatRoutes');
const notificationRoutes = require('./notificationRoutes');
const paymentRoutes = require('./paymentRoutes');
const adminRoutes = require('./adminRoutes');
const aiRoutes = require('./aiRoutes');

/**
 * API Welcome Route
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FixMate API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      workers: '/api/v1/workers',
      bookings: '/api/v1/bookings',
      reviews: '/api/v1/reviews',
      chat: '/api/v1/chat',
      notifications: '/api/v1/notifications',
      payments: '/api/v1/payments',
      admin: '/api/v1/admin',
      ai: '/api/v1/ai'
    },
    documentation: '/api/v1/docs',
    status: 'active'
  });
});

/**
 * Mount all routes
 */
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/workers', workerRoutes);
router.use('/bookings', bookingRoutes);
router.use('/reviews', reviewRoutes);
router.use('/chat', chatRoutes);
router.use('/notifications', notificationRoutes);
router.use('/payments', paymentRoutes);
router.use('/admin', adminRoutes);
router.use('/ai', aiRoutes);

/**
 * API Documentation Route (placeholder)
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    info: 'Complete API documentation coming soon',
    swagger: '/api/v1/swagger',
    postman: 'Import Postman collection for full documentation'
  });
});

/**
 * Health Check Route
 */
router.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

module.exports = router;