const express = require('express');
const { getProfile, updateProfile, changePassword } = require('../controllers/user.controller');
const { authenticate } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.post('/change-password', changePassword);

module.exports = router;
