const express = require('express');
const { createOfficer, getOfficers, getOfficerById, updateOfficerStatus } = require('../controllers/officer.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validateUUID } = require('../middlewares/validation.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('DEPARTMENT_ADMIN', 'SUPER_ADMIN', 'OFFICER'), getOfficers);
router.post('/', authorize('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), createOfficer);
router.get('/:id', validateUUID('id'), getOfficerById);
router.patch('/:id/status', validateUUID('id'), authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), updateOfficerStatus);

module.exports = router;
