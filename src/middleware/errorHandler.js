/**
 * Global Error Handler Middleware
 * Handles all errors in the application and sends appropriate responses
 */

/**
 * Custom Error Class
 */
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * MongoDB/Mongoose Error Handlers
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate field value: ${field} = "${value}". Please use another value.`;
  return new AppError(message, 409);
};

const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map(el => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * JWT Error Handlers
 */
const handleJWTError = () => {
  return new AppError('Invalid token. Please login again.', 401);
};

const handleJWTExpiredError = () => {
  return new AppError('Your token has expired. Please login again.', 401);
};

/**
 * Firebase Error Handlers
 */
const handleFirebaseError = (err) => {
  const errorCode = err.code;
  
  const errorMessages = {
    'auth/id-token-expired': 'Token has expired. Please login again.',
    'auth/id-token-revoked': 'Token has been revoked. Please login again.',
    'auth/invalid-id-token': 'Invalid token. Please login again.',
    'auth/user-not-found': 'User not found.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/email-already-exists': 'Email already in use.',
    'auth/phone-number-already-exists': 'Phone number already in use.',
    'auth/invalid-email': 'Invalid email address.',
    'auth/invalid-password': 'Password must be at least 6 characters.',
    'auth/weak-password': 'Password is too weak.',
    'auth/too-many-requests': 'Too many requests. Please try again later.'
  };

  const message = errorMessages[errorCode] || 'Authentication failed.';
  return new AppError(message, 401);
};

/**
 * Development Error Response
 */
const sendErrorDev = (err, res) => {
  res.status(err.statusCode || 500).json({
    success: false,
    status: err.status,
    error: err,
    message: err.message,
    stack: err.stack
  });
};

/**
 * Production Error Response
 */
const sendErrorProd = (err, res) => {
  // Operational, trusted error: send message to client
  if (err.isOperational) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message
    });
  } 
  // Programming or other unknown error: don't leak error details
  else {
    // Log error for debugging
    console.error('ERROR 💥', err);

    // Send generic message
    res.status(500).json({
      success: false,
      message: 'Something went wrong. Please try again later.'
    });
  }
};

/**
 * Main Error Handler
 */
const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  if (process.env.NODE_ENV === 'development') {
    sendErrorDev(err, res);
  } else if (process.env.NODE_ENV === 'production') {
    let error = { ...err };
    error.message = err.message;

    // Handle specific error types
    if (err.name === 'CastError') error = handleCastErrorDB(error);
    if (err.code === 11000) error = handleDuplicateFieldsDB(error);
    if (err.name === 'ValidationError') error = handleValidationErrorDB(error);
    if (err.name === 'JsonWebTokenError') error = handleJWTError();
    if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
    if (err.code && err.code.startsWith('auth/')) error = handleFirebaseError(error);

    sendErrorProd(error, res);
  }
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  const error = new AppError(`Cannot find ${req.originalUrl} on this server`, 404);
  next(error);
};

/**
 * Unhandled Promise Rejection Handler
 */
const handleUnhandledRejection = () => {
  process.on('unhandledRejection', (err) => {
    console.error('UNHANDLED REJECTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
  });
};

/**
 * Uncaught Exception Handler
 */
const handleUncaughtException = () => {
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
    console.error(err.name, err.message);
    process.exit(1);
  });
};

/**
 * Validation Error Handler
 * For express-validator errors
 */
const handleValidationErrors = (req, res, next) => {
  const { validationResult } = require('express-validator');
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.param,
      message: err.msg
    }));

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: extractedErrors
    });
  }
  
  next();
};

/**
 * Rate Limit Error Handler
 */
const handleRateLimitError = (req, res) => {
  return res.status(429).json({
    success: false,
    message: 'Too many requests from this IP. Please try again later.',
    retryAfter: req.rateLimit?.resetTime
  });
};

/**
 * File Upload Error Handler
 */
const handleMulterError = (err, req, res, next) => {
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 10MB.'
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files uploaded.'
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field in file upload.'
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error: ' + err.message
    });
  }
  
  next(err);
};

/**
 * CORS Error Handler
 */
const handleCorsError = (err, req, res, next) => {
  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      success: false,
      message: 'CORS policy violation. Access denied.'
    });
  }
  next(err);
};

/**
 * Database Connection Error Handler
 */
const handleDBConnectionError = (err, req, res, next) => {
  if (err.name === 'MongoNetworkError' || err.name === 'MongoTimeoutError') {
    return res.status(503).json({
      success: false,
      message: 'Database connection error. Please try again later.'
    });
  }
  next(err);
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync,
  notFound,
  handleUnhandledRejection,
  handleUncaughtException,
  handleValidationErrors,
  handleRateLimitError,
  handleMulterError,
  handleCorsError,
  handleDBConnectionError
};