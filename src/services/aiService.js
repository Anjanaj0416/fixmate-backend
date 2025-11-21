const axios = require('axios');
const Worker = require('../models/Worker');
const Category = require('../models/Category');
const ProblemImage = require('../models/ProblemImage');
const logger = require('../utils/logger');

/**
 * AI Service
 * Handles AI-powered worker matching, problem detection, and recommendations
 */

class AIService {
  constructor() {
    // FastAPI ML Service URL (from your existing ML model)
    this.mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
    
    // OpenAI API configuration for image analysis
    this.openaiApiKey = process.env.OPENAI_API_KEY;
    this.openaiApiUrl = 'https://api.openai.com/v1/chat/completions';
  }

  /**
   * Analyze problem image using OpenAI Vision API
   */
  async analyzeImageWithOpenAI(base64Image) {
    try {
      const response = await axios.post(
        this.openaiApiUrl,
        {
          model: 'gpt-4-vision-preview',
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'You are a skilled worker problem detector. Analyze this image and identify: 1) What type of service is needed (plumbing, electrical, carpentry, etc.), 2) Describe the problem in detail, 3) Estimate the urgency level (low, medium, high), 4) Suggest what type of skilled worker should handle this. Respond in JSON format with keys: service_type, problem_description, urgency, worker_type, confidence_score (0-100).'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: `data:image/jpeg;base64,${base64Image}`
                  }
                }
              ]
            }
          ],
          max_tokens: 500
        },
        {
          headers: {
            'Authorization': `Bearer ${this.openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const content = response.data.choices[0].message.content;
      
      // Parse JSON response
      const analysisResult = JSON.parse(content);

      logger.info('Image analysis completed successfully');

      return {
        serviceType: analysisResult.service_type,
        problemDescription: analysisResult.problem_description,
        urgency: analysisResult.urgency,
        workerType: analysisResult.worker_type,
        confidence: analysisResult.confidence_score
      };
    } catch (error) {
      logger.error(`Error analyzing image with OpenAI: ${error.message}`);
      
      // Fallback to basic analysis if OpenAI fails
      return {
        serviceType: 'general_maintenance',
        problemDescription: 'Unable to automatically detect problem. Please provide description.',
        urgency: 'medium',
        workerType: 'general',
        confidence: 0
      };
    }
  }

  /**
   * Classify service category from text using ML model
   */
  async classifyServiceFromText(text, location = null) {
    try {
      const response = await axios.post(`${this.mlServiceUrl}/predict`, {
        text,
        location
      });

      const { 
        service_category, 
        confidence, 
        detected_location, 
        detected_time 
      } = response.data;

      logger.info(`Service classification completed: ${service_category} (${confidence}% confidence)`);

      return {
        serviceCategory: service_category,
        confidence,
        detectedLocation: detected_location,
        detectedTime: detected_time
      };
    } catch (error) {
      logger.error(`Error classifying service from text: ${error.message}`);
      
      // Fallback to keyword matching
      return await this.fallbackTextClassification(text);
    }
  }

  /**
   * Fallback text classification using keyword matching
   */
  async fallbackTextClassification(text) {
    const textLower = text.toLowerCase();
    
    const serviceKeywords = {
      plumbing: ['pipe', 'leak', 'water', 'drain', 'toilet', 'sink', 'plumb', 'faucet', 'tap'],
      electrical: ['wire', 'electric', 'power', 'light', 'switch', 'socket', 'electrical', 'voltage'],
      carpentry: ['wood', 'door', 'window', 'furniture', 'cabinet', 'shelf', 'carpenter'],
      painting: ['paint', 'color', 'wall', 'ceiling', 'brush', 'painter'],
      ac_repair: ['ac', 'air condition', 'cooling', 'hvac', 'refriger'],
      appliance_repair: ['appliance', 'washing machine', 'refrigerator', 'microwave', 'oven'],
      cleaning: ['clean', 'mop', 'sweep', 'dust', 'sanitize'],
      pest_control: ['pest', 'rat', 'cockroach', 'termite', 'insect', 'bug'],
      gardening: ['garden', 'plant', 'lawn', 'tree', 'landscap'],
      masonry: ['brick', 'cement', 'concrete', 'wall', 'mason'],
      roofing: ['roof', 'tile', 'leak', 'ceiling'],
      welding: ['weld', 'metal', 'iron', 'steel']
    };

    let bestMatch = { category: 'general_maintenance', score: 0 };

    for (const [category, keywords] of Object.entries(serviceKeywords)) {
      const matchCount = keywords.filter(keyword => textLower.includes(keyword)).length;
      const score = (matchCount / keywords.length) * 100;
      
      if (score > bestMatch.score) {
        bestMatch = { category, score };
      }
    }

    return {
      serviceCategory: bestMatch.category,
      confidence: bestMatch.score,
      detectedLocation: null,
      detectedTime: null
    };
  }

  /**
   * Get AI-powered worker recommendations
   */
  async getWorkerRecommendations(params) {
    try {
      const {
        serviceCategory,
        location,
        urgency = 'medium',
        budget = null,
        customerPreferences = {},
        problemDescription = null
      } = params;

      // Build query for workers
      const query = {
        'profile.specialization': serviceCategory,
        'profile.isAvailable': true,
        'profile.isVerified': true,
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            },
            $maxDistance: 50000 // 50km radius
          }
        }
      };

      // Add budget filter if provided
      if (budget) {
        query['profile.hourlyRate'] = { $lte: budget };
      }

      // Fetch workers from database
      const workers = await Worker.find(query)
        .select('userId profile ratings location')
        .limit(50)
        .lean();

      if (workers.length === 0) {
        return {
          recommendations: [],
          analysis: {
            detected_service: serviceCategory,
            detected_location: location.address,
            total_workers_found: 0
          }
        };
      }

      // Calculate recommendation scores
      const recommendations = workers.map(worker => {
        let score = 0;

        // Rating score (40% weight)
        const ratingScore = (worker.ratings.average / 5) * 40;
        score += ratingScore;

        // Distance score (30% weight)
        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          worker.location.coordinates[1],
          worker.location.coordinates[0]
        );
        const distanceScore = Math.max(0, 30 - (distance / 2)); // Closer is better
        score += distanceScore;

        // Review count score (15% weight)
        const reviewScore = Math.min(15, (worker.ratings.count / 10) * 15);
        score += reviewScore;

        // Availability score (15% weight)
        const availabilityScore = worker.profile.isAvailable ? 15 : 0;
        score += availabilityScore;

        return {
          worker_id: worker.userId,
          name: worker.profile.businessName || 'Professional Worker',
          service_type: worker.profile.specialization,
          rating: worker.ratings.average,
          review_count: worker.ratings.count,
          score: Math.round(score * 10) / 10,
          distance_km: Math.round(distance * 10) / 10,
          hourly_rate: worker.profile.hourlyRate,
          is_available: worker.profile.isAvailable,
          is_verified: worker.profile.isVerified
        };
      });

      // Sort by score (highest first)
      recommendations.sort((a, b) => b.score - a.score);

      // Apply urgency multiplier
      if (urgency === 'high') {
        // Prioritize nearby workers for urgent requests
        recommendations.forEach(rec => {
          if (rec.distance_km < 5) {
            rec.score *= 1.2;
          }
        });
        recommendations.sort((a, b) => b.score - a.score);
      }

      // Return top 10 recommendations
      const topRecommendations = recommendations.slice(0, 10);

      logger.info(`Generated ${topRecommendations.length} worker recommendations`);

      return {
        recommendations: topRecommendations,
        analysis: {
          detected_service: serviceCategory,
          detected_location: location.address,
          total_workers_found: workers.length,
          urgency_level: urgency,
          average_score: topRecommendations.reduce((sum, r) => sum + r.score, 0) / topRecommendations.length
        }
      };
    } catch (error) {
      logger.error(`Error getting worker recommendations: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate distance between two coordinates (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    
    return distance;
  }

  /**
   * Convert degrees to radians
   */
  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Process and analyze problem image
   */
  async processProblemImage(imageData, userId) {
    try {
      // Analyze image with OpenAI
      const analysis = await this.analyzeImageWithOpenAI(imageData.base64);

      // Save analysis to database
      const problemImage = await ProblemImage.create({
        userId,
        imageData: imageData.base64,
        contentType: imageData.contentType,
        analysis: {
          detectedProblem: analysis.problemDescription,
          serviceCategory: analysis.serviceType,
          confidence: analysis.confidence,
          suggestedWorkerType: analysis.workerType,
          urgency: analysis.urgency
        },
        metadata: imageData.metadata
      });

      logger.info(`Problem image analyzed and saved: ${problemImage._id}`);

      return {
        imageId: problemImage._id,
        analysis
      };
    } catch (error) {
      logger.error(`Error processing problem image: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate service-specific questionnaire
   */
  async generateQuestionnaire(serviceCategory) {
    try {
      const category = await Category.findOne({ 
        slug: serviceCategory 
      }).select('questionnaire');

      if (!category || !category.questionnaire) {
        return this.getDefaultQuestionnaire();
      }

      return category.questionnaire;
    } catch (error) {
      logger.error(`Error generating questionnaire: ${error.message}`);
      return this.getDefaultQuestionnaire();
    }
  }

  /**
   * Get default questionnaire
   */
  getDefaultQuestionnaire() {
    return [
      {
        question: 'When do you need this service?',
        type: 'select',
        options: ['As soon as possible', 'Within a week', 'Flexible'],
        required: true
      },
      {
        question: 'What is your preferred time?',
        type: 'select',
        options: ['Morning (8AM-12PM)', 'Afternoon (12PM-5PM)', 'Evening (5PM-8PM)'],
        required: true
      },
      {
        question: 'What is your budget range?',
        type: 'select',
        options: ['Under LKR 5,000', 'LKR 5,000-10,000', 'LKR 10,000-20,000', 'Above LKR 20,000'],
        required: false
      },
      {
        question: 'Please describe your problem in detail',
        type: 'textarea',
        required: true
      }
    ];
  }

  /**
   * Analyze questionnaire responses and improve recommendations
   */
  analyzeQuestionnaire Responses(responses, initialRecommendations) {
    try {
      const preferences = {
        urgency: 'medium',
        preferredTime: null,
        budget: null
      };

      // Extract preferences from responses
      responses.forEach(response => {
        const questionLower = response.question.toLowerCase();
        
        if (questionLower.includes('when') || questionLower.includes('soon')) {
          if (response.answer.toLowerCase().includes('soon') || 
              response.answer.toLowerCase().includes('urgent')) {
            preferences.urgency = 'high';
          }
        }
        
        if (questionLower.includes('time')) {
          preferences.preferredTime = response.answer;
        }
        
        if (questionLower.includes('budget')) {
          // Extract budget from answer
          const budgetMatch = response.answer.match(/\d+/g);
          if (budgetMatch) {
            preferences.budget = parseInt(budgetMatch[budgetMatch.length - 1]);
          }
        }
      });

      // Filter recommendations based on preferences
      let filteredRecommendations = [...initialRecommendations];

      if (preferences.budget) {
        filteredRecommendations = filteredRecommendations.filter(
          rec => rec.hourly_rate <= preferences.budget
        );
      }

      // Adjust scores based on urgency
      if (preferences.urgency === 'high') {
        filteredRecommendations.forEach(rec => {
          if (rec.distance_km < 3) {
            rec.score *= 1.3;
          }
        });
        filteredRecommendations.sort((a, b) => b.score - a.score);
      }

      return {
        recommendations: filteredRecommendations,
        extractedPreferences: preferences
      };
    } catch (error) {
      logger.error(`Error analyzing questionnaire responses: ${error.message}`);
      return {
        recommendations: initialRecommendations,
        extractedPreferences: {}
      };
    }
  }

  /**
   * Get similar workers based on a worker profile
   */
  async getSimilarWorkers(workerId, limit = 5) {
    try {
      const targetWorker = await Worker.findOne({ userId: workerId })
        .select('profile location ratings')
        .lean();

      if (!targetWorker) {
        throw new Error('Worker not found');
      }

      const similarWorkers = await Worker.find({
        userId: { $ne: workerId },
        'profile.specialization': targetWorker.profile.specialization,
        'profile.isAvailable': true,
        'location.coordinates': {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: targetWorker.location.coordinates
            },
            $maxDistance: 30000 // 30km radius
          }
        }
      })
        .select('userId profile ratings location')
        .limit(limit)
        .lean();

      return similarWorkers.map(worker => ({
        worker_id: worker.userId,
        name: worker.profile.businessName,
        service_type: worker.profile.specialization,
        rating: worker.ratings.average,
        similarity_score: this.calculateSimilarityScore(targetWorker, worker)
      }));
    } catch (error) {
      logger.error(`Error getting similar workers: ${error.message}`);
      throw error;
    }
  }

  /**
   * Calculate similarity score between two workers
   */
  calculateSimilarityScore(worker1, worker2) {
    let score = 0;

    // Specialization match (50 points)
    if (worker1.profile.specialization === worker2.profile.specialization) {
      score += 50;
    }

    // Rating similarity (30 points)
    const ratingDiff = Math.abs(worker1.ratings.average - worker2.ratings.average);
    score += Math.max(0, 30 - (ratingDiff * 10));

    // Location proximity (20 points)
    const distance = this.calculateDistance(
      worker1.location.coordinates[1],
      worker1.location.coordinates[0],
      worker2.location.coordinates[1],
      worker2.location.coordinates[0]
    );
    score += Math.max(0, 20 - distance);

    return Math.round(score);
  }

  /**
   * Get trending service categories
   */
  async getTrendingCategories(limit = 5) {
    try {
      // This would typically analyze booking data
      // For now, return predefined popular categories
      const trending = [
        { category: 'plumbing', demand_score: 95 },
        { category: 'electrical', demand_score: 88 },
        { category: 'ac_repair', demand_score: 82 },
        { category: 'painting', demand_score: 76 },
        { category: 'carpentry', demand_score: 71 }
      ];

      return trending.slice(0, limit);
    } catch (error) {
      logger.error(`Error getting trending categories: ${error.message}`);
      throw error;
    }
  }
}

module.exports = new AIService();