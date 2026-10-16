const dbModule = require('../config/db');
const prisma = dbModule.prisma || dbModule;
const ApiResponse = require('../utils/api-response');
const assistantService = require('../services/assistant.service');

/**
 * POST /api/v1/assistant/ask
 *
 * Ask the civic AI assistant a question (e.g. "show me overdue complaints").
 *
 * The answer is computed from live Prisma data via the rules engine in
 * `assistant.service.js`. The result envelope exposes { text, data, source,
 * provider, suggested, note } so the React UI can render it cleanly.
 */
exports.ask = async (req, res, next) => {
  try {
    const question = req.body.question || req.body.message;
    const slaMinutes = req.body.slaMinutes;
    const user = req.user;

    if (!question || typeof question !== 'string' || !String(question).trim()) {
      return ApiResponse.error(res, 'Question text is required.', 400);
    }

    const fetched = await assistantService.accessibleComplaints(user, { take: 400 });
    const rows = fetched.rows || fetched;
    const live = fetched.live !== false;
    const answer = await assistantService.ask(user, question, {
      slaMinutes: slaMinutes || 30,
      rows,
    });
    // `ask()` defaults to live when rows are pre-supplied — restore the real flag.
    if (!live) { answer.source = 'rules-demo'; answer.note = 'Rule-based summary from demo data (PostgreSQL unreachable).'; }

    return ApiResponse.success(res, 'Assistant response', answer);
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/v1/assistant/action
 *
 * Execute a confirmed consequential action (escalate, mark resolved).
 * Validates authenticated user role and transition rules.
 */
exports.executeAction = async (req, res, next) => {
  try {
    const { action, complaintId, targetId, targetStatus, remarks } = req.body;
    const cid = complaintId || targetId;
    const user = req.user;

    // Check authorization: only authorized personnel can perform consequential workflow updates
    if (!['OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return ApiResponse.error(res, 'You do not have permission to execute this complaint action.', 403);
    }

    if (!cid) {
      return ApiResponse.error(res, 'Complaint ID is required.', 400);
    }

    const complaintController = require('./complaint.controller');
    req.params = { id: cid };
    req.body = {
      status: targetStatus || (action === 'ESCALATE' ? 'ESCALATED' : 'RESOLVED'),
      remarks: remarks || `[AI Assistant Action confirmed by ${user.name || user.email}]`,
    };

    return complaintController.updateStatus(req, res, next);
  } catch (error) {
    next(error);
  }
};


