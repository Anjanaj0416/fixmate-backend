/**
 * Application Constants
 * All constant values used across the application
 */

// User Roles
const USER_ROLES = {
  CUSTOMER: 'customer',
  WORKER: 'worker',
  ADMIN: 'admin'
};

// Booking Status
const BOOKING_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled'
};

// Payment Status
const PAYMENT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  REFUNDED: 'refunded'
};

// Payment Methods
const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  BANK_TRANSFER: 'bank_transfer',
  MOBILE_PAYMENT: 'mobile_payment'
};

// Service Categories
const SERVICE_CATEGORIES = {
  PLUMBING: 'plumbing',
  ELECTRICAL: 'electrical',
  CARPENTRY: 'carpentry',
  PAINTING: 'painting',
  AC_REPAIR: 'ac_repair',
  APPLIANCE_REPAIR: 'appliance_repair',
  CLEANING: 'cleaning',
  PEST_CONTROL: 'pest_control',
  GARDENING: 'gardening',
  MASONRY: 'masonry',
  ROOFING: 'roofing',
  WELDING: 'welding'
};

// Notification Types
const NOTIFICATION_TYPES = {
  BOOKING: 'booking',
  MESSAGE: 'message',
  REVIEW: 'review',
  PAYMENT: 'payment',
  REMINDER: 'reminder',
  SYSTEM: 'system'
};

// Notification Priorities
const NOTIFICATION_PRIORITIES = {
  LOW: 'low',
  NORMAL: 'normal',
  HIGH: 'high',
  URGENT: 'urgent'
};

// Message Types
const MESSAGE_TYPES = {
  TEXT: 'text',
  IMAGE: 'image',
  FILE: 'file',
  LOCATION: 'location',
  SYSTEM: 'system'
};

// Review Status
const REVIEW_STATUS = {
  ACTIVE: 'active',
  FLAGGED: 'flagged',
  HIDDEN: 'hidden',
  DELETED: 'deleted'
};

// Worker Verification Status
const VERIFICATION_STATUS = {
  PENDING: 'pending',
  VERIFIED: 'verified',
  REJECTED: 'rejected'
};

// Days of Week
const DAYS_OF_WEEK = {
  MONDAY: 'monday',
  TUESDAY: 'tuesday',
  WEDNESDAY: 'wednesday',
  THURSDAY: 'thursday',
  FRIDAY: 'friday',
  SATURDAY: 'saturday',
  SUNDAY: 'sunday'
};

// Urgency Levels
const URGENCY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
};

// Quote Status
const QUOTE_STATUS = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired'
};

// Work Progress Status
const WORK_PROGRESS_STATUS = {
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed'
};

// File Upload Limits
const FILE_LIMITS = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  MAX_IMAGES_PER_PORTFOLIO: 10,
  MAX_CERTIFICATIONS: 5,
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_DOCUMENT_TYPES: ['application/pdf', 'image/jpeg', 'image/png']
};

// Pagination Defaults
const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100
};

// Rate Limiting
const RATE_LIMITS = {
  WINDOW_MS: 15 * 60 * 1000, // 15 minutes
  MAX_REQUESTS: 100,
  MESSAGE: 'Too many requests from this IP, please try again later'
};

// JWT Configuration
const JWT_CONFIG = {
  ACCESS_TOKEN_EXPIRE: '7d',
  REFRESH_TOKEN_EXPIRE: '30d'
};

// Password Requirements
const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL_CHAR: true
};

// Search Radius (in kilometers)
const SEARCH_RADIUS = {
  DEFAULT: 50,
  MIN: 1,
  MAX: 200
};

// Platform Fees
const PLATFORM_FEES = {
  PERCENTAGE: parseInt(process.env.PLATFORM_FEE_PERCENTAGE) || 10,
  MIN_AMOUNT: 50 // LKR
};

// Rating Scale
const RATING = {
  MIN: 1,
  MAX: 5,
  DEFAULT: 0
};

// Booking Time Slots
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00',
  '16:00', '17:00', '18:00', '19:00',
  '20:00'
];

// Sri Lankan Districts
const DISTRICTS = [
  'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale',
  'Nuwara Eliya', 'Galle', 'Matara', 'Hambantota',
  'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu',
  'Batticaloa', 'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam',
  'Anuradhapura', 'Polonnaruwa', 'Badulla', 'Monaragala',
  'Ratnapura', 'Kegalle'
];

// Sri Lankan Provinces
const PROVINCES = [
  'Western', 'Central', 'Southern', 'Northern',
  'Eastern', 'North Western', 'North Central',
  'Uva', 'Sabaragamuwa'
];

// Application Status
const APP_STATUS = {
  ACTIVE: 'active',
  MAINTENANCE: 'maintenance',
  SUSPENDED: 'suspended'
};

// Log Levels
const LOG_LEVELS = {
  ERROR: 'error',
  WARN: 'warn',
  INFO: 'info',
  DEBUG: 'debug'
};

// Currency
const CURRENCY = {
  CODE: 'LKR',
  SYMBOL: 'Rs.',
  NAME: 'Sri Lankan Rupee'
};

// Date Formats
const DATE_FORMATS = {
  FULL: 'YYYY-MM-DD HH:mm:ss',
  DATE_ONLY: 'YYYY-MM-DD',
  TIME_ONLY: 'HH:mm:ss',
  DISPLAY: 'DD/MM/YYYY',
  DISPLAY_WITH_TIME: 'DD/MM/YYYY HH:mm'
};

// Error Messages
const ERROR_MESSAGES = {
  UNAUTHORIZED: 'Unauthorized access',
  FORBIDDEN: 'Forbidden access',
  NOT_FOUND: 'Resource not found',
  BAD_REQUEST: 'Bad request',
  INTERNAL_ERROR: 'Internal server error',
  VALIDATION_ERROR: 'Validation error',
  DUPLICATE_ENTRY: 'Duplicate entry',
  INVALID_CREDENTIALS: 'Invalid credentials',
  TOKEN_EXPIRED: 'Token expired',
  INSUFFICIENT_PERMISSIONS: 'Insufficient permissions'
};

// Success Messages
const SUCCESS_MESSAGES = {
  CREATED: 'Resource created successfully',
  UPDATED: 'Resource updated successfully',
  DELETED: 'Resource deleted successfully',
  LOGIN_SUCCESS: 'Login successful',
  LOGOUT_SUCCESS: 'Logout successful',
  REGISTRATION_SUCCESS: 'Registration successful',
  PASSWORD_RESET: 'Password reset successful',
  EMAIL_SENT: 'Email sent successfully',
  NOTIFICATION_SENT: 'Notification sent successfully'
};

// Image Dimensions
const IMAGE_DIMENSIONS = {
  PROFILE: {
    WIDTH: 400,
    HEIGHT: 400
  },
  THUMBNAIL: {
    WIDTH: 300,
    HEIGHT: 300
  },
  PORTFOLIO: {
    WIDTH: 1200,
    HEIGHT: 900
  },
  PROBLEM: {
    WIDTH: 1920,
    HEIGHT: 1920
  }
};

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  SHORT: 60,           // 1 minute
  MEDIUM: 300,         // 5 minutes
  LONG: 3600,          // 1 hour
  DAY: 86400,          // 24 hours
  WEEK: 604800         // 7 days
};

// Validation Regex Patterns
const REGEX_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_SL: /^(\+94|0)[0-9]{9}$/,
  NIC_OLD: /^[0-9]{9}[VvXx]$/,
  NIC_NEW: /^[0-9]{12}$/,
  POSTAL_CODE_SL: /^[0-9]{5}$/,
  URL: /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/,
  BOOKING_ID: /^BK[A-Z0-9]+$/,
  PAYMENT_ID: /^PAY[A-Z0-9]+$/,
  WORKER_ID: /^WM_[A-Z0-9]+$/
};

// Social Media Links
const SOCIAL_MEDIA = {
  FACEBOOK: 'https://facebook.com/fixmate',
  TWITTER: 'https://twitter.com/fixmate',
  INSTAGRAM: 'https://instagram.com/fixmate',
  LINKEDIN: 'https://linkedin.com/company/fixmate'
};

// Contact Information
const CONTACT_INFO = {
  EMAIL: 'support@fixmate.lk',
  PHONE: '+94112345678',
  ADDRESS: 'Colombo, Sri Lanka',
  WORKING_HOURS: 'Mon-Sat: 8:00 AM - 8:00 PM'
};

// API Version
const API_VERSION = 'v1';

// Default Values
const DEFAULTS = {
  LANGUAGE: 'en',
  TIMEZONE: 'Asia/Colombo',
  COUNTRY: 'LK',
  CURRENCY: 'LKR',
  DISTANCE_UNIT: 'km'
};

// Feature Flags
const FEATURE_FLAGS = {
  AI_RECOMMENDATIONS: true,
  EMAIL_NOTIFICATIONS: true,
  PUSH_NOTIFICATIONS: true,
  SMS_NOTIFICATIONS: false,
  PAYMENT_GATEWAY: false,
  CHAT: true,
  VOICE_CALL: false,
  VIDEO_CALL: false,
  RATING_SYSTEM: true,
  BOOKING_SYSTEM: true
};

// Export all constants
module.exports = {
  // User & Roles
  USER_ROLES,
  VERIFICATION_STATUS,
  
  // Booking & Services
  BOOKING_STATUS,
  SERVICE_CATEGORIES,
  URGENCY_LEVELS,
  QUOTE_STATUS,
  WORK_PROGRESS_STATUS,
  TIME_SLOTS,
  
  // Payments
  PAYMENT_STATUS,
  PAYMENT_METHODS,
  PLATFORM_FEES,
  CURRENCY,
  
  // Notifications & Messages
  NOTIFICATION_TYPES,
  NOTIFICATION_PRIORITIES,
  MESSAGE_TYPES,
  
  // Reviews & Ratings
  REVIEW_STATUS,
  RATING,
  
  // Location
  DISTRICTS,
  PROVINCES,
  SEARCH_RADIUS,
  
  // Files & Images
  FILE_LIMITS,
  IMAGE_DIMENSIONS,
  
  // API & Configuration
  PAGINATION,
  RATE_LIMITS,
  JWT_CONFIG,
  PASSWORD_REQUIREMENTS,
  API_VERSION,
  
  // Time & Dates
  DAYS_OF_WEEK,
  DATE_FORMATS,
  CACHE_TTL,
  
  // Application
  APP_STATUS,
  LOG_LEVELS,
  DEFAULTS,
  FEATURE_FLAGS,
  
  // Messages
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  
  // Validation
  REGEX_PATTERNS,
  
  // Contact & Social
  SOCIAL_MEDIA,
  CONTACT_INFO
};