const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');

/**
 * Rate Limiting Middleware
 * Prevents abuse by limiting the number of requests
 */

/**
 * Basic Rate Limiter
 * General purpose rate limiting for all routes
 */
exports.basicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Store in memory (for development)
  // In production, use Redis store
});

/**
 * Strict Rate Limiter
 * For sensitive endpoints like authentication
 */
exports.strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false // Count all requests
});

/**
 * Auth Rate Limiter
 * For login and registration endpoints
 */
exports.authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again after 15 minutes.',
    retryAfter: 15
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Password Reset Limiter
 * For password reset endpoints
 */
exports.passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again after an hour.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Email Limiter
 * For email sending endpoints
 */
exports.emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 emails per hour
  message: {
    success: false,
    message: 'Too many emails sent, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * SMS Limiter
 * For SMS/OTP endpoints
 */
exports.smsLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 SMS per hour
  message: {
    success: false,
    message: 'Too many SMS requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * API Limiter
 * For general API endpoints
 */
exports.apiLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 50, // 50 requests per 10 minutes
  message: {
    success: false,
    message: 'Too many API requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Upload Limiter
 * For file upload endpoints
 */
exports.uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 20 uploads per hour
  message: {
    success: false,
    message: 'Too many file uploads, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Search Limiter
 * For search endpoints
 */
exports.searchLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // 10 searches per minute
  message: {
    success: false,
    message: 'Too many search requests, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Booking Creation Limiter
 * Prevent spam booking creation
 */
exports.bookingLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bookings per hour
  message: {
    success: false,
    message: 'Too many booking requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Review Limiter
 * Prevent spam reviews
 */
exports.reviewLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 10, // 10 reviews per day
  message: {
    success: false,
    message: 'Too many reviews submitted, please try again tomorrow.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Message Limiter
 * For chat messages
 */
exports.messageLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // 20 messages per minute
  message: {
    success: false,
    message: 'Too many messages sent, please slow down.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Admin Limiter
 * For admin endpoints (more permissive)
 */
exports.adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // 200 requests per 15 minutes
  message: {
    success: false,
    message: 'Too many admin requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Redis-based Rate Limiter (for production)
 * Uncomment and configure when using Redis
 */
/*
const redis = require('redis');
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD
});

exports.redisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:' // Rate limit prefix
  }),
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});
*/

/**
 * Custom Rate Limiter
 * Create custom rate limiter with specific options
 */
exports.createLimiter = (options) => {
  const defaultOptions = {
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
      success: false,
      message: 'Too many requests, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  };

  return rateLimit({ ...defaultOptions, ...options });
};

/**
 * Dynamic Rate Limiter
 * Adjust rate limit based on user role
 */
exports.dynamicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: (req, res) => {
    // Higher limits for authenticated users
    if (req.user) {
      switch (req.user.role) {
        case 'admin':
          return 500;
        case 'worker':
          return 300;
        case 'customer':
          return 200;
        default:
          return 100;
      }
    }
    return 50; // Lower limit for unauthenticated users
  },
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for admin in development
    return process.env.NODE_ENV === 'development' && req.user?.role === 'admin';
  }
});

/**
 * IP-based Rate Limiter with Whitelist
 */
const ipWhitelist = [
  '127.0.0.1',
  '::1',
  // Add trusted IPs here
];

exports.ipBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skip: (req) => {
    const clientIp = req.ip || req.connection.remoteAddress;
    return ipWhitelist.includes(clientIp);
  },
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Sliding Window Rate Limiter
 * More accurate rate limiting
 */
exports.slidingWindowLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  skipSuccessfulRequests: false,
  skipFailedRequests: false,
  message: {
    success: false,
    message: 'Too many requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: Math.ceil(req.rateLimit.resetTime / 1000) // seconds
    });
  }
});

/**
 * Rate Limit Info Middleware
 * Adds rate limit info to response headers
 */
exports.rateLimitInfo = (req, res, next) => {
  if (req.rateLimit) {
    res.setHeader('X-RateLimit-Limit', req.rateLimit.limit);
    res.setHeader('X-RateLimit-Remaining', req.rateLimit.remaining);
    res.setHeader('X-RateLimit-Reset', new Date(req.rateLimit.resetTime).toISOString());
  }
  next();
};

/**
 * Bypass Rate Limit for Testing
 * Use only in development/testing
 */
exports.bypassLimiter = (req, res, next) => {
  if (process.env.NODE_ENV === 'test') {
    return next();
  }
  next();
};

/**
 * Custom Key Generator
 * Generate rate limit key based on user ID instead of IP
 */
exports.userBasedLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise use IP
    return req.user?._id?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Too many requests from this account, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Rate Limit Error Handler
 */
exports.rateLimitErrorHandler = (err, req, res, next) => {
  if (err.status === 429) {
    return res.status(429).json({
      success: false,
      message: 'Too many requests, please try again later.',
      retryAfter: err.retryAfter || 'unknown'
    });
  }
  next(err);
};

module.exports = exports;