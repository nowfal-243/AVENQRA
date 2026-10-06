const express = require('express');
const { submitFeedback, getFeedbackByComplaint } = require('../controllers/feedback.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.post('/', submitFeedback);
router.get('/:complaintId', getFeedbackByComplaint);

module.exports = router;
