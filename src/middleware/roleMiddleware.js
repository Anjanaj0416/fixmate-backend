/**
 * Role-Based Access Control Middleware
 * Checks if user has required role(s) to access a route
 */

/**
 * Check if user has one of the allowed roles
 * @param {Array<string>} allowedRoles - Array of role names that are allowed
 * @returns {Function} Express middleware function
 */
exports.roleMiddleware = (allowedRoles) => {
  // Validate input
  if (!Array.isArray(allowedRoles) || allowedRoles.length === 0) {
    throw new Error('roleMiddleware requires an array of allowed roles');
  }

  return (req, res, next) => {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please login to access this resource.'
      });
    }

    // Check if user has required role
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. This resource requires one of the following roles: ${allowedRoles.join(', ')}`,
        requiredRoles: allowedRoles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user is a customer
 */
exports.isCustomer = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'customer') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This resource is only available to customers.'
    });
  }

  next();
};

/**
 * Check if user is a worker
 */
exports.isWorker = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'worker') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This resource is only available to workers.'
    });
  }

  next();
};

/**
 * Check if user is an admin
 */
exports.isAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This resource is only available to administrators.'
    });
  }

  next();
};

/**
 * Check if user is either customer or admin
 */
exports.isCustomerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'customer' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This resource is only available to customers and administrators.'
    });
  }

  next();
};

/**
 * Check if user is either worker or admin
 */
exports.isWorkerOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role !== 'worker' && req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. This resource is only available to workers and administrators.'
    });
  }

  next();
};

/**
 * Check if user is NOT an admin (for testing/development)
 */
exports.isNotAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.role === 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Access denied. Admins cannot perform this action.'
    });
  }

  next();
};

/**
 * Check if user has ANY of the specified roles (OR condition)
 * @param {Array<string>} roles - Array of allowed roles
 */
exports.hasAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Insufficient permissions.',
        requiredRoles: roles,
        userRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Check if user has ALL of the specified permissions (AND condition)
 * This is a placeholder for future permission-based access control
 * @param {Array<string>} permissions - Array of required permissions
 */
exports.hasAllPermissions = (permissions) => {
  return (req, res, next) => {
    // In a more complex system, you would check user's permissions from database
    // For now, we'll use role-based logic
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    // For other roles, implement permission checking logic
    // This is a placeholder for future enhancement
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have the required permissions.',
      requiredPermissions: permissions
    });
  };
};

/**
 * Validate user account status
 * Ensures user account is active
 */
exports.requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required'
    });
  }

  if (req.user.accountStatus !== 'active') {
    return res.status(403).json({
      success: false,
      message: `Access denied. Account status: ${req.user.accountStatus}`,
      accountStatus: req.user.accountStatus
    });
  }

  next();
};

/**
 * Log role access for auditing
 * Useful for tracking who accessed what
 */
exports.logRoleAccess = (req, res, next) => {
  if (req.user) {
    console.log(`[Role Access] ${req.user.role} (${req.user.email}) accessed ${req.method} ${req.path}`);
  }
  next();
};