const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const complaintRoutes = require('./complaint.routes');
const departmentRoutes = require('./department.routes');
const officerRoutes = require('./officer.routes');
const assignmentRoutes = require('./assignment.routes');
const feedbackRoutes = require('./feedback.routes');
const notificationRoutes = require('./notification.routes');
const insightsRoutes = require('./insights.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/user', userRoutes);
router.use('/complaints', complaintRoutes);
router.use('/departments', departmentRoutes);
router.use('/officers', officerRoutes);
router.use('/assignments', assignmentRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/notifications', notificationRoutes);
router.use('/', insightsRoutes);

module.exports = router;

