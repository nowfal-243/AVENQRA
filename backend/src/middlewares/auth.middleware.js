const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/api-response');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return ApiResponse.error(res, 'Access denied. No token provided.', 401);
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecret_jwt_key_avenqra_2026');
    req.user = decoded;
    next();
  } catch (error) {
    return ApiResponse.error(res, 'Invalid or expired token.', 401);
  }
};

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return ApiResponse.error(res, 'Forbidden. Insufficient permissions.', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
