const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const logger = require('./utils/logger');
const { RATE_LIMITS } = require('./config/constants');

// Import routes
const routes = require('./routes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');

/**
 * Express Application Setup
 */

const app = express();

// ==========================================
// Security Middleware
// ==========================================

// Helmet - Security headers
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP for API
  crossOriginEmbedderPolicy: false
}));

// CORS Configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Data Sanitization against NoSQL Injection
app.use(mongoSanitize());

// ==========================================
// Rate Limiting
// ==========================================

const limiter = rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.MAX_REQUESTS,
  message: RATE_LIMITS.MESSAGE,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/', limiter);

// ==========================================
// Body Parsing Middleware
// ==========================================

// JSON body parser
app.use(express.json({ limit: '10mb' }));

// URL-encoded body parser
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ==========================================
// Compression & Performance
// ==========================================

// Compress responses
app.use(compression());

// ==========================================
// Logging Middleware
// ==========================================

// HTTP request logger
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', { stream: logger.stream }));
}

// Request ID middleware (for tracking requests)
app.use((req, res, next) => {
  req.id = require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  next();
});

// ==========================================
// API Routes
// ==========================================

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV
  });
});

// API version info
app.get('/api', (req, res) => {
  res.status(200).json({
    message: 'FixMate API',
    version: '1.0.0',
    status: 'active',
    documentation: '/api/docs',
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
    }
  });
});

// Mount API routes
app.use('/api/v1', routes);

// ==========================================
// Error Handling
// ==========================================

// 404 Handler - Route not found
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use(errorHandler);

// ==========================================
// Graceful Shutdown
// ==========================================

process.on('unhandledRejection', (err) => {
  logger.error('Unhandled Rejection:', err);
  // Don't exit in production, let PM2/container orchestrator handle it
  if (process.env.NODE_ENV !== 'production') {
    process.exit(1);
  }
});

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  // Exit gracefully
  process.exit(1);
});

// ==========================================
// Export App
// ==========================================

module.exports = app;