const express = require('express');
const { createComplaint, getMyComplaints, getComplaintById, getComplaints, updateStatus } = require('../controllers/complaint.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

// Citizen Routes
router.post('/', upload.single('media'), createComplaint);
router.get('/my', getMyComplaints);
router.get('/:id', getComplaintById);

// Admin & Officer Routes
router.get('/', authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), getComplaints);
router.patch('/:id/status', authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), upload.single('resolutionImage'), updateStatus);

module.exports = router;
