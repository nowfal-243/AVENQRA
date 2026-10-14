const fs = require('fs');
const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const StorageService = require('../services/storage.service');
const aiService = require('../services/ai.service');

/**
 * Read an uploaded file back into memory so it can be forwarded to the AI
 * microservice. The upload middleware uses diskStorage, so `req.file.buffer`
 * is not populated — the bytes live at `req.file.path`.
 */
function readUploadedFile(file) {
  if (!file) return null;
  if (file.buffer) return file.buffer;
  if (!file.path) return null;
  try {
    return fs.readFileSync(file.path);
  } catch (error) {
    console.warn('[AVENQRA] Could not read uploaded file for AI analysis:', error.message);
    return null;
  }
}

exports.createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !latitude || !longitude) {
      return ApiResponse.error(res, 'Title, description, category, latitude, and longitude are required.', 400);
    }

    // Resolve citizen profile ID. `userId` comes from a signed JWT, which can
    // outlive the user row it points at (the database may be re-seeded while a
    // browser still holds an older session token). Verify the parent user
    // exists so a stale token yields a clear 401 instead of an opaque Prisma
    // foreign-key violation, and so the error is not mistaken for a DB outage.
    const account = await prisma.user.findUnique({ where: { id: userId } });
    if (!account) {
      return ApiResponse.error(res, 'Your session has expired. Please sign in again.', 401);
    }

    let citizen = await prisma.citizen.findUnique({ where: { userId } });
    if (!citizen) {
      citizen = await prisma.citizen.create({ data: { userId } });
    }

    const ticketNumber = `AVN-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Build media image URL
    let imageUrl = null;
    if (req.file) {
      imageUrl = StorageService.getFileUrl(req.file);
    } else if (req.files && req.files.length > 0) {
      imageUrl = StorageService.getFileUrl(req.files[0]);
    }

    // Nearest Municipal Authority Resolution
    // Match department based on category keywords
    let matchedCode = 'ROAD';
    const catLower = category.toLowerCase();
    if (catLower.includes('waste') || catLower.includes('garbage')) matchedCode = 'WASTE';
    else if (catLower.includes('water') || catLower.includes('sewage')) matchedCode = 'WATER';
    else if (catLower.includes('light') || catLower.includes('electrical')) matchedCode = 'ELEC';
    else if (catLower.includes('drain') || catLower.includes('flood')) matchedCode = 'DRAIN';

    const department = await prisma.department.findFirst({ where: { code: matchedCode } });

    // Auto-assign to nearest active officer if available
    let officerToAssign = null;
    if (department) {
      officerToAssign = await prisma.officer.findFirst({
        where: { departmentId: department.id, status: 'ACTIVE' },
      });
    }

    // Create Complaint inside Prisma Transaction
    const complaint = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          ticketNumber,
          citizenId: citizen.id,
          departmentId: department ? department.id : undefined,
          title,
          description,
          category,
          currentStatus: officerToAssign ? 'ASSIGNED' : 'SUBMITTED',
          priority: 'MEDIUM',
        },
      });

      // Save Location details
      await tx.location.create({
        data: {
          complaintId: newComplaint.id,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          addressFormatted: address || 'Current Location',
        },
      });

      // Save Complaint Image if uploaded
      if (imageUrl) {
        await tx.complaintImage.create({
          data: {
            complaintId: newComplaint.id,
            imageUrl,
            imageType: 'INITIAL',
          },
        });
      }

      // Auto-dispatch officer if nearest officer found
      if (officerToAssign) {
        await tx.assignment.create({
          data: {
            complaintId: newComplaint.id,
            officerId: officerToAssign.id,
          },
        });

        await tx.notification.create({
          data: {
            userId: officerToAssign.userId,
            title: 'New Nearby Task Auto-Dispatched',
            message: `You have been assigned to Ticket #${ticketNumber}: ${title}`,
          },
        });
      }

      // Log Initial Status
      await tx.complaintStatusLog.create({
        data: {
          complaintId: newComplaint.id,
          status: officerToAssign ? 'ASSIGNED' : 'SUBMITTED',
          remarks: officerToAssign
            ? `Auto-dispatched to nearest municipal officer (Badge #${officerToAssign.badgeNumber})`
            : 'Complaint filed and pending officer dispatch',
          updatedById: userId,
        },
      });

      // Increment citizen total complaints counter
      await tx.citizen.update({
        where: { id: citizen.id },
        data: { totalComplaints: { increment: 1 } },
      });

      return newComplaint;
    });

    // Trigger AI Microservice Analysis
    // aiService.analyzeComplaint never throws — it degrades to a safe default.
    // Recent reports in the same department are supplied so the AI service can
    // perform geospatial + perceptual duplicate detection.
    const nearbyComplaints = await prisma.complaint.findMany({
      where: department ? { departmentId: department.id } : {},
      take: 200,
      orderBy: { createdAt: 'desc' },
      select: {
        ticketNumber: true,
        category: true,
        createdAt: true,
        location: { select: { latitude: true, longitude: true } },
      },
    });

    const aiResult = await aiService.analyzeComplaint({
      category,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      description,
      fileBuffer: readUploadedFile(req.file),
      filename: req.file ? req.file.originalname : null,
      existingComplaints: nearbyComplaints.map((c) => ({
        ticketNumber: c.ticketNumber,
        category: c.category,
        latitude: c.location ? c.location.latitude : null,
        longitude: c.location ? c.location.longitude : null,
      })),
    });

    if (aiResult) {
      // The AI service returns `severity_score`/`priority`/`composite_score`.
      const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const aiPriority = VALID_PRIORITIES.includes(aiResult.priority) ? aiResult.priority : 'MEDIUM';
      const severityScore = Number(aiResult.severity_score);

      await prisma.aIAnalysis.create({
        data: {
          complaintId: complaint.id,
          predictedCategory: aiResult.category || category,
          confidenceScore: aiResult.confidence || 0.90,
          severityScore: Number.isFinite(severityScore) ? severityScore : 5.0,
          isDuplicate: aiResult.isDuplicate || false,
        },
      });

      // Apply the AI's priority when it is more urgent than the MEDIUM
      // default assigned at creation time; never downgrade a ticket.
      const priorityRank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
      if (priorityRank[aiPriority] > priorityRank[complaint.priority]) {
        await prisma.complaint.update({
          where: { id: complaint.id },
          data: { priority: aiPriority },
        });
      }

      if (aiResult.isDuplicate && aiResult.duplicate_ticket) {
        console.info(
          `[AVENQRA] Ticket #${ticketNumber} flagged as a possible duplicate of #${aiResult.duplicate_ticket} ` +
          `(${aiResult.distance_meters ?? 0}m away).`
        );
      }
    }

    // Retrieve full complaint record
    const fullComplaint = await prisma.complaint.findUnique({
      where: { id: complaint.id },
      include: {
        images: true,
        location: true,
        aiAnalysis: true,
        department: true,
      },
    });

    // --- ADDITIVE: durable corporation notification + realtime (never blocks save) ---
    try {
      const Notify = require('../services/notification.service');
      const slaMin = parseInt(process.env.SLA_MINUTES || '30', 10);
      const slaDeadline = new Date(new Date(fullComplaint.createdAt).getTime() + slaMin * 60000).toISOString();
      const msg = Notify.buildComplaintMessage({
        ticketNumber, title, category, severity: fullComplaint.priority,
        address: fullComplaint.location?.addressFormatted, departmentName: fullComplaint.department?.name,
        officerName: officerToAssign ? `Badge #${officerToAssign.badgeNumber}` : null,
        createdAt: fullComplaint.createdAt, slaDeadline, linkPath: `#/complaints?focus=${fullComplaint.id}`,
      });
      if (officerToAssign) Notify.notify({ userId: officerToAssign.userId, title: `New task ${ticketNumber}`, message: msg, kind: 'complaint:submitted', complaintId: fullComplaint.id, payload: { ticketNumber } });
      const realtime = require('../services/realtime.service');
      const supers = await prisma.user.findMany({ where: { role: 'SUPER_ADMIN' }, select: { id: true } });
      realtime.emitToUsers(supers.map((u) => u.id), 'complaint:created', fullComplaint);
      if (officerToAssign) realtime.emitToUser(officerToAssign.userId, 'complaint:assigned', fullComplaint);
    } catch (e) { console.warn('[AVENQRA] post-create notify skipped:', e.message); }

    return ApiResponse.success(res, 'Complaint submitted & nearest municipal officer dispatched!', fullComplaint, 201);
  } catch (error) {
    next(error);
  }
};

exports.getKanbanComplaints = async (req, res, next) => {
  try {
    const complaints = await prisma.complaint.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        citizen: { include: { user: { select: { name: true, email: true } } } },
        department: { select: { name: true, code: true } },
        images: true,
        location: true,
        aiAnalysis: true,
        assignments: { include: { officer: { include: { user: { select: { name: true } } } } } },
      },
    });

    // Structure into 3 Columns: Newly Assigned, Pending / Escalated, Completed
    const newlyAssigned = complaints.filter(
      (c) => c.currentStatus === 'SUBMITTED' || c.currentStatus === 'ASSIGNED'
    );
    const pending = complaints.filter(
      (c) => c.currentStatus === 'IN_PROGRESS' || c.currentStatus === 'ESCALATED'
    );
    const completed = complaints.filter(
      (c) => c.currentStatus === 'RESOLVED' || c.currentStatus === 'REJECTED'
    );

    return ApiResponse.success(res, '3-Column Kanban complaints retrieved successfully', {
      newlyAssigned,
      pending,
      completed,
    });
  } catch (error) {
    next(error);
  }
};

exports.getMyComplaints = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const citizen = await prisma.citizen.findUnique({ where: { userId } });

    if (!citizen) {
      return ApiResponse.success(res, 'No complaints found', []);
    }

    const { status, category } = req.query;
    const where = { citizenId: citizen.id };

    if (status) where.currentStatus = status;
    if (category) where.category = category;

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        images: true,
        location: true,
        aiAnalysis: true,
        department: { select: { name: true, code: true } },
      },
    });

    return ApiResponse.success(res, 'Citizen complaints retrieved successfully', complaints);
  } catch (error) {
    next(error);
  }
};

exports.getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const complaint = await prisma.complaint.findUnique({
      where: { id },
      include: {
        citizen: { include: { user: { select: { name: true, email: true, phone: true } } } },
        department: true,
        images: true,
        location: true,
        aiAnalysis: true,
        statusLogs: {
          orderBy: { changedAt: 'asc' },
          include: { updatedBy: { select: { name: true, role: true } } },
        },
        assignments: {
          include: { officer: { include: { user: { select: { name: true, phone: true } } } } },
        },
        feedback: true,
      },
    });

    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found', 404);
    }

    return ApiResponse.success(res, 'Complaint details retrieved', complaint);
  } catch (error) {
    next(error);
  }
};

exports.getComplaints = async (req, res, next) => {
  try {
    const { status, category } = req.query;
    const where = {};

    if (status) where.currentStatus = status;
    if (category) where.category = category;

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        citizen: { include: { user: { select: { name: true, email: true } } } },
        department: { select: { name: true, code: true } },
        images: true,
        location: true,
        aiAnalysis: true,
      },
    });

    return ApiResponse.success(res, 'Complaints list retrieved', complaints);
  } catch (error) {
    next(error);
  }
};

exports.updateStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, remarks } = req.body;
    const userId = req.user.id;

    if (!status) {
      return ApiResponse.error(res, 'A target status is required.', 400);
    }

    const VALID_STATUSES = ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS', 'ESCALATED', 'RESOLVED', 'REJECTED'];
    if (!VALID_STATUSES.includes(status)) {
      return ApiResponse.error(res, `Invalid status "${status}".`, 400);
    }

    const existing = await prisma.complaint.findUnique({ where: { id } });
    if (!existing) {
      return ApiResponse.error(res, 'Complaint not found', 404);
    }

    // Persist optional proof-of-resolution evidence uploaded by the officer.
    let resolutionImageUrl = null;
    if (req.file) {
      resolutionImageUrl = StorageService.getFileUrl(req.file);
    }
    const now = new Date();
    const updated = await prisma.$transaction(async (tx) => {
      const row = await tx.complaint.update({
        where: { id },
        data: {
          currentStatus: status,
          // Escalation raises priority to CRITICAL, matching the SLA worker.
          ...(status === 'ESCALATED'
            ? { isEscalated: true, escalatedAt: existing.escalatedAt || now, priority: 'CRITICAL' }
            : {}),
        },
      });

      if (resolutionImageUrl) {
        await tx.complaintImage.create({
          data: { complaintId: id, imageUrl: resolutionImageUrl, imageType: 'RESOLUTION' },
        });
      }

      await tx.complaintStatusLog.create({
        data: {
          complaintId: id,
          status,
          remarks: remarks || `Status updated to ${status}`,
          updatedById: userId,
        },
      });

      // Notify the owning citizen once work is finished or refused.
      // Notification.userId references User, so resolve citizen -> userId.
      if (status === 'RESOLVED' || status === 'REJECTED') {
        const citizen = await tx.citizen.findUnique({ where: { id: existing.citizenId } });
        if (citizen) {
          await tx.notification.create({
            data: {
              userId: citizen.userId,
              title: status === 'RESOLVED'
                ? `✅ Ticket #${existing.ticketNumber} resolved`
                : `Ticket #${existing.ticketNumber} closed without resolution`,
              message: status === 'RESOLVED'
                ? `Your report "${existing.title}" has been marked as resolved.`
                : `Your report "${existing.title}" was closed as ${status.toLowerCase()}. ${remarks || ''}`.trim(),
            },
          });
        }
      }

      return row;
    });

    // ADDITIVE: realtime broadcast for status transitions (best-effort).
    try {
      const realtime = require('../services/realtime.service');
      const ev = status === 'RESOLVED' ? 'complaint:completed' : status === 'ESCALATED' ? 'complaint:escalated' : 'complaint:statusUpdated';
      const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'] } }, select: { id: true } });
      realtime.emitToUsers(admins.map((u) => u.id), ev, updated);
    } catch (e) { console.warn('[AVENQRA] status realtime skipped:', e.message); }

    return ApiResponse.success(res, 'Complaint status updated', updated);
  } catch (error) {
    next(error);
  }
};
