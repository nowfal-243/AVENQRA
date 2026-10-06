const ApiResponse = require('../utils/api-response');

exports.validateBody = (requiredFields) => {
  return (req, res, next) => {
    const missing = [];
    for (const field of requiredFields) {
      if (req.body[field] === undefined || req.body[field] === null || req.body[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return ApiResponse.error(res, `Missing required fields: ${missing.join(', ')}`, 400);
    }
    next();
  };
};

exports.validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    if (value && !uuidRegex.test(value)) {
      return ApiResponse.error(res, `Invalid UUID format for parameter '${paramName}'`, 400);
    }
    next();
  };
};
