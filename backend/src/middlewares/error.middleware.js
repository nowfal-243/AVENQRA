const ApiResponse = require('../utils/api-response');

const errorHandler = (err, req, res, next) => {
  console.error('Unhandled Error:', err?.message);

  const statusCode = err.statusCode || 500;
  // Never leak file paths / stack traces to the browser (was showing
  // backend/.../complaint.controller.js:351 in the demo banner).
  // Match only genuine *connectivity* failures. A broad /prisma/i test is
  // wrong: it also caught ordinary query errors (e.g. a foreign-key violation
  // from a stale JWT) and told the user to start Postgres when the database
  // was healthy.
  const isDbDown =
    /can't reach database server|localhost:5432|connect ECONNREFUSED|P1001|P1002|P1017|P2024/i.test(
      err?.message || ''
    );
  const message = isDbDown
    ? 'Database unavailable. Start Postgres (docker-compose up postgres) and retry.'
    : statusCode >= 500
      ? 'Something went wrong on the server. Please retry.'
      : err.message || 'Request failed.';

  return ApiResponse.error(res, message, statusCode);
};

module.exports = { errorHandler };
