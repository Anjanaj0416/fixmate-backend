const cloudinary = require('cloudinary').v2;
const logger = require('../utils/logger');

/**
 * Cloudinary Configuration (Optional)
 * Alternative to storing images in MongoDB
 */

let isConfigured = false;

/**
 * Initialize Cloudinary
 */
const initializeCloudinary = () => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    
    if (!cloudName || !apiKey || !apiSecret) {
      logger.warn('Cloudinary credentials not found. Image upload to Cloudinary disabled.');
      logger.info('Using MongoDB for image storage instead.');
      return false;
    }
    
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true
    });
    
    isConfigured = true;
    logger.info('Cloudinary initialized successfully');
    logger.info(`Cloud Name: ${cloudName}`);
    
    return true;
  } catch (error) {
    logger.error('Error initializing Cloudinary:', error);
    isConfigured = false;
    return false;
  }
};

/**
 * Check if Cloudinary is configured
 */
const isCloudinaryConfigured = () => {
  return isConfigured;
};

/**
 * Upload image to Cloudinary
 */
const uploadImage = async (buffer, options = {}) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const {
      folder = 'fixmate',
      public_id,
      transformation,
      tags = []
    } = options;
    
    // Convert buffer to base64
    const base64Image = `data:image/jpeg;base64,${buffer.toString('base64')}`;
    
    const uploadOptions = {
      folder,
      resource_type: 'auto',
      tags,
      ...(public_id && { public_id }),
      ...(transformation && { transformation })
    };
    
    const result = await cloudinary.uploader.upload(base64Image, uploadOptions);
    
    logger.info(`Image uploaded to Cloudinary: ${result.public_id}`);
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      resourceType: result.resource_type
    };
  } catch (error) {
    logger.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple images
 */
const uploadMultipleImages = async (buffers, options = {}) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const uploadPromises = buffers.map(buffer => uploadImage(buffer, options));
    const results = await Promise.all(uploadPromises);
    
    logger.info(`${results.length} images uploaded to Cloudinary`);
    
    return {
      success: true,
      results
    };
  } catch (error) {
    logger.error('Error uploading multiple images:', error);
    throw error;
  }
};

/**
 * Delete image from Cloudinary
 */
const deleteImage = async (publicId) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    
    logger.info(`Image deleted from Cloudinary: ${publicId}`);
    
    return {
      success: result.result === 'ok',
      result: result.result
    };
  } catch (error) {
    logger.error('Error deleting from Cloudinary:', error);
    throw error;
  }
};

/**
 * Delete multiple images
 */
const deleteMultipleImages = async (publicIds) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.api.delete_resources(publicIds);
    
    logger.info(`${publicIds.length} images deleted from Cloudinary`);
    
    return {
      success: true,
      deleted: result.deleted,
      deleted_counts: result.deleted_counts
    };
  } catch (error) {
    logger.error('Error deleting multiple images:', error);
    throw error;
  }
};

/**
 * Get image details
 */
const getImageDetails = async (publicId) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.api.resource(publicId);
    
    return {
      success: true,
      publicId: result.public_id,
      format: result.format,
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      url: result.secure_url,
      createdAt: result.created_at
    };
  } catch (error) {
    logger.error('Error getting image details:', error);
    throw error;
  }
};

/**
 * Generate transformation URL
 */
const getTransformedUrl = (publicId, transformations) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    return cloudinary.url(publicId, transformations);
  } catch (error) {
    logger.error('Error generating transformed URL:', error);
    throw error;
  }
};

/**
 * Upload profile image with transformations
 */
const uploadProfileImage = async (buffer) => {
  return await uploadImage(buffer, {
    folder: 'fixmate/profiles',
    transformation: [
      { width: 400, height: 400, crop: 'fill', gravity: 'face' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    tags: ['profile']
  });
};

/**
 * Upload portfolio image with transformations
 */
const uploadPortfolioImage = async (buffer) => {
  return await uploadImage(buffer, {
    folder: 'fixmate/portfolios',
    transformation: [
      { width: 1200, height: 900, crop: 'limit' },
      { quality: 'auto:good' },
      { fetch_format: 'auto' }
    ],
    tags: ['portfolio']
  });
};

/**
 * Upload problem image for AI analysis
 */
const uploadProblemImage = async (buffer) => {
  return await uploadImage(buffer, {
    folder: 'fixmate/problems',
    transformation: [
      { width: 1920, height: 1920, crop: 'limit' },
      { quality: 'auto:best' },
      { fetch_format: 'auto' }
    ],
    tags: ['problem', 'ai-analysis']
  });
};

/**
 * Search images by tag
 */
const searchImagesByTag = async (tag, maxResults = 50) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.search
      .expression(`tags:${tag}`)
      .max_results(maxResults)
      .execute();
    
    return {
      success: true,
      total: result.total_count,
      images: result.resources
    };
  } catch (error) {
    logger.error('Error searching images:', error);
    throw error;
  }
};

/**
 * Get storage usage statistics
 */
const getStorageStats = async () => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.api.usage();
    
    return {
      success: true,
      plan: result.plan,
      credits: {
        used: result.credits.used,
        limit: result.credits.limit,
        usage_percent: result.credits.usage_pct
      },
      bandwidth: {
        used: result.bandwidth.used,
        limit: result.bandwidth.limit,
        usage_percent: result.bandwidth.usage_pct
      },
      storage: {
        used: result.storage.used,
        limit: result.storage.limit,
        usage_percent: result.storage.usage_pct
      },
      resources: result.resources
    };
  } catch (error) {
    logger.error('Error getting storage stats:', error);
    throw error;
  }
};

/**
 * Create upload preset
 */
const createUploadPreset = async (name, settings) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const result = await cloudinary.api.create_upload_preset({
      name,
      ...settings
    });
    
    logger.info(`Upload preset created: ${name}`);
    
    return {
      success: true,
      preset: result
    };
  } catch (error) {
    logger.error('Error creating upload preset:', error);
    throw error;
  }
};

/**
 * Cloudinary health check
 */
const healthCheck = async () => {
  if (!isConfigured) {
    return {
      status: 'disabled',
      message: 'Cloudinary not configured'
    };
  }
  
  try {
    // Try to ping Cloudinary
    await cloudinary.api.ping();
    
    return {
      status: 'healthy',
      configured: true
    };
  } catch (error) {
    logger.error('Cloudinary health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message
    };
  }
};

/**
 * Generate signed upload URL (for client-side uploads)
 */
const generateSignedUploadUrl = (options = {}) => {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured');
  }
  
  try {
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    const params = {
      timestamp,
      ...options
    };
    
    const signature = cloudinary.utils.api_sign_request(
      params,
      process.env.CLOUDINARY_API_SECRET
    );
    
    return {
      success: true,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      signature,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    };
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    throw error;
  }
};

module.exports = {
  // Initialization
  initializeCloudinary,
  isCloudinaryConfigured,
  
  // Upload Operations
  uploadImage,
  uploadMultipleImages,
  uploadProfileImage,
  uploadPortfolioImage,
  uploadProblemImage,
  
  // Delete Operations
  deleteImage,
  deleteMultipleImages,
  
  // Query Operations
  getImageDetails,
  searchImagesByTag,
  getStorageStats,
  
  // Transformation
  getTransformedUrl,
  
  // Configuration
  createUploadPreset,
  generateSignedUploadUrl,
  
  // Health Check
  healthCheck,
  
  // Direct cloudinary access
  cloudinary
};