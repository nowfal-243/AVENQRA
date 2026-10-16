const express = require('express');
const { authenticate } = require('../middlewares/auth.middleware');
const { ask, executeAction } = require('../controllers/assistant.controller');

const router = express.Router();

// Protect every assistant endpoint with authentication
router.use(authenticate);

/**
 * POST /api/v1/assistant/ask
 *
 * Ask the civic AI assistant a question.
 */
router.post('/ask', ask);

/**
 * POST /api/v1/assistant/action
 *
 * Execute a confirmed consequential action.
 */
router.post('/action', executeAction);

module.exports = router;

