const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');

const logger = require('./src/utils/logger');
const { RATE_LIMITS } = require('./src/config/constants');

// Import routes
const routes = require('./src/routes');

// Import middleware
const { errorHandler } = require('./src/middleware/errorHandler');

/**
 * Express Application Setup
 * 
 * FIXES:
 * 1. CORS allows localhost:5173 (Vite)
 * 2. Better logging
 * 3. OPTIONS preflight handler
 */

const app = express();

// ==========================================
// Security Middleware
// ==========================================

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// ==========================================
// ✅ CORS Configuration for Vite (port 5173)
// ==========================================

const allowedOrigins = [
  'http://localhost:5173',  // ✅ Vite frontend
  'http://localhost:3000',
  'http://localhost:5174',
  'http://127.0.0.1:5173',
];

if (process.env.CORS_ORIGIN) {
  allowedOrigins.push(process.env.CORS_ORIGIN);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn(`❌ CORS blocked: ${origin}`);
      callback(new Error(`CORS not allowed: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ==========================================
// Middleware
// ==========================================

app.use(mongoSanitize());
app.use('/api/', rateLimit({
  windowMs: RATE_LIMITS.WINDOW_MS,
  max: RATE_LIMITS.MAX_REQUESTS,
  message: RATE_LIMITS.MESSAGE,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(compression());

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Request logging
app.use((req, res, next) => {
  req.id = require('crypto').randomBytes(16).toString('hex');
  res.setHeader('X-Request-ID', req.id);
  logger.info(`📨 ${req.method} ${req.path} (Origin: ${req.headers.origin || 'none'})`);
  next();
});

// ==========================================
// Routes
// ==========================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/api', (req, res) => {
  res.json({
    message: 'FixMate API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      workers: '/api/v1/workers',
      bookings: '/api/v1/bookings',
    }
  });
});

app.use('/api/v1', routes);

// ==========================================
// Error Handling
// ==========================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
  });
});

app.use(errorHandler);

module.exports = app;