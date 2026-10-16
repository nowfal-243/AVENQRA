const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const { getDemoNotifications, markDemoNotificationRead } = require('../data/demo-store');
const notificationService = require('../services/notification.service');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    let notifications = [];

    try {
      notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 30,
      });
    } catch (dbErr) {
      notifications = getDemoNotifications(userId);
    }

    return ApiResponse.success(res, 'Notifications retrieved', notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    let updated = null;
    try {
      updated = await prisma.notification.updateMany({
        where: { id, userId },
        data: { isRead: true },
      });
    } catch (dbErr) {
      updated = markDemoNotificationRead(id, userId);
    }

    return ApiResponse.success(res, 'Notification marked as read', updated);
  } catch (error) {
    next(error);
  }
};

exports.getDeliveryLogs = async (req, res, next) => {
  try {
    const logs = notificationService.getDeliveryLogs(50);
    return ApiResponse.success(res, 'Notification delivery audit logs', {
      total: logs.length,
      isDemoMode: notificationService.isDemoMode(),
      logs,
    });
  } catch (error) {
    next(error);
  }
};

exports.testDelivery = async (req, res, next) => {
  try {
    const { channel = 'WEBHOOK', message = 'Test corporation broadcast' } = req.body;
    const result = await notificationService.deliverExternal({
      channel,
      title: 'AVENQRA Test Dispatch',
      message,
      payload: { test: true, timestamp: new Date().toISOString() },
    });

    return ApiResponse.success(res, 'Test delivery executed', result);
  } catch (error) {
    next(error);
  }
};

