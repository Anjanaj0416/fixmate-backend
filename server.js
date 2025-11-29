require('dotenv').config();

const app = require('./app');
const { connectDB } = require('./src/config/database');
const { initializeFirebase } = require('./src/config/firebase-admin');
const { initializeCloudinary } = require('./src/config/cloudinary');
const logger = require('./src/utils/logger');

/**
 * FixMate Backend Server
 * Main entry point for the application
 * 
 * FIXED: Changed default port from 5000 to 5001 to match frontend expectations
 */

// ✅ FIX #1: Change port from 5000 to 5001
const PORT = process.env.PORT || 5001;
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Initialize Services
 */
const initializeServices = async () => {
  try {
    logger.info('Starting FixMate Backend Server...');
    logger.info(`Environment: ${NODE_ENV}`);
    
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...');
    await connectDB();
    logger.info('✅ MongoDB connected successfully');
    
    // Initialize Firebase Admin SDK
    logger.info('Initializing Firebase Admin SDK...');
    try {
      initializeFirebase();
      logger.info('✅ Firebase Admin SDK initialized successfully');
    } catch (error) {
      logger.warn('Firebase initialization failed. Push notifications will be disabled.');
      logger.warn('Error:', error.message);
    }
    
    // Initialize Cloudinary (optional)
    logger.info('Checking Cloudinary configuration...');
    const cloudinaryInitialized = initializeCloudinary();
    if (cloudinaryInitialized) {
      logger.info('✅ Cloudinary initialized successfully');
    } else {
      logger.info('Cloudinary not configured. Using MongoDB for image storage.');
    }
    
    logger.info('All services initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize services:', error);
    return false;
  }
};

/**
 * Start Server
 */
const startServer = () => {
  const server = app.listen(PORT, () => {
    logger.info('='.repeat(50));
    logger.info(`🚀 FixMate Server running in ${NODE_ENV} mode`);
    logger.info(`📡 Server listening on port ${PORT}`);
    logger.info(`🌐 API URL: http://localhost:${PORT}/api/v1`);
    logger.info(`💚 Health check: http://localhost:${PORT}/health`);
    logger.info('='.repeat(50));
  });
  
  // Handle server errors
  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      logger.error(`Port ${PORT} is already in use`);
      process.exit(1);
    } else {
      logger.error('Server error:', error);
      process.exit(1);
    }
  });
  
  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    logger.info(`\n${signal} received. Starting graceful shutdown...`);
    
    // Stop accepting new connections
    server.close(async () => {
      logger.info('HTTP server closed');
      
      try {
        // Close database connection
        const { disconnectDB } = require('./src/config/database');
        await disconnectDB();
        logger.info('Database connections closed');
        
        logger.info('Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown:', error);
        process.exit(1);
      }
    });
    
    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  return server;
};

/**
 * Main Function
 */
const main = async () => {
  try {
    // Initialize all services
    const initialized = await initializeServices();
    
    if (!initialized) {
      logger.error('Failed to initialize services. Exiting...');
      process.exit(1);
    }
    
    // Start the server
    startServer();
    
  } catch (error) {
    logger.error('Fatal error during startup:', error);
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise);
  logger.error('Reason:', reason);
  
  // Exit in development, let container restart in production
  if (NODE_ENV !== 'production') {
    process.exit(1);
  }
});

// Start the application
if (require.main === module) {
  main();
}

// Export for testing
module.exports = { main, initializeServices };