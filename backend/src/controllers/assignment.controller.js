const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.assignOfficer = async (req, res, next) => {
  try {
    const { complaintId, officerId } = req.body;
    const adminId = req.user.id;

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    const officer = await prisma.officer.findUnique({ where: { id: officerId } });
    if (!officer) {
      return ApiResponse.error(res, 'Field Officer not found.', 404);
    }

    const assignment = await prisma.$transaction(async (tx) => {
      // 1. Create assignment record
      const newAssignment = await tx.assignment.create({
        data: {
          complaintId,
          officerId,
          assignedById: adminId,
        },
      });

      // 2. Update complaint status to ASSIGNED
      await tx.complaint.update({
        where: { id: complaintId },
        data: { currentStatus: 'ASSIGNED' },
      });

      // 3. Log status change audit
      await tx.complaintStatusLog.create({
        data: {
          complaintId,
          status: 'ASSIGNED',
          remarks: `Assigned to Officer Badge #${officer.badgeNumber}`,
          updatedById: adminId,
        },
      });

      // 4. Send notification to Officer
      await tx.notification.create({
        data: {
          userId: officer.userId,
          title: 'New Complaint Assignment',
          message: `You have been assigned to Ticket #${complaint.ticketNumber}: ${complaint.title}`,
        },
      });

      return newAssignment;
    });

    return ApiResponse.success(res, 'Field Officer dispatched successfully', assignment, 201);
  } catch (error) {
    next(error);
  }
};

exports.getAssignmentsByOfficer = async (req, res, next) => {
  try {
    const { officerId } = req.params;

    const assignments = await prisma.assignment.findMany({
      where: { officerId },
      orderBy: { assignedAt: 'desc' },
      include: {
        complaint: {
          include: {
            images: true,
            location: true,
            aiAnalysis: true,
            department: { select: { id: true, name: true, code: true } },
            citizen: { include: { user: { select: { name: true, email: true, phone: true } } } },
          },
        },
      },
    });

    return ApiResponse.success(res, 'Officer assignments retrieved successfully', assignments);
  } catch (error) {
    next(error);
  }
};

exports.getMyAssignments = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const officer = await prisma.officer.findUnique({ where: { userId } });
    if (!officer) {
      return ApiResponse.error(res, 'Officer profile not found for user', 404);
    }

    const assignments = await prisma.assignment.findMany({
      where: { officerId: officer.id },
      orderBy: { assignedAt: 'desc' },
      include: {
        complaint: {
          include: {
            images: true,
            location: true,
            aiAnalysis: true,
            department: { select: { id: true, name: true, code: true } },
            citizen: { include: { user: { select: { name: true, email: true, phone: true } } } },
            statusLogs: {
              orderBy: { changedAt: 'asc' },
              include: { updatedBy: { select: { name: true, role: true } } },
            },
          },
        },
      },
    });

    return ApiResponse.success(res, 'My assignments retrieved successfully', assignments);
  } catch (error) {
    next(error);
  }
};
