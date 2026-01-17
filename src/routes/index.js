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

const adminRoutes = require('./adminRoutes');


/**
 * API Welcome Route
 */
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Welcome to FixMate API v1',
    version: '1.0.0',
    endpoints: {
      auth: '/auth',
      users: '/users',
      workers: '/workers',
      bookings: '/bookings',
      reviews: '/reviews',
      chat: '/chat',
      notifications: '/notifications',
      
      admin: '/admin',
      
    },
    documentation: '/docs',
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

router.use('/admin', adminRoutes);


/**
 * API Documentation Route (placeholder)
 */
router.get('/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation',
    info: 'Complete API documentation coming soon',
    swagger: '/swagger',
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