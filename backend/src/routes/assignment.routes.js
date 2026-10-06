const express = require('express');
const { assignOfficer, getAssignmentsByOfficer, getMyAssignments } = require('../controllers/assignment.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validateBody, validateUUID } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/my', authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), getMyAssignments);
router.post('/', authorize('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), validateBody(['complaintId', 'officerId']), assignOfficer);
router.get('/officer/:officerId', validateUUID('officerId'), getAssignmentsByOfficer);

module.exports = router;
