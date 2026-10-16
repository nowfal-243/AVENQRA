const express = require('express');
const {
  getMyNotifications,
  markAsRead,
  getDeliveryLogs,
  testDelivery,
} = require('../controllers/notification.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);
router.get('/delivery-log', authorize('OFFICER', 'DEPARTMENT_ADMIN', 'SUPER_ADMIN'), getDeliveryLogs);
router.post('/test-delivery', authorize('DEPARTMENT_ADMIN', 'SUPER_ADMIN'), testDelivery);

module.exports = router;

