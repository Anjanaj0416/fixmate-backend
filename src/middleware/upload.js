const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure upload directory exists
const uploadDir = './uploads';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/**
 * Storage Configuration
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Organize by upload type
    let folder = 'others';
    
    if (file.fieldname === 'profileImage') {
      folder = 'profiles';
    } else if (file.fieldname === 'portfolioImage') {
      folder = 'portfolios';
    } else if (file.fieldname === 'problemImage') {
      folder = 'problems';
    } else if (file.fieldname === 'certificationImage') {
      folder = 'certifications';
    } else if (file.fieldname === 'reviewImage') {
      folder = 'reviews';
    } else if (file.fieldname === 'chatImage') {
      folder = 'chat';
    }

    const destPath = path.join(uploadDir, folder);
    
    // Create folder if it doesn't exist
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }

    cb(null, destPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const filename = file.fieldname + '-' + uniqueSuffix + ext;
    cb(null, filename);
  }
});

/**
 * File Filter - Accept only certain file types
 */
const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = /jpeg|jpg|png|gif|webp|pdf/;
  
  // Check extension
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  
  // Check mime type
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
 * Memory Storage (for base64 conversion or immediate processing)
 */
const memoryStorage = multer.memoryStorage();

const memoryUpload = multer({
  storage: memoryStorage,
  limits: {
    fileSize: 10 * 1024 * 1024
  },
  fileFilter: imageFileFilter
});

/**
 * Upload Middleware Variants
 */

// Single file upload
exports.uploadSingle = (fieldName) => {
  return upload.single(fieldName);
};

// Multiple files upload (same field)
exports.uploadMultiple = (fieldName, maxCount = 5) => {
  return upload.array(fieldName, maxCount);
};

// Multiple files upload (different fields)
exports.uploadFields = (fields) => {
  return upload.fields(fields);
};

// Profile image upload
exports.uploadProfileImage = imageUpload.single('profileImage');

// Portfolio images upload
exports.uploadPortfolioImages = imageUpload.array('portfolioImages', 10);

// Problem image upload
exports.uploadProblemImage = imageUpload.single('problemImage');

// Multiple problem images
exports.uploadMultipleProblemImages = imageUpload.array('problemImages', 5);

// Certification upload
exports.uploadCertification = pdfUpload.single('certificationImage');

// Review images
exports.uploadReviewImages = imageUpload.array('reviewImages', 3);

// Chat image
exports.uploadChatImage = imageUpload.single('chatImage');

// Memory upload (for AI processing)
exports.uploadToMemory = memoryUpload.single('image');

/**
 * File Processing Middleware
 */

// Convert uploaded file to base64
exports.convertToBase64 = (req, res, next) => {
  if (!req.file) {
    return next();
  }

  try {
    const fileBuffer = fs.readFileSync(req.file.path);
    const base64 = fileBuffer.toString('base64');
    req.file.base64 = `data:${req.file.mimetype};base64,${base64}`;
    next();
  } catch (error) {
    next(error);
  }
};

// Generate file URL
exports.generateFileUrl = (req, res, next) => {
  if (!req.file && !req.files) {
    return next();
  }

  const baseUrl = `${req.protocol}://${req.get('host')}`;

  if (req.file) {
    req.file.url = `${baseUrl}/${req.file.path.replace(/\\/g, '/')}`;
  }

  if (req.files) {
    if (Array.isArray(req.files)) {
      req.files.forEach(file => {
        file.url = `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
      });
    } else {
      Object.keys(req.files).forEach(key => {
        req.files[key].forEach(file => {
          file.url = `${baseUrl}/${file.path.replace(/\\/g, '/')}`;
        });
      });
    }
  }

  next();
};

// Delete uploaded file (cleanup on error)
exports.deleteUploadedFile = (filePath) => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        console.error('Error deleting file:', err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Delete multiple uploaded files
exports.deleteUploadedFiles = (filePaths) => {
  return Promise.all(
    filePaths.map(filePath => exports.deleteUploadedFile(filePath))
  );
};

// Cleanup middleware (delete files on error)
exports.cleanupOnError = (err, req, res, next) => {
  if (req.file) {
    exports.deleteUploadedFile(req.file.path).catch(console.error);
  }

  if (req.files) {
    const files = Array.isArray(req.files) 
      ? req.files 
      : Object.values(req.files).flat();
    
    const filePaths = files.map(file => file.path);
    exports.deleteUploadedFiles(filePaths).catch(console.error);
  }

  next(err);
};

/**
 * Image Validation Middleware
 */
exports.validateImageDimensions = (minWidth, minHeight, maxWidth, maxHeight) => {
  return async (req, res, next) => {
    if (!req.file || !req.file.mimetype.startsWith('image/')) {
      return next();
    }

    try {
      const sharp = require('sharp');
      const metadata = await sharp(req.file.path).metadata();

      if (metadata.width < minWidth || metadata.height < minHeight) {
        await exports.deleteUploadedFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: `Image dimensions must be at least ${minWidth}x${minHeight}px`
        });
      }

      if (metadata.width > maxWidth || metadata.height > maxHeight) {
        await exports.deleteUploadedFile(req.file.path);
        return res.status(400).json({
          success: false,
          message: `Image dimensions must not exceed ${maxWidth}x${maxHeight}px`
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Image Optimization Middleware
 */
exports.optimizeImage = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const sharp = require('sharp');
    const optimizedPath = req.file.path.replace(/\.[^.]+$/, '-optimized.jpg');

    await sharp(req.file.path)
      .resize(1920, 1920, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(optimizedPath);

    // Delete original and replace with optimized
    await exports.deleteUploadedFile(req.file.path);
    req.file.path = optimizedPath;
    req.file.filename = path.basename(optimizedPath);

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Thumbnail Generation Middleware
 */
exports.generateThumbnail = async (req, res, next) => {
  if (!req.file || !req.file.mimetype.startsWith('image/')) {
    return next();
  }

  try {
    const sharp = require('sharp');
    const thumbnailPath = req.file.path.replace(/\.[^.]+$/, '-thumb.jpg');

    await sharp(req.file.path)
      .resize(300, 300, {
        fit: 'cover'
      })
      .jpeg({ quality: 70 })
      .toFile(thumbnailPath);

    req.file.thumbnailPath = thumbnailPath;
    req.file.thumbnail = `${req.protocol}://${req.get('host')}/${thumbnailPath.replace(/\\/g, '/')}`;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = exports;