const express = require('express');
const {
  createComplaint,
  getKanbanComplaints,
  getMyComplaints,
  getComplaintById,
  getComplaints,
  updateStatus,
} = require('../controllers/complaint.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const upload = require('../middlewares/upload.middleware');

const router = express.Router();

router.use(authenticate);

// 3-Column Kanban Board Query Endpoint
router.get('/kanban', getKanbanComplaints);

// Citizen Routes
router.post('/', upload.single('media'), upload.pushToSupabase, createComplaint);
router.get('/my', getMyComplaints);
router.get('/:id', getComplaintById);

// Admin & Officer Routes
router.get('/', authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), getComplaints);

// `resolutionImage` is optional proof-of-fix evidence; multer accepts the
// multipart body, and the controller stores it only when present.
router.patch(
  '/:id/status',
  authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'),
  upload.single('resolutionImage'),
  upload.pushToSupabase,
  updateStatus
);

module.exports = router;
