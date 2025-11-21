const sharp = require('sharp');
const logger = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image Service
 * Handles image processing, optimization, and storage
 */

class ImageService {
  constructor() {
    this.allowedFormats = ['jpg', 'jpeg', 'png', 'webp'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.thumbnailSize = { width: 300, height: 300 };
    this.mediumSize = { width: 800, height: 800 };
    this.largeSize = { width: 1920, height: 1920 };
  }

  /**
   * Validate image file
   */
  validateImage(file) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size
    if (file.size > this.maxFileSize) {
      throw new Error('File size exceeds maximum limit of 10MB');
    }

    // Check file format
    const ext = path.extname(file.originalname).toLowerCase().substring(1);
    if (!this.allowedFormats.includes(ext)) {
      throw new Error(`Invalid file format. Allowed formats: ${this.allowedFormats.join(', ')}`);
    }

    return true;
  }

  /**
   * Process and optimize image
   */
  async processImage(buffer, options = {}) {
    try {
      const {
        width = null,
        height = null,
        quality = 80,
        format = 'jpeg',
        fit = 'inside'
      } = options;

      let processedImage = sharp(buffer);

      // Get image metadata
      const metadata = await processedImage.metadata();

      // Resize if dimensions provided
      if (width || height) {
        processedImage = processedImage.resize(width, height, {
          fit,
          withoutEnlargement: true
        });
      }

      // Convert to specified format and compress
      if (format === 'jpeg' || format === 'jpg') {
        processedImage = processedImage.jpeg({ quality, progressive: true });
      } else if (format === 'png') {
        processedImage = processedImage.png({ quality, progressive: true });
      } else if (format === 'webp') {
        processedImage = processedImage.webp({ quality });
      }

      const outputBuffer = await processedImage.toBuffer();

      return {
        buffer: outputBuffer,
        metadata: {
          format: metadata.format,
          width: metadata.width,
          height: metadata.height,
          size: outputBuffer.length
        }
      };
    } catch (error) {
      logger.error(`Error processing image: ${error.message}`);
      throw new Error('Failed to process image');
    }
  }

  /**
   * Generate multiple image sizes (thumbnail, medium, large)
   */
  async generateImageSizes(buffer) {
    try {
      const [thumbnail, medium, large] = await Promise.all([
        this.processImage(buffer, {
          width: this.thumbnailSize.width,
          height: this.thumbnailSize.height,
          quality: 70,
          format: 'jpeg'
        }),
        this.processImage(buffer, {
          width: this.mediumSize.width,
          height: this.mediumSize.height,
          quality: 80,
          format: 'jpeg'
        }),
        this.processImage(buffer, {
          width: this.largeSize.width,
          height: this.largeSize.height,
          quality: 85,
          format: 'jpeg'
        })
      ]);

      return {
        thumbnail,
        medium,
        large,
        original: {
          buffer,
          metadata: await sharp(buffer).metadata()
        }
      };
    } catch (error) {
      logger.error(`Error generating image sizes: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert image to base64
   */
  async imageToBase64(buffer, mimeType = 'image/jpeg') {
    try {
      const base64String = buffer.toString('base64');
      return `data:${mimeType};base64,${base64String}`;
    } catch (error) {
      logger.error(`Error converting image to base64: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert base64 to buffer
   */
  base64ToBuffer(base64String) {
    try {
      // Remove data URL prefix if present
      const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
      return Buffer.from(base64Data, 'base64');
    } catch (error) {
      logger.error(`Error converting base64 to buffer: ${error.message}`);
      throw error;
    }
  }

  /**
   * Compress image
   */
  async compressImage(buffer, quality = 80) {
    try {
      const compressed = await sharp(buffer)
        .jpeg({ quality, progressive: true })
        .toBuffer();

      const originalSize = buffer.length;
      const compressedSize = compressed.length;
      const compressionRatio = ((1 - compressedSize / originalSize) * 100).toFixed(2);

      logger.info(`Image compressed: ${originalSize} bytes -> ${compressedSize} bytes (${compressionRatio}% reduction)`);

      return {
        buffer: compressed,
        originalSize,
        compressedSize,
        compressionRatio: parseFloat(compressionRatio)
      };
    } catch (error) {
      logger.error(`Error compressing image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Crop image
   */
  async cropImage(buffer, cropData) {
    try {
      const { x, y, width, height } = cropData;

      const cropped = await sharp(buffer)
        .extract({
          left: Math.round(x),
          top: Math.round(y),
          width: Math.round(width),
          height: Math.round(height)
        })
        .toBuffer();

      return cropped;
    } catch (error) {
      logger.error(`Error cropping image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Rotate image
   */
  async rotateImage(buffer, angle) {
    try {
      const rotated = await sharp(buffer)
        .rotate(angle)
        .toBuffer();

      return rotated;
    } catch (error) {
      logger.error(`Error rotating image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Add watermark to image
   */
  async addWatermark(buffer, watermarkBuffer, options = {}) {
    try {
      const {
        position = 'bottom-right',
        opacity = 0.5
      } = options;

      // Resize watermark
      const watermark = await sharp(watermarkBuffer)
        .resize(200, null, { withoutEnlargement: true })
        .toBuffer();

      // Get main image dimensions
      const metadata = await sharp(buffer).metadata();

      // Calculate watermark position
      let gravity;
      switch (position) {
        case 'top-left':
          gravity = 'northwest';
          break;
        case 'top-right':
          gravity = 'northeast';
          break;
        case 'bottom-left':
          gravity = 'southwest';
          break;
        case 'bottom-right':
        default:
          gravity = 'southeast';
          break;
        case 'center':
          gravity = 'center';
          break;
      }

      const watermarked = await sharp(buffer)
        .composite([{
          input: watermark,
          gravity,
          blend: 'over'
        }])
        .toBuffer();

      return watermarked;
    } catch (error) {
      logger.error(`Error adding watermark: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get image metadata
   */
  async getMetadata(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      return {
        format: metadata.format,
        width: metadata.width,
        height: metadata.height,
        space: metadata.space,
        channels: metadata.channels,
        depth: metadata.depth,
        density: metadata.density,
        hasAlpha: metadata.hasAlpha,
        orientation: metadata.orientation,
        size: buffer.length
      };
    } catch (error) {
      logger.error(`Error getting image metadata: ${error.message}`);
      throw error;
    }
  }

  /**
   * Convert image format
   */
  async convertFormat(buffer, targetFormat) {
    try {
      let converted;

      switch (targetFormat.toLowerCase()) {
        case 'jpeg':
        case 'jpg':
          converted = await sharp(buffer).jpeg({ quality: 80 }).toBuffer();
          break;
        case 'png':
          converted = await sharp(buffer).png().toBuffer();
          break;
        case 'webp':
          converted = await sharp(buffer).webp({ quality: 80 }).toBuffer();
          break;
        default:
          throw new Error(`Unsupported format: ${targetFormat}`);
      }

      return converted;
    } catch (error) {
      logger.error(`Error converting image format: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create circular avatar from image
   */
  async createCircularAvatar(buffer, size = 200) {
    try {
      const circleBuffer = Buffer.from(
        `<svg><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" /></svg>`
      );

      const avatar = await sharp(buffer)
        .resize(size, size, { fit: 'cover' })
        .composite([{
          input: circleBuffer,
          blend: 'dest-in'
        }])
        .png()
        .toBuffer();

      return avatar;
    } catch (error) {
      logger.error(`Error creating circular avatar: ${error.message}`);
      throw error;
    }
  }

  /**
   * Blur image
   */
  async blurImage(buffer, sigma = 5) {
    try {
      const blurred = await sharp(buffer)
        .blur(sigma)
        .toBuffer();

      return blurred;
    } catch (error) {
      logger.error(`Error blurring image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Apply grayscale filter
   */
  async applyGrayscale(buffer) {
    try {
      const grayscale = await sharp(buffer)
        .grayscale()
        .toBuffer();

      return grayscale;
    } catch (error) {
      logger.error(`Error applying grayscale: ${error.message}`);
      throw error;
    }
  }

  /**
   * Optimize image for web
   */
  async optimizeForWeb(buffer) {
    try {
      const metadata = await sharp(buffer).metadata();
      
      // Determine optimal settings based on image
      const maxWidth = 1920;
      const quality = metadata.width > maxWidth ? 75 : 85;

      const optimized = await sharp(buffer)
        .resize(maxWidth, null, { 
          withoutEnlargement: true,
          fit: 'inside'
        })
        .jpeg({ 
          quality, 
          progressive: true,
          mozjpeg: true 
        })
        .toBuffer();

      return {
        buffer: optimized,
        originalSize: buffer.length,
        optimizedSize: optimized.length,
        compressionRatio: ((1 - optimized.length / buffer.length) * 100).toFixed(2)
      };
    } catch (error) {
      logger.error(`Error optimizing image for web: ${error.message}`);
      throw error;
    }
  }

  /**
   * Store image as base64 in MongoDB
   */
  async prepareForMongoStorage(file) {
    try {
      this.validateImage(file);

      // Process image
      const processed = await this.optimizeForWeb(file.buffer);
      
      // Convert to base64
      const base64 = processed.buffer.toString('base64');
      
      // Get metadata
      const metadata = await this.getMetadata(processed.buffer);

      return {
        data: base64,
        contentType: file.mimetype,
        filename: file.originalname,
        size: processed.optimizedSize,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format
        }
      };
    } catch (error) {
      logger.error(`Error preparing image for storage: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process multiple images
   */
  async processMultipleImages(files, options = {}) {
    try {
      const processedImages = await Promise.all(
        files.map(async (file) => {
          const processed = await this.processImage(file.buffer, options);
          return {
            originalName: file.originalname,
            ...processed
          };
        })
      );

      return processedImages;
    } catch (error) {
      logger.error(`Error processing multiple images: ${error.message}`);
      throw error;
    }
  }

  /**
   * Validate and process profile image
   */
  async processProfileImage(file) {
    try {
      this.validateImage(file);

      // Create circular avatar
      const avatar = await this.createCircularAvatar(file.buffer, 200);
      
      // Also create a thumbnail
      const thumbnail = await this.processImage(file.buffer, {
        width: 100,
        height: 100,
        quality: 70
      });

      return {
        avatar: avatar.toString('base64'),
        thumbnail: thumbnail.buffer.toString('base64'),
        contentType: 'image/png'
      };
    } catch (error) {
      logger.error(`Error processing profile image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process portfolio images
   */
  async processPortfolioImages(files) {
    try {
      const processed = await Promise.all(
        files.map(async (file) => {
          this.validateImage(file);
          
          // Generate multiple sizes
          const sizes = await this.generateImageSizes(file.buffer);
          
          return {
            thumbnail: sizes.thumbnail.buffer.toString('base64'),
            medium: sizes.medium.buffer.toString('base64'),
            large: sizes.large.buffer.toString('base64'),
            contentType: file.mimetype,
            filename: file.originalname
          };
        })
      );

      return processed;
    } catch (error) {
      logger.error(`Error processing portfolio images: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new ImageService();