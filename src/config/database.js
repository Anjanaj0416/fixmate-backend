const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * MongoDB Database Configuration
 */

// MongoDB connection options
const options = {
  maxPoolSize: 10,
  minPoolSize: 5,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 5000,
  family: 4, // Use IPv4
};

/**
 * Connect to MongoDB
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, options);
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    logger.info(`Database Name: ${conn.connection.name}`);
    
    // Log connection status
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
    });
    
    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
    });
    
    // Handle application termination
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('Mongoose connection closed due to application termination');
      process.exit(0);
    });
    
    return conn;
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

/**
 * Disconnect from MongoDB
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
    throw error;
  }
};

/**
 * Get database connection status
 */
const getConnectionStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };
  
  return {
    status: states[mongoose.connection.readyState],
    database: mongoose.connection.name,
    host: mongoose.connection.host
  };
};

/**
 * Check if database is connected
 */
const isConnected = () => {
  return mongoose.connection.readyState === 1;
};

/**
 * Clear database (for testing only)
 */
const clearDatabase = async () => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('Database clearing is only allowed in test environment');
  }
  
  try {
    const collections = mongoose.connection.collections;
    
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
    
    logger.info('Test database cleared');
  } catch (error) {
    logger.error('Error clearing test database:', error);
    throw error;
  }
};

/**
 * Create indexes for all models
 */
const createIndexes = async () => {
  try {
    // Get all models
    const models = mongoose.modelNames();
    
    for (const modelName of models) {
      const model = mongoose.model(modelName);
      await model.createIndexes();
      logger.info(`Indexes created for ${modelName}`);
    }
    
    logger.info('All indexes created successfully');
  } catch (error) {
    logger.error('Error creating indexes:', error);
    throw error;
  }
};

/**
 * Database health check
 */
const healthCheck = async () => {
  try {
    const state = mongoose.connection.readyState;
    
    if (state !== 1) {
      throw new Error('Database not connected');
    }
    
    // Perform a simple query to test connection
    await mongoose.connection.db.admin().ping();
    
    return {
      status: 'healthy',
      connection: 'active',
      database: mongoose.connection.name,
      collections: Object.keys(mongoose.connection.collections).length
    };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Get database statistics
 */
const getStats = async () => {
  try {
    const db = mongoose.connection.db;
    const stats = await db.stats();
    
    return {
      database: mongoose.connection.name,
      collections: stats.collections,
      documents: stats.objects,
      dataSize: `${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`,
      storageSize: `${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`,
      indexes: stats.indexes,
      indexSize: `${(stats.indexSize / 1024 / 1024).toFixed(2)} MB`
    };
  } catch (error) {
    logger.error('Error getting database stats:', error);
    throw error;
  }
};

/**
 * Backup database (basic implementation)
 */
const backupDatabase = async (backupPath) => {
  try {
    // This is a placeholder for database backup logic
    // In production, use mongodump or a cloud backup service
    logger.info(`Database backup initiated to: ${backupPath}`);
    
    // Implementation would depend on your backup strategy
    // Example: Execute mongodump command, or use cloud backup service
    
    return {
      success: true,
      backupPath,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Error backing up database:', error);
    throw error;
  }
};

/**
 * Setup database event listeners
 */
const setupEventListeners = () => {
  // Connection successful
  mongoose.connection.on('connected', () => {
    logger.info('Mongoose default connection is open');
  });
  
  // Connection throws an error
  mongoose.connection.on('error', (err) => {
    logger.error('Mongoose default connection error: ' + err);
  });
  
  // Connection is disconnected
  mongoose.connection.on('disconnected', () => {
    logger.info('Mongoose default connection is disconnected');
  });
  
  // If Node process ends, close mongoose connection
  process.on('SIGINT', async () => {
    try {
      await mongoose.connection.close();
      logger.info('Mongoose connection is disconnected due to application termination');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing mongoose connection:', err);
      process.exit(1);
    }
  });
  
  // Handle SIGTERM
  process.on('SIGTERM', async () => {
    try {
      await mongoose.connection.close();
      logger.info('Mongoose connection is disconnected due to SIGTERM');
      process.exit(0);
    } catch (err) {
      logger.error('Error closing mongoose connection:', err);
      process.exit(1);
    }
  });
};

// Setup event listeners
setupEventListeners();

module.exports = {
  connectDB,
  disconnectDB,
  getConnectionStatus,
  isConnected,
  clearDatabase,
  createIndexes,
  healthCheck,
  getStats,
  backupDatabase
};