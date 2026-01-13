const multer = require('multer');
const path = require('path');
const fs = require('fs');

/**
 * Multer Upload Middleware Configuration
 * Handles file uploads for various features
 * 
 * ✅ FIXED: Proper path handling and upload directory management
 */

// ============================================
// UPLOAD DIRECTORY SETUP
// ============================================

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('📁 Created uploads directory:', uploadDir);
}

// ============================================
// STORAGE CONFIGURATION
// ============================================

/**
 * Disk Storage Configuration
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

/**
 * Memory Storage (for base64 conversion or immediate processing)
 */
const memoryStorage = multer.memoryStorage();

// ============================================
// FILE FILTERS
// ============================================

/**
 * Combined File Filter (Images and PDFs)
 */
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) and PDF files are allowed'));
  }
};

/**
 * Image-only File Filter
 */
const imageFileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, JPG, PNG, GIF, WEBP) are allowed'));
  }
};

/**
 * PDF-only File Filter
 */
const pdfFileFilter = (req, file, cb) => {
  const allowedTypes = /pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = file.mimetype === 'application/pdf';

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only PDF files are allowed'));
  }
};

// ============================================
// UPLOAD CONFIGURATIONS
// ============================================

/**
 * Basic Upload Configuration
 */
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Maximum 10 files
  },
  fileFilter: fileFilter
});

/**
 * Image Upload Configuration
 */
const imageUpload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit for images
    files: 5
  },
  fileFilter: imageFileFilter
});

/**
 * PDF Upload Configuration
 */
const pdfUpload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit for PDFs
    files: 3
  },
  fileFilter: pdfFileFilter
});

/**
 * Memory Upload Configuration
 */
const memoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: imageFileFilter
});

// ============================================
// EXPORT MIDDLEWARE FUNCTIONS
// ============================================

/**
 * Generic Upload Middleware
 */
exports.uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

exports.uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

exports.uploadFields = (fields) => {
  return upload.fields(fields);
};

/**
 * Profile Image Upload
 */
exports.uploadProfileImage = imageUpload.single('profileImage');

/**
 * Portfolio Images Upload
 */
exports.uploadPortfolioImages = imageUpload.array('portfolioImages', 10);

/**
 * Problem Image Upload
 */
exports.uploadProblemImage = imageUpload.single('problemImage');

/**
 * Multiple Problem Images
 */
exports.uploadMultipleProblemImages = imageUpload.array('problemImages', 5);

/**
 * Certification Upload
 */
exports.uploadCertification = pdfUpload.single('certificationImage');

/**
 * Review Images Upload
 * ✅ FIXED: Proper field name matching frontend 'images'
 */
exports.uploadReviewImages = imageUpload.array('images', 5);

/**
 * Chat Image Upload
 */
exports.uploadChatImage = imageUpload.single('chatImage');

/**
 * Memory Upload (for AI processing)
 */
exports.uploadToMemory = memoryUpload.single('image');

// ============================================
// FILE PROCESSING MIDDLEWARE
// ============================================

/**
 * Convert uploaded file to base64
 */
exports.convertToBase64 = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const fileContent = fs.readFileSync(req.file.path);
    const base64String = fileContent.toString('base64');
    req.file.base64 = base64String;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Clean up uploaded files after processing
 */
exports.cleanupFiles = (req, res, next) => {
  if (req.file) {
    fs.unlinkSync(req.file.path);
  }
  
  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    } else {
      Object.keys(req.files).forEach(key => {
        req.files[key].forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      });
    }
  }
  
  next();
};

/**
 * Error Handling Middleware for Multer
 */
exports.handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size is too large. Maximum size is 5MB for images and 10MB for PDFs.'
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
        message: 'Unexpected file field.'
      });
    }
  }
  
  if (err) {
    return res.status(400).json({
      success: false,
      message: err.message || 'File upload error'
    });
  }
  
  next();
};

/**
 * Validate uploaded files
 */
exports.validateFiles = (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    return next();
  }

  // Check if all files exist
  for (const file of req.files) {
    if (!fs.existsSync(file.path)) {
      return res.status(400).json({
        success: false,
        message: `File not found: ${file.originalname}`
      });
    }
  }

  next();
};

module.exports = exports;