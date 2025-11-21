/**
 * Response Formatter
 * Standardized API response formats
 */

/**
 * Success response
 */
const successResponse = (res, data = null, message = 'Success', statusCode = 200) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

/**
 * Error response
 */
const errorResponse = (res, message = 'Error occurred', statusCode = 500, errors = null) => {
  return res.status(statusCode).json({
    success: false,
    message,
    ...(errors && { errors }),
    timestamp: new Date().toISOString()
  });
};

/**
 * Created response (201)
 */
const createdResponse = (res, data, message = 'Resource created successfully') => {
  return successResponse(res, data, message, 201);
};

/**
 * Not found response (404)
 */
const notFoundResponse = (res, message = 'Resource not found') => {
  return errorResponse(res, message, 404);
};

/**
 * Bad request response (400)
 */
const badRequestResponse = (res, message = 'Bad request', errors = null) => {
  return errorResponse(res, message, 400, errors);
};

/**
 * Unauthorized response (401)
 */
const unauthorizedResponse = (res, message = 'Unauthorized access') => {
  return errorResponse(res, message, 401);
};

/**
 * Forbidden response (403)
 */
const forbiddenResponse = (res, message = 'Forbidden access') => {
  return errorResponse(res, message, 403);
};

/**
 * Validation error response (422)
 */
const validationErrorResponse = (res, errors) => {
  return errorResponse(res, 'Validation failed', 422, errors);
};

/**
 * Conflict response (409)
 */
const conflictResponse = (res, message = 'Resource already exists') => {
  return errorResponse(res, message, 409);
};

/**
 * Too many requests response (429)
 */
const tooManyRequestsResponse = (res, message = 'Too many requests') => {
  return errorResponse(res, message, 429);
};

/**
 * Internal server error response (500)
 */
const internalServerErrorResponse = (res, message = 'Internal server error') => {
  return errorResponse(res, message, 500);
};

/**
 * Paginated response
 */
const paginatedResponse = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      currentPage: pagination.currentPage,
      totalPages: pagination.totalPages,
      totalItems: pagination.totalItems,
      itemsPerPage: pagination.itemsPerPage,
      hasNextPage: pagination.hasNextPage,
      hasPrevPage: pagination.hasPrevPage
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * List response with metadata
 */
const listResponse = (res, items, total, filters = {}, message = 'Success') => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      items,
      total,
      count: items.length
    },
    filters,
    timestamp: new Date().toISOString()
  });
};

/**
 * No content response (204)
 */
const noContentResponse = (res) => {
  return res.status(204).send();
};

/**
 * Custom response
 */
const customResponse = (res, statusCode, payload) => {
  return res.status(statusCode).json({
    ...payload,
    timestamp: new Date().toISOString()
  });
};

/**
 * Format validation errors from express-validator
 */
const formatValidationErrors = (errors) => {
  return errors.array().map(error => ({
    field: error.param,
    message: error.msg,
    value: error.value
  }));
};

/**
 * Format Mongoose validation errors
 */
const formatMongooseErrors = (error) => {
  const errors = {};
  
  if (error.errors) {
    Object.keys(error.errors).forEach(key => {
      errors[key] = error.errors[key].message;
    });
  }
  
  return errors;
};

/**
 * Send file response
 */
const fileResponse = (res, filePath, fileName, mimeType) => {
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.sendFile(filePath);
};

/**
 * Send JSON download response
 */
const jsonDownloadResponse = (res, data, fileName = 'export.json') => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.json(data);
};

/**
 * Send CSV response
 */
const csvResponse = (res, data, fileName = 'export.csv') => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
  return res.send(data);
};

/**
 * Analytics response format
 */
const analyticsResponse = (res, analytics, period, message = 'Analytics retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data: analytics,
    period,
    generatedAt: new Date().toISOString(),
    timestamp: new Date().toISOString()
  });
};

/**
 * Booking response format
 */
const bookingResponse = (res, booking, message = 'Booking retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    booking: {
      id: booking._id || booking.id,
      bookingId: booking.bookingId,
      status: booking.status,
      serviceType: booking.serviceType,
      scheduledDate: booking.scheduledDate,
      location: booking.location,
      customerId: booking.customerId,
      workerId: booking.workerId,
      estimatedCost: booking.estimatedCost,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Worker profile response format
 */
const workerProfileResponse = (res, worker, message = 'Worker profile retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    worker: {
      id: worker.userId,
      profile: worker.profile,
      ratings: worker.ratings,
      location: worker.location,
      availability: worker.profile.isAvailable,
      verified: worker.profile.isVerified,
      joinedDate: worker.createdAt
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Authentication response format
 */
const authResponse = (res, user, token, message = 'Authentication successful') => {
  return res.status(200).json({
    success: true,
    message,
    user: {
      id: user._id || user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      phoneNumber: user.phoneNumber,
      profileImage: user.profileImage
    },
    token,
    timestamp: new Date().toISOString()
  });
};

/**
 * Payment response format
 */
const paymentResponse = (res, payment, message = 'Payment processed successfully') => {
  return res.status(200).json({
    success: true,
    message,
    payment: {
      id: payment._id || payment.id,
      paymentId: payment.paymentId,
      amount: payment.amount,
      status: payment.status,
      method: payment.method,
      bookingId: payment.bookingId,
      transactionDate: payment.createdAt
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Notification response format
 */
const notificationResponse = (res, notifications, unreadCount, message = 'Notifications retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      notifications,
      unreadCount,
      total: notifications.length
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Review response format
 */
const reviewResponse = (res, review, message = 'Review retrieved successfully') => {
  return res.status(200).json({
    success: true,
    message,
    review: {
      id: review._id || review.id,
      rating: review.rating,
      comment: review.comment,
      workerId: review.workerId,
      customerId: review.customerId,
      bookingId: review.bookingId,
      helpful: review.helpful?.length || 0,
      createdAt: review.createdAt
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Search results response format
 */
const searchResponse = (res, results, query, filters = {}, message = 'Search completed successfully') => {
  return res.status(200).json({
    success: true,
    message,
    data: {
      results,
      count: results.length,
      query,
      filters
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * AI recommendation response format
 */
const aiRecommendationResponse = (res, recommendations, analysis, message = 'Recommendations generated successfully') => {
  return res.status(200).json({
    success: true,
    message,
    recommendations,
    analysis,
    confidence: analysis.average_score || 0,
    timestamp: new Date().toISOString()
  });
};

/**
 * Health check response
 */
const healthCheckResponse = (res, services = {}) => {
  const allHealthy = Object.values(services).every(status => status === 'healthy');
  
  return res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'unhealthy',
    services,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
};

/**
 * Batch operation response
 */
const batchResponse = (res, results, message = 'Batch operation completed') => {
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  
  return res.status(200).json({
    success: true,
    message,
    summary: {
      total: results.length,
      successful,
      failed
    },
    results,
    timestamp: new Date().toISOString()
  });
};

/**
 * Export data response
 */
const exportResponse = (res, data, format, fileName, message = 'Data exported successfully') => {
  return res.status(200).json({
    success: true,
    message,
    export: {
      format,
      fileName,
      recordCount: Array.isArray(data) ? data.length : 0,
      downloadUrl: `/exports/${fileName}`
    },
    timestamp: new Date().toISOString()
  });
};

/**
 * Rate limit response
 */
const rateLimitResponse = (res, retryAfter = 60) => {
  res.setHeader('Retry-After', retryAfter);
  return errorResponse(
    res,
    `Too many requests. Please try again after ${retryAfter} seconds.`,
    429
  );
};

module.exports = {
  // Standard Responses
  successResponse,
  errorResponse,
  createdResponse,
  notFoundResponse,
  badRequestResponse,
  unauthorizedResponse,
  forbiddenResponse,
  validationErrorResponse,
  conflictResponse,
  tooManyRequestsResponse,
  internalServerErrorResponse,
  noContentResponse,
  customResponse,
  
  // List & Pagination
  paginatedResponse,
  listResponse,
  searchResponse,
  
  // File Responses
  fileResponse,
  jsonDownloadResponse,
  csvResponse,
  exportResponse,
  
  // Domain-Specific Responses
  analyticsResponse,
  bookingResponse,
  workerProfileResponse,
  authResponse,
  paymentResponse,
  notificationResponse,
  reviewResponse,
  aiRecommendationResponse,
  
  // Utility Responses
  healthCheckResponse,
  batchResponse,
  rateLimitResponse,
  
  // Error Formatters
  formatValidationErrors,
  formatMongooseErrors
};