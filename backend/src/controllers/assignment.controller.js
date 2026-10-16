const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const notificationService = require('../services/notification.service');
const realtime = require('../services/realtime.service');
const { getDemoComplaintById, updateDemoComplaint, addDemoNotification } = require('../data/demo-store');

exports.assignOfficer = async (req, res, next) => {
  try {
    const { complaintId, officerId } = req.body;
    const adminId = req.user.id;

    let complaint = null;
    let officer = null;

    try {
      complaint = await prisma.complaint.findUnique({
        where: { id: complaintId },
        include: { department: true, location: true },
      });
      officer = await prisma.officer.findUnique({
        where: { id: officerId },
        include: { user: true },
      });
    } catch (dbErr) {
      // Demo store fallback
      complaint = getDemoComplaintById(complaintId);
      officer = {
        id: officerId || 'demo-off-1',
        userId: 'officer-demo-uuid-202',
        badgeNumber: 'OFF-901',
        user: { name: 'Field Officer Rajesh' },
      };
    }

    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    if (!officer) {
      return ApiResponse.error(res, 'Field Officer not found.', 404);
    }

    let assignment = null;

    try {
      assignment = await prisma.$transaction(async (tx) => {
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

        return newAssignment;
      });
    } catch (dbErr) {
      // Demo store mutation
      assignment = {
        id: `demo-as-${Date.now()}`,
        complaintId,
        officerId,
        assignedById: adminId,
        assignedAt: new Date().toISOString(),
        officer,
      };
      updateDemoComplaint(complaintId, {
        currentStatus: 'ASSIGNED',
        assignments: [assignment],
      });
    }

    // Send durable notification to Officer and external notification channels
    const slaMin = parseInt(process.env.SLA_MINUTES || '30', 10);
    const slaDeadline = new Date(new Date(complaint.createdAt).getTime() + slaMin * 60000).toISOString();
    const msg = notificationService.buildComplaintMessage({
      ticketNumber: complaint.ticketNumber,
      title: complaint.title,
      category: complaint.category,
      severity: complaint.priority,
      address: complaint.location?.addressFormatted,
      departmentName: complaint.department?.name,
      officerName: `Badge #${officer.badgeNumber} (${officer.user?.name || 'Officer'})`,
      createdAt: complaint.createdAt,
      slaDeadline,
      linkPath: `#/complaints?focus=${complaint.id}`,
    });

    await notificationService.notify({
      userId: officer.userId,
      title: `Dispatched: Ticket #${complaint.ticketNumber}`,
      message: msg,
      kind: 'complaint:assigned',
      complaintId: complaint.id,
      payload: {
        ticketNumber: complaint.ticketNumber,
        officerBadge: officer.badgeNumber,
        departmentName: complaint.department?.name,
        slaDeadline,
      },
    });

    // Realtime event emission
    try {
      const updatedComplaint = {
        ...complaint,
        currentStatus: 'ASSIGNED',
        officer: { badgeNumber: officer.badgeNumber, name: officer.user?.name },
      };
      realtime.emitToUser(officer.userId, 'complaint:assigned', updatedComplaint);
      realtime.emitToUsers([adminId, 'admin-demo-uuid-101'], 'complaint:assigned', updatedComplaint);
    } catch (e) {
      console.warn('[AVENQRA] realtime assignment notify skipped:', e.message);
    }

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
