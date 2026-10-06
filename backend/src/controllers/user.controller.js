const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.getProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
        isVerified: true,
        createdAt: true,
        citizenProfile: true,
        officerProfile: {
          include: { department: true },
        },
      },
    });

    if (!user) {
      return ApiResponse.error(res, 'User profile not found.', 404);
    }

    return ApiResponse.success(res, 'Profile retrieved successfully', user);
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, address, avatarUrl } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        name: name || undefined,
        phone: phone || undefined,
        avatarUrl: avatarUrl || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        avatarUrl: true,
      },
    });

    // Update Citizen address if provided
    if (address && req.user.role === 'CITIZEN') {
      await prisma.citizen.update({
        where: { userId },
        data: { address },
      });
    }

    return ApiResponse.success(res, 'Profile updated successfully', updatedUser);
  } catch (error) {
    next(error);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return ApiResponse.error(res, 'Current and new password are required.', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return ApiResponse.error(res, 'User not found.', 404);
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return ApiResponse.error(res, 'Incorrect current password.', 400);
    }

    const newHashedPassword = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { password: newHashedPassword },
    });

    return ApiResponse.success(res, 'Password changed successfully!');
  } catch (error) {
    next(error);
  }
};
