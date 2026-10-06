const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return ApiResponse.success(res, 'Notifications retrieved', notifications);
  } catch (error) {
    next(error);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const updated = await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return ApiResponse.success(res, 'Notification marked as read', updated);
  } catch (error) {
    next(error);
  }
};
