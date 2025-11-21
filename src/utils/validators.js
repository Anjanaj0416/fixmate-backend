/**
 * Validation Utility Functions
 * Common validation functions used across the application
 */

/**
 * Validate email format
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone number (Sri Lankan format)
 */
const isValidPhoneNumber = (phone) => {
  // Sri Lankan phone format: +94xxxxxxxxx or 0xxxxxxxxx
  const phoneRegex = /^(\+94|0)[0-9]{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Validate password strength
 * Requirements: 
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character
 */
const isValidPassword = (password) => {
  if (password.length < 8) return false;
  
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  
  return hasUppercase && hasLowercase && hasNumber && hasSpecialChar;
};

/**
 * Get password strength level
 */
const getPasswordStrength = (password) => {
  let strength = 0;
  
  if (password.length >= 8) strength++;
  if (password.length >= 12) strength++;
  if (/[a-z]/.test(password)) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) strength++;
  
  if (strength <= 2) return 'weak';
  if (strength <= 4) return 'medium';
  return 'strong';
};

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id);
};

/**
 * Validate coordinates
 */
const isValidCoordinates = (latitude, longitude) => {
  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);
  
  if (isNaN(lat) || isNaN(lng)) return false;
  if (lat < -90 || lat > 90) return false;
  if (lng < -180 || lng > 180) return false;
  
  return true;
};

/**
 * Validate date is in future
 */
const isFutureDate = (date) => {
  return new Date(date) > new Date();
};

/**
 * Validate date is in past
 */
const isPastDate = (date) => {
  return new Date(date) < new Date();
};

/**
 * Validate date range
 */
const isValidDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return start < end;
};

/**
 * Validate URL format
 */
const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate rating (1-5)
 */
const isValidRating = (rating) => {
  const num = parseFloat(rating);
  return !isNaN(num) && num >= 1 && num <= 5;
};

/**
 * Validate price/amount
 */
const isValidAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num >= 0;
};

/**
 * Validate postal code (Sri Lankan format)
 */
const isValidPostalCode = (code) => {
  // Sri Lankan postal codes are 5 digits
  return /^[0-9]{5}$/.test(code);
};

/**
 * Validate file type
 */
const isValidFileType = (mimetype, allowedTypes) => {
  return allowedTypes.includes(mimetype);
};

/**
 * Validate file size
 */
const isValidFileSize = (size, maxSize) => {
  return size <= maxSize;
};

/**
 * Sanitize string (remove HTML tags and special characters)
 */
const sanitizeString = (str) => {
  if (!str) return '';
  return str
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[^\w\s@.-]/gi, '') // Remove special characters except @.-
    .trim();
};

/**
 * Sanitize HTML (allow only safe tags)
 */
const sanitizeHtml = (html) => {
  if (!html) return '';
  
  const allowedTags = ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'a'];
  
  // Simple HTML sanitization (in production, use a library like DOMPurify)
  let sanitized = html;
  const tagRegex = /<(\/?[a-z]+)[^>]*>/gi;
  
  sanitized = sanitized.replace(tagRegex, (match, tag) => {
    const cleanTag = tag.toLowerCase().replace('/', '');
    if (allowedTags.includes(cleanTag)) {
      return match;
    }
    return '';
  });
  
  return sanitized;
};

/**
 * Validate username
 */
const isValidUsername = (username) => {
  // 3-20 characters, alphanumeric and underscore only
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
};

/**
 * Validate NIC (National Identity Card - Sri Lankan)
 */
const isValidNIC = (nic) => {
  // Old format: 9 digits + V (e.g., 123456789V)
  // New format: 12 digits (e.g., 199012345678)
  return /^([0-9]{9}[VvXx]|[0-9]{12})$/.test(nic);
};

/**
 * Validate business registration number (Sri Lankan)
 */
const isValidBusinessRegNo = (regNo) => {
  // Basic validation - alphanumeric with optional hyphens
  return /^[A-Z0-9-]{5,20}$/.test(regNo);
};

/**
 * Validate time format (HH:MM)
 */
const isValidTimeFormat = (time) => {
  return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(time);
};

/**
 * Validate service category
 */
const isValidServiceCategory = (category) => {
  const validCategories = [
    'plumbing',
    'electrical',
    'carpentry',
    'painting',
    'ac_repair',
    'appliance_repair',
    'cleaning',
    'pest_control',
    'gardening',
    'masonry',
    'roofing',
    'welding'
  ];
  return validCategories.includes(category.toLowerCase());
};

/**
 * Validate booking status
 */
const isValidBookingStatus = (status) => {
  const validStatuses = [
    'pending',
    'accepted',
    'rejected',
    'in_progress',
    'completed',
    'cancelled'
  ];
  return validStatuses.includes(status.toLowerCase());
};

/**
 * Validate payment status
 */
const isValidPaymentStatus = (status) => {
  const validStatuses = [
    'pending',
    'processing',
    'completed',
    'failed',
    'refunded'
  ];
  return validStatuses.includes(status.toLowerCase());
};

/**
 * Validate user role
 */
const isValidUserRole = (role) => {
  const validRoles = ['customer', 'worker', 'admin'];
  return validRoles.includes(role.toLowerCase());
};

/**
 * Validate array is not empty
 */
const isNonEmptyArray = (arr) => {
  return Array.isArray(arr) && arr.length > 0;
};

/**
 * Validate string length
 */
const isValidLength = (str, min, max) => {
  if (typeof str !== 'string') return false;
  const length = str.trim().length;
  return length >= min && length <= max;
};

/**
 * Validate required fields
 */
const validateRequiredFields = (obj, requiredFields) => {
  const missing = [];
  
  for (const field of requiredFields) {
    if (obj[field] === undefined || obj[field] === null || obj[field] === '') {
      missing.push(field);
    }
  }
  
  return {
    isValid: missing.length === 0,
    missingFields: missing
  };
};

/**
 * Validate object has allowed fields only
 */
const hasOnlyAllowedFields = (obj, allowedFields) => {
  const objFields = Object.keys(obj);
  const invalidFields = objFields.filter(field => !allowedFields.includes(field));
  
  return {
    isValid: invalidFields.length === 0,
    invalidFields
  };
};

/**
 * Validate pagination parameters
 */
const isValidPagination = (page, limit) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  return !isNaN(pageNum) && !isNaN(limitNum) && 
         pageNum > 0 && limitNum > 0 && limitNum <= 100;
};

/**
 * Validate sort order
 */
const isValidSortOrder = (order) => {
  return ['asc', 'desc', '1', '-1'].includes(order?.toString().toLowerCase());
};

/**
 * Validate urgency level
 */
const isValidUrgency = (urgency) => {
  return ['low', 'medium', 'high'].includes(urgency?.toLowerCase());
};

/**
 * Custom validation function builder
 */
const createValidator = (validationFn, errorMessage) => {
  return (value) => {
    const isValid = validationFn(value);
    return {
      isValid,
      error: isValid ? null : errorMessage
    };
  };
};

module.exports = {
  // Email & Auth
  isValidEmail,
  isValidPhoneNumber,
  isValidPassword,
  getPasswordStrength,
  isValidUsername,
  
  // IDs
  isValidObjectId,
  isValidNIC,
  isValidBusinessRegNo,
  
  // Location
  isValidCoordinates,
  isValidPostalCode,
  
  // Date & Time
  isFutureDate,
  isPastDate,
  isValidDateRange,
  isValidTimeFormat,
  
  // Numbers
  isValidRating,
  isValidAmount,
  
  // Files
  isValidFileType,
  isValidFileSize,
  
  // Strings
  sanitizeString,
  sanitizeHtml,
  isValidLength,
  isValidUrl,
  
  // Categories & Status
  isValidServiceCategory,
  isValidBookingStatus,
  isValidPaymentStatus,
  isValidUserRole,
  isValidUrgency,
  
  // Arrays & Objects
  isNonEmptyArray,
  validateRequiredFields,
  hasOnlyAllowedFields,
  
  // Pagination
  isValidPagination,
  isValidSortOrder,
  
  // Custom
  createValidator
};