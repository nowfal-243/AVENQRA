const express = require('express');
const { getMyNotifications, markAsRead } = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/', getMyNotifications);
router.patch('/:id/read', markAsRead);

module.exports = router;
