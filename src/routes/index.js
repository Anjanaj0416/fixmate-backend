const express = require('express');
const router = express.Router();

// Import all route modules
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

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'FixMate API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API version endpoint
router.get('/version', (req, res) => {
  res.status(200).json({
    success: true,
    version: '1.0.0',
    apiVersion: 'v1',
    description: 'FixMate - Skilled Worker Booking Platform API'
  });
});

// Mount route modules
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

// 404 handler for undefined routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports = router;