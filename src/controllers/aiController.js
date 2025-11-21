const { ProblemImage, Worker, User, Category } = require('../models');
const axios = require('axios');

/**
 * @desc    Analyze problem image with AI
 * @route   POST /api/ai/analyze-image
 * @access  Private
 */
exports.analyzeImage = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const { imageUrl, imageBase64, bookingId, userDescription } = req.body;

    const customer = await User.findOne({ firebaseUid });

    // Create problem image record
    const problemImage = await ProblemImage.create({
      customerId: customer._id,
      bookingId,
      imageUrl,
      imageBase64,
      userDescription,
      aiAnalysis: {
        status: 'processing'
      }
    });

    try {
      // Call AI service for analysis
      // In production, this would call your ML model API
      const aiResponse = await axios.post(
        process.env.AI_MODEL_URL || 'http://localhost:8000/analyze',
        {
          image: imageBase64 || imageUrl,
          context: userDescription
        },
        {
          timeout: 30000
        }
      );

      // Update with AI analysis results
      await problemImage.updateAIAnalysis({
        detectedProblem: aiResponse.data.problem,
        problemCategory: aiResponse.data.category,
        confidence: aiResponse.data.confidence,
        suggestedService: aiResponse.data.suggestedService,
        alternativeServices: aiResponse.data.alternatives || [],
        estimatedCost: aiResponse.data.estimatedCost || {},
        urgency: aiResponse.data.urgency || 'medium',
        severity: aiResponse.data.severity || 'moderate',
        detectedObjects: aiResponse.data.objects || [],
        technicalDetails: aiResponse.data.details || '',
        recommendations: aiResponse.data.recommendations || [],
        requiredMaterials: aiResponse.data.materials || [],
        safetyWarnings: aiResponse.data.warnings || [],
        processingTime: aiResponse.data.processingTime
      });

      res.status(200).json({
        success: true,
        message: 'Image analyzed successfully',
        data: {
          problemImage,
          analysis: problemImage.aiAnalysis
        }
      });
    } catch (aiError) {
      // AI service failed
      await problemImage.markAsFailed(
        aiError.message,
        aiError.code || 'AI_SERVICE_ERROR'
      );

      res.status(200).json({
        success: true,
        message: 'Image uploaded but AI analysis failed',
        data: {
          problemImage,
          error: 'AI analysis unavailable. Please proceed with manual service selection.'
        }
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get AI recommendations for workers
 * @route   POST /api/ai/recommend-workers
 * @access  Private
 */
exports.recommendWorkers = async (req, res, next) => {
  try {
    const { firebaseUid } = req.user;
    const {
      serviceType,
      location,
      budget,
      urgency,
      problemDescription,
      aiAnalysisId
    } = req.body;

    const customer = await User.findOne({ firebaseUid });

    // Get AI analysis if provided
    let aiAnalysis = null;
    if (aiAnalysisId) {
      const problemImage = await ProblemImage.findById(aiAnalysisId);
      aiAnalysis = problemImage?.aiAnalysis;
    }

    // Build query for worker matching
    const query = {
      profileStatus: 'active',
      availability: true,
      specializations: serviceType
    };

    if (budget) {
      query.hourlyRate = { $lte: budget };
    }

    // Get workers
    let workers = await Worker.find(query)
      .populate('userId', 'fullName profileImage location phoneNumber')
      .limit(20);

    // Calculate matching scores
    const scoredWorkers = workers.map(worker => {
      let score = 0;

      // Rating score (40%)
      score += (worker.rating.average / 5) * 40;

      // Experience score (20%)
      const expScore = Math.min(worker.experience / 10, 1) * 20;
      score += expScore;

      // Price score (15%) - lower is better
      if (budget) {
        const priceScore = (1 - (worker.hourlyRate / budget)) * 15;
        score += Math.max(priceScore, 0);
      } else {
        score += 10;
      }

      // Response time score (10%)
      const responseScore = worker.responseTime > 0 
        ? Math.max(0, (1 - (worker.responseTime / 60)) * 10)
        : 5;
      score += responseScore;

      // Acceptance rate score (10%)
      score += (worker.acceptanceRate / 100) * 10;

      // Completed jobs score (5%)
      const jobsScore = Math.min(worker.completedJobs / 100, 1) * 5;
      score += jobsScore;

      // Location proximity score (if location provided)
      if (location && worker.userId.location) {
        // Simple distance calculation (in production, use proper geospatial)
        const distance = calculateDistance(
          location.coordinates,
          worker.userId.location.coordinates.coordinates
        );
        
        if (distance < 5) score += 10;
        else if (distance < 10) score += 5;
        else if (distance < 20) score += 2;
      }

      return {
        worker,
        matchScore: Math.round(score),
        reasons: generateMatchReasons(worker, aiAnalysis, budget)
      };
    });

    // Sort by score
    scoredWorkers.sort((a, b) => b.matchScore - a.matchScore);

    res.status(200).json({
      success: true,
      data: {
        recommendations: scoredWorkers.slice(0, 10),
        total: scoredWorkers.length,
        aiAssisted: !!aiAnalysis
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get service category suggestions based on text
 * @route   POST /api/ai/suggest-category
 * @access  Private
 */
exports.suggestCategory = async (req, res, next) => {
  try {
    const { description } = req.body;

    // Get all categories with keywords
    const categories = await Category.find({ isActive: true });

    // Simple keyword matching (in production, use NLP)
    const suggestions = categories.map(category => {
      let score = 0;
      const descLower = description.toLowerCase();

      // Check keywords
      category.keywords.forEach(keyword => {
        if (descLower.includes(keyword.toLowerCase())) {
          score += 10;
        }
      });

      // Check common problems
      category.commonProblems.forEach(problem => {
        if (descLower.includes(problem.keyword.toLowerCase())) {
          score += 15;
        }
      });

      // Check category name
      if (descLower.includes(category.name.toLowerCase())) {
        score += 20;
      }

      return {
        category,
        confidence: Math.min(score, 100)
      };
    });

    // Filter and sort
    const topSuggestions = suggestions
      .filter(s => s.confidence > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 5);

    res.status(200).json({
      success: true,
      data: {
        suggestions: topSuggestions,
        confidence: topSuggestions[0]?.confidence || 0
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Submit feedback on AI analysis
 * @route   POST /api/ai/feedback
 * @access  Private
 */
exports.submitAIFeedback = async (req, res, next) => {
  try {
    const { problemImageId, isAccurate, feedbackText, correctedCategory } = req.body;

    const problemImage = await ProblemImage.findById(problemImageId);

    if (!problemImage) {
      return res.status(404).json({
        success: false,
        message: 'Problem image not found'
      });
    }

    await problemImage.submitFeedback(isAccurate, feedbackText, correctedCategory);

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully. Thank you for helping us improve!'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get estimated cost for service
 * @route   POST /api/ai/estimate-cost
 * @access  Private
 */
exports.estimateCost = async (req, res, next) => {
  try {
    const { serviceType, description, location, urgency } = req.body;

    // Get average rates for this service
    const workers = await Worker.find({
      specializations: serviceType,
      profileStatus: 'active'
    });

    if (workers.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          estimate: null,
          message: 'No workers available for this service'
        }
      });
    }

    const rates = workers.map(w => w.hourlyRate);
    const avgRate = rates.reduce((a, b) => a + b, 0) / rates.length;
    const minRate = Math.min(...rates);
    const maxRate = Math.max(...rates);

    // Estimate hours based on service type (simplified)
    let estimatedHours = 2; // Default
    
    if (urgency === 'high' || urgency === 'critical') {
      estimatedHours *= 1.5; // Premium for urgency
    }

    const estimate = {
      minCost: Math.round(minRate * estimatedHours),
      maxCost: Math.round(maxRate * estimatedHours),
      avgCost: Math.round(avgRate * estimatedHours),
      estimatedHours,
      currency: 'LKR',
      factors: [
        'Service complexity',
        'Worker experience',
        'Location',
        urgency !== 'low' && 'Urgency level'
      ].filter(Boolean)
    };

    res.status(200).json({
      success: true,
      data: { estimate }
    });
  } catch (error) {
    next(error);
  }
};

// Helper functions
function calculateDistance(coords1, coords2) {
  // Simplified distance calculation
  // In production, use proper haversine formula
  if (!coords1 || !coords2) return 999;
  
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}

function generateMatchReasons(worker, aiAnalysis, budget) {
  const reasons = [];

  if (worker.rating.average >= 4.5) {
    reasons.push('Highly rated professional');
  }

  if (worker.experience >= 5) {
    reasons.push(`${worker.experience}+ years of experience`);
  }

  if (worker.completedJobs >= 50) {
    reasons.push(`Completed ${worker.completedJobs}+ jobs`);
  }

  if (worker.responseTime < 30) {
    reasons.push('Quick response time');
  }

  if (budget && worker.hourlyRate <= budget) {
    reasons.push('Within your budget');
  }

  if (aiAnalysis && aiAnalysis.suggestedService) {
    reasons.push('Matches AI-detected problem');
  }

  return reasons.slice(0, 3); // Top 3 reasons
}

module.exports = exports;