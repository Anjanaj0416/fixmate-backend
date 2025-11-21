/**
 * Helper Utility Functions
 * Common helper functions used across the application
 */

const crypto = require('crypto');

/**
 * Generate random string
 */
const generateRandomString = (length = 32) => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate unique booking ID
 */
const generateBookingId = () => {
  const prefix = 'BK';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Generate unique payment ID
 */
const generatePaymentId = () => {
  const prefix = 'PAY';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}${timestamp}${random}`;
};

/**
 * Generate unique worker ID
 */
const generateWorkerId = () => {
  const prefix = 'WM';
  const random = Math.random().toString(36).substring(2, 10).toUpperCase();
  const timestamp = Date.now().toString(36).substring(-4).toUpperCase();
  return `${prefix}_${random}${timestamp}`;
};

/**
 * Format currency (LKR)
 */
const formatCurrency = (amount, includeSymbol = true) => {
  const formatted = parseFloat(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return includeSymbol ? `LKR ${formatted}` : formatted;
};

/**
 * Format date
 */
const formatDate = (date, format = 'full') => {
  const d = new Date(date);
  
  const options = {
    full: {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    },
    date: {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    },
    short: {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    },
    time: {
      hour: '2-digit',
      minute: '2-digit'
    }
  };
  
  return d.toLocaleString('en-US', options[format] || options.full);
};

/**
 * Format relative time (e.g., "2 hours ago")
 */
const formatRelativeTime = (date) => {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);
  
  if (diffSec < 60) return 'just now';
  if (diffMin < 60) return `${diffMin} minute${diffMin > 1 ? 's' : ''} ago`;
  if (diffHour < 24) return `${diffHour} hour${diffHour > 1 ? 's' : ''} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
  if (diffWeek < 4) return `${diffWeek} week${diffWeek > 1 ? 's' : ''} ago`;
  if (diffMonth < 12) return `${diffMonth} month${diffMonth > 1 ? 's' : ''} ago`;
  return `${diffYear} year${diffYear > 1 ? 's' : ''} ago`;
};

/**
 * Calculate distance between two points (Haversine formula)
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
};

/**
 * Convert degrees to radians
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Calculate percentage
 */
const calculatePercentage = (value, total) => {
  if (total === 0) return 0;
  return Math.round((value / total) * 100 * 10) / 10;
};

/**
 * Calculate platform fee
 */
const calculatePlatformFee = (amount, feePercentage = 10) => {
  const fee = (amount * feePercentage) / 100;
  return {
    platformFee: Math.round(fee * 100) / 100,
    workerAmount: Math.round((amount - fee) * 100) / 100,
    totalAmount: Math.round(amount * 100) / 100
  };
};

/**
 * Paginate array
 */
const paginateArray = (array, page = 1, limit = 10) => {
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  
  return {
    data: array.slice(startIndex, endIndex),
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(array.length / limit),
      totalItems: array.length,
      itemsPerPage: limit,
      hasNextPage: endIndex < array.length,
      hasPrevPage: page > 1
    }
  };
};

/**
 * Build pagination object for MongoDB
 */
const buildPaginationQuery = (page = 1, limit = 10) => {
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  
  return {
    skip: (pageNum - 1) * limitNum,
    limit: limitNum
  };
};

/**
 * Format pagination metadata
 */
const formatPaginationMeta = (totalItems, page, limit) => {
  const totalPages = Math.ceil(totalItems / limit);
  
  return {
    currentPage: parseInt(page),
    totalPages,
    totalItems,
    itemsPerPage: parseInt(limit),
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
};

/**
 * Sleep/delay function
 */
const sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Retry function with exponential backoff
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelay = 1000) => {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await sleep(delay);
      }
    }
  }
  
  throw lastError;
};

/**
 * Chunk array into smaller arrays
 */
const chunkArray = (array, size) => {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
};

/**
 * Remove duplicates from array
 */
const removeDuplicates = (array) => {
  return [...new Set(array)];
};

/**
 * Group array by key
 */
const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const group = item[key];
    if (!result[group]) {
      result[group] = [];
    }
    result[group].push(item);
    return result;
  }, {});
};

/**
 * Sort array by key
 */
const sortBy = (array, key, order = 'asc') => {
  return array.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];
    
    if (order === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });
};

/**
 * Deep clone object
 */
const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

/**
 * Merge objects
 */
const mergeObjects = (...objects) => {
  return Object.assign({}, ...objects);
};

/**
 * Pick specific fields from object
 */
const pick = (obj, fields) => {
  const result = {};
  fields.forEach(field => {
    if (obj.hasOwnProperty(field)) {
      result[field] = obj[field];
    }
  });
  return result;
};

/**
 * Omit specific fields from object
 */
const omit = (obj, fields) => {
  const result = { ...obj };
  fields.forEach(field => {
    delete result[field];
  });
  return result;
};

/**
 * Truncate string
 */
const truncate = (str, length = 100, suffix = '...') => {
  if (str.length <= length) return str;
  return str.substring(0, length).trim() + suffix;
};

/**
 * Capitalize first letter
 */
const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Capitalize words
 */
const capitalizeWords = (str) => {
  return str.split(' ').map(word => capitalize(word)).join(' ');
};

/**
 * Convert to slug
 */
const slugify = (str) => {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/--+/g, '-')
    .trim();
};

/**
 * Generate hash
 */
const generateHash = (data) => {
  return crypto.createHash('sha256').update(data).digest('hex');
};

/**
 * Mask sensitive data
 */
const maskEmail = (email) => {
  const [username, domain] = email.split('@');
  const maskedUsername = username.substring(0, 2) + '*'.repeat(username.length - 2);
  return `${maskedUsername}@${domain}`;
};

const maskPhoneNumber = (phone) => {
  return phone.substring(0, 4) + '*'.repeat(phone.length - 6) + phone.substring(phone.length - 2);
};

/**
 * Check if object is empty
 */
const isEmpty = (obj) => {
  if (obj === null || obj === undefined) return true;
  if (Array.isArray(obj)) return obj.length === 0;
  if (typeof obj === 'object') return Object.keys(obj).length === 0;
  if (typeof obj === 'string') return obj.trim().length === 0;
  return false;
};

/**
 * Get random element from array
 */
const getRandomElement = (array) => {
  return array[Math.floor(Math.random() * array.length)];
};

/**
 * Shuffle array
 */
const shuffleArray = (array) => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

/**
 * Generate OTP
 */
const generateOTP = (length = 6) => {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * 10)];
  }
  return otp;
};

/**
 * Convert time to minutes
 */
const timeToMinutes = (time) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Convert minutes to time
 */
const minutesToTime = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
};

/**
 * Get date range
 */
const getDateRange = (period = 'today') => {
  const now = new Date();
  let startDate, endDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
      break;
    case 'yesterday':
      startDate = new Date(now.setDate(now.getDate() - 1));
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'week':
      startDate = new Date(now.setDate(now.getDate() - 7));
      endDate = new Date();
      break;
    case 'month':
      startDate = new Date(now.setMonth(now.getMonth() - 1));
      endDate = new Date();
      break;
    case 'year':
      startDate = new Date(now.setFullYear(now.getFullYear() - 1));
      endDate = new Date();
      break;
    default:
      startDate = new Date(now.setHours(0, 0, 0, 0));
      endDate = new Date(now.setHours(23, 59, 59, 999));
  }
  
  return { startDate, endDate };
};

/**
 * Format phone number for display
 */
const formatPhoneNumber = (phone) => {
  // Convert +94712345678 to 071 234 5678
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('94')) {
    const local = '0' + cleaned.substring(2);
    return local.replace(/(\d{3})(\d{3})(\d{4})/, '$1 $2 $3');
  }
  return phone;
};

/**
 * Calculate average rating
 */
const calculateAverageRating = (ratings) => {
  if (!ratings || ratings.length === 0) return 0;
  const sum = ratings.reduce((acc, rating) => acc + rating, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
};

/**
 * Get initials from name
 */
const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 2);
};

/**
 * Debounce function
 */
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

/**
 * Throttle function
 */
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

module.exports = {
  // ID Generation
  generateRandomString,
  generateBookingId,
  generatePaymentId,
  generateWorkerId,
  generateOTP,
  generateHash,
  
  // Formatting
  formatCurrency,
  formatDate,
  formatRelativeTime,
  formatPhoneNumber,
  
  // Calculations
  calculateDistance,
  calculatePercentage,
  calculatePlatformFee,
  calculateAverageRating,
  
  // Pagination
  paginateArray,
  buildPaginationQuery,
  formatPaginationMeta,
  
  // Array Operations
  chunkArray,
  removeDuplicates,
  groupBy,
  sortBy,
  shuffleArray,
  getRandomElement,
  
  // Object Operations
  deepClone,
  mergeObjects,
  pick,
  omit,
  isEmpty,
  
  // String Operations
  truncate,
  capitalize,
  capitalizeWords,
  slugify,
  getInitials,
  
  // Security
  maskEmail,
  maskPhoneNumber,
  
  // Time Operations
  timeToMinutes,
  minutesToTime,
  getDateRange,
  
  // Async Operations
  sleep,
  retryWithBackoff,
  debounce,
  throttle,
  
  // Conversion
  toRadians
};