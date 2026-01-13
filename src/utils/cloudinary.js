const { uploadImage } = require('../config/cloudinary');
const fs = require('fs');

/**
 * Cloudinary Upload Utility
 * Wrapper for uploading files to Cloudinary
 */

/**
 * Upload file to Cloudinary from file path
 * @param {string} filePath - Path to file
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<object>} Upload result with secure_url
 */
const uploadToCloudinary = async (filePath, folder = 'fixmate') => {
  try {
    // Read file as buffer
    const buffer = fs.readFileSync(filePath);
    
    // Upload to Cloudinary
    const result = await uploadImage(buffer, {
      folder: `fixmate/${folder}`,
      resource_type: 'auto'
    });
    
    // Clean up local file after upload
    try {
      fs.unlinkSync(filePath);
    } catch (cleanupError) {
      console.warn('Could not delete local file:', cleanupError.message);
    }
    
    return result;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload multiple files to Cloudinary
 * @param {Array<string>} filePaths - Array of file paths
 * @param {string} folder - Cloudinary folder name
 * @returns {Promise<Array<object>>} Array of upload results
 */
const uploadMultipleToCloudinary = async (filePaths, folder = 'fixmate') => {
  try {
    const uploadPromises = filePaths.map(filePath => 
      uploadToCloudinary(filePath, folder)
    );
    
    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    console.error('Error uploading multiple files to Cloudinary:', error);
    throw error;
  }
};

module.exports = {
  uploadToCloudinary,
  uploadMultipleToCloudinary
};