const { body, param, query, validationResult } = require('express-validator');

/**
 * Validate Request Middleware
 * Checks if all required fields are present in request
 */
exports.validateRequest = (requiredFields) => {
  return (req, res, next) => {
    const errors = [];
    
    requiredFields.forEach(field => {
      const [type, ...path] = field.split('.');
      let value = req[type];
      
      // Navigate through nested path
      for (const key of path) {
        value = value?.[key];
      }
      
      if (value === undefined || value === null || value === '') {
        errors.push(`${field} is required`);
      }
    });
    
    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }
    
    next();
  };
};

/**
 * Handle Validation Results
 * Processes express-validator validation results
 */
exports.handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const extractedErrors = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value
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
 * Auth Validation Rules
 */
exports.registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  body('fullName')
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long'),
  body('phoneNumber')
    .matches(/^[0-9]{10,}$/)
    .withMessage('Please provide a valid phone number'),
  body('role')
    .isIn(['customer', 'worker'])
    .withMessage('Role must be either customer or worker')
];

exports.loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * User Validation Rules
 */
exports.updateProfileValidation = [
  body('fullName')
    .optional()
    .trim()
    .isLength({ min: 2 })
    .withMessage('Full name must be at least 2 characters long'),
  body('phoneNumber')
    .optional()
    .matches(/^[0-9]{10,}$/)
    .withMessage('Please provide a valid phone number'),
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Booking Validation Rules
 */
exports.createBookingValidation = [
  body('workerId')
    .notEmpty()
    .withMessage('Worker ID is required')
    .isMongoId()
    .withMessage('Invalid worker ID'),
  body('serviceType')
    .notEmpty()
    .withMessage('Service type is required')
    .isIn([
      'plumbing', 'electrical', 'carpentry', 'painting', 
      'masonry', 'welding', 'air-conditioning', 'appliance-repair',
      'landscaping', 'roofing', 'flooring', 'pest-control',
      'cleaning', 'moving', 'other'
    ])
    .withMessage('Invalid service type'),
  body('problemDescription')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Problem description must be between 10 and 1000 characters'),
  body('scheduledDate')
    .isISO8601()
    .withMessage('Please provide a valid date')
    .custom((value) => {
      if (new Date(value) < new Date()) {
        throw new Error('Scheduled date cannot be in the past');
      }
      return true;
    }),
  body('serviceLocation.address')
    .notEmpty()
    .withMessage('Service address is required'),
  body('customerBudget')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Budget must be a positive number')
];

/**
 * Review Validation Rules
 */
exports.createReviewValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),
  body('workerId')
    .notEmpty()
    .withMessage('Worker ID is required')
    .isMongoId()
    .withMessage('Invalid worker ID'),
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('comment')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Comment must be between 10 and 500 characters')
];

/**
 * Payment Validation Rules
 */
exports.createPaymentValidation = [
  body('bookingId')
    .notEmpty()
    .withMessage('Booking ID is required')
    .isMongoId()
    .withMessage('Invalid booking ID'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('paymentMethod')
    .isIn(['cash', 'card', 'bank-transfer', 'mobile-wallet'])
    .withMessage('Invalid payment method')
];

/**
 * Worker Profile Validation Rules
 */
exports.updateWorkerProfileValidation = [
  body('specializations')
    .optional()
    .isArray({ min: 1 })
    .withMessage('At least one specialization is required'),
  body('experience')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Experience must be a positive number'),
  body('hourlyRate')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Hourly rate must be a positive number'),
  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio must not exceed 500 characters')
];

/**
 * Message Validation Rules
 */
exports.sendMessageValidation = [
  body('receiverId')
    .notEmpty()
    .withMessage('Receiver ID is required')
    .isMongoId()
    .withMessage('Invalid receiver ID'),
  body('message')
    .trim()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Message must be between 1 and 1000 characters')
];

/**
 * ID Parameter Validation
 */
exports.validateIdParam = [
  param('id')
    .isMongoId()
    .withMessage('Invalid ID format')
];

/**
 * Pagination Validation
 */
exports.validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Email Validation
 */
exports.validateEmail = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Phone Number Validation
 */
exports.validatePhoneNumber = [
  body('phoneNumber')
    .matches(/^[0-9]{10,}$/)
    .withMessage('Please provide a valid phone number')
];

/**
 * Date Range Validation
 */
exports.validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('Invalid end date format')
    .custom((endDate, { req }) => {
      if (req.query.startDate && new Date(endDate) < new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    })
];

/**
 * Location Validation
 */
exports.validateLocation = [
  body('location.coordinates.longitude')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Invalid longitude'),
  body('location.coordinates.latitude')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Invalid latitude')
];

/**
 * Image Upload Validation
 */
exports.validateImageUpload = [
  body('imageUrl')
    .optional()
    .isURL()
    .withMessage('Invalid image URL'),
  body('imageBase64')
    .optional()
    .custom((value) => {
      // Check if it's a valid base64 string
      const base64Regex = /^data:image\/(png|jpg|jpeg|gif|webp);base64,/;
      if (!base64Regex.test(value)) {
        throw new Error('Invalid base64 image format');
      }
      return true;
    })
];

/**
 * Custom Validators
 */
exports.customValidators = {
  // Check if value is a valid MongoDB ObjectId
  isValidObjectId: (value) => {
    const ObjectId = require('mongoose').Types.ObjectId;
    return ObjectId.isValid(value);
  },

  // Check if date is in the future
  isFutureDate: (value) => {
    return new Date(value) > new Date();
  },

  // Check if phone number is valid Sri Lankan number
  isSriLankanPhoneNumber: (value) => {
    return /^(?:\+94|0)[0-9]{9}$/.test(value);
  },

  // Check if URL is valid
  isValidURL: (value) => {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  },

  // Sanitize HTML to prevent XSS
  sanitizeHTML: (value) => {
    return value.replace(/<[^>]*>/g, '');
  }
};

/**
 * Sanitization Middleware
 * Removes potentially harmful content from inputs
 */
exports.sanitizeInputs = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      if (typeof req.body[key] === 'string') {
        // Remove HTML tags
        req.body[key] = req.body[key].replace(/<[^>]*>/g, '');
        // Trim whitespace
        req.body[key] = req.body[key].trim();
      }
    });
  }

  // Sanitize query parameters
  if (req.query) {
    Object.keys(req.query).forEach(key => {
      if (typeof req.query[key] === 'string') {
        req.query[key] = req.query[key].replace(/<[^>]*>/g, '');
        req.query[key] = req.query[key].trim();
      }
    });
  }

  next();
};