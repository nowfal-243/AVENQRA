const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.createOfficer = async (req, res, next) => {
  try {
    const { name, email, password, phone, departmentId, badgeNumber } = req.body;

    if (!name || !email || !password || !badgeNumber) {
      return ApiResponse.error(res, 'Name, email, password, and badgeNumber are required.', 400);
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return ApiResponse.error(res, 'User with this email already exists.', 400);
    }

    const existingBadge = await prisma.officer.findUnique({ where: { badgeNumber } });
    if (existingBadge) {
      return ApiResponse.error(res, 'Officer with this badge number already exists.', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          name,
          email,
          password: hashedPassword,
          phone: phone || null,
          role: 'OFFICER',
          isVerified: true,
        },
      });

      const newOfficer = await tx.officer.create({
        data: {
          userId: newUser.id,
          badgeNumber,
          departmentId: departmentId || null,
          status: 'ACTIVE',
        },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          department: true,
        },
      });

      return newOfficer;
    });

    return ApiResponse.success(res, 'Field officer registered successfully', result, 201);
  } catch (error) {
    next(error);
  }
};

exports.getOfficers = async (req, res, next) => {
  try {
    const { departmentId, status } = req.query;
    const where = {};

    if (departmentId) where.departmentId = departmentId;
    if (status) where.status = status;

    let officers = [];
    try {
      officers = await prisma.officer.findMany({
        where,
        include: {
          user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
          department: { select: { id: true, name: true, code: true } },
          _count: { select: { assignments: true } },
        },
        orderBy: { badgeNumber: 'asc' },
      });
    } catch (dbErr) {
      const { getDemoOfficers } = require('../data/demo-store');
      officers = getDemoOfficers({ departmentId, status });
    }

    return ApiResponse.success(res, 'Field officers retrieved successfully', officers);
  } catch (error) {
    next(error);
  }
};

exports.getOfficerById = async (req, res, next) => {
  try {
    const { id } = req.params;

    let officer = null;
    try {
      officer = await prisma.officer.findUnique({
        where: { id },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          department: true,
          assignments: {
            include: { complaint: true },
            orderBy: { assignedAt: 'desc' },
          },
        },
      });
    } catch (dbErr) {
      const { getDemoOfficers } = require('../data/demo-store');
      officer = getDemoOfficers().find((o) => o.id === id || o.badgeNumber === id) || null;
    }

    if (!officer) {
      return ApiResponse.error(res, 'Officer not found.', 404);
    }

    return ApiResponse.success(res, 'Officer details retrieved', officer);
  } catch (error) {
    next(error);
  }
};

exports.updateOfficerStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, departmentId } = req.body;

    const updateData = {};
    if (status) {
      if (!['ACTIVE', 'ON_LEAVE', 'BUSY'].includes(status)) {
        return ApiResponse.error(res, 'Invalid status. Allowed values: ACTIVE, ON_LEAVE, BUSY', 400);
      }
      updateData.status = status;
    }
    if (departmentId !== undefined) {
      updateData.departmentId = departmentId;
    }

    const updated = await prisma.officer.update({
      where: { id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        department: true,
      },
    });

    return ApiResponse.success(res, 'Officer updated successfully', updated);
  } catch (error) {
    next(error);
  }
};
