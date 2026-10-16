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
    let deptName = 'Roads & Transport';
    const catLower = category.toLowerCase();
    if (catLower.includes('waste') || catLower.includes('garbage')) { matchedCode = 'WASTE'; deptName = 'Waste Management'; }
    else if (catLower.includes('water') || catLower.includes('sewage')) { matchedCode = 'WATER'; deptName = 'Water Supply'; }
    else if (catLower.includes('light') || catLower.includes('electrical')) { matchedCode = 'ELEC'; deptName = 'Electrical'; }
    else if (catLower.includes('drain') || catLower.includes('flood')) { matchedCode = 'DRAIN'; deptName = 'Drainage & Flood'; }

    let department = null;
    let officerToAssign = null;
    let complaint = null;

    try {
      const account = await prisma.user.findUnique({ where: { id: userId } });
      if (!account && !userId.startsWith('admin-demo') && !userId.startsWith('officer-demo') && !userId.startsWith('demo-')) {
        return ApiResponse.error(res, 'Your session has expired. Please sign in again.', 401);
      }

      let citizen = await prisma.citizen.findUnique({ where: { userId } });
      if (!citizen && account) {
        citizen = await prisma.citizen.create({ data: { userId } });
      }

      department = await prisma.department.findFirst({ where: { code: matchedCode } });

      if (department) {
        officerToAssign = await prisma.officer.findFirst({
          where: { departmentId: department.id, status: 'ACTIVE' },
          include: { user: true },
        });
      }

      // Create Complaint inside Prisma Transaction
      complaint = await prisma.$transaction(async (tx) => {
        const newComplaint = await tx.complaint.create({
          data: {
            ticketNumber,
            citizenId: citizen?.id || 'demo-cit-1',
            departmentId: department ? department.id : undefined,
            title,
            description,
            category,
            currentStatus: officerToAssign ? 'ASSIGNED' : 'SUBMITTED',
            priority: 'MEDIUM',
          },
        });

        await tx.location.create({
          data: {
            complaintId: newComplaint.id,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            addressFormatted: address || 'Current Location',
          },
        });

        if (imageUrl) {
          await tx.complaintImage.create({
            data: {
              complaintId: newComplaint.id,
              imageUrl,
              imageType: 'INITIAL',
            },
          });
        }

        if (officerToAssign) {
          await tx.assignment.create({
            data: {
              complaintId: newComplaint.id,
              officerId: officerToAssign.id,
            },
          });
        }

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

        if (citizen) {
          await tx.citizen.update({
            where: { id: citizen.id },
            data: { totalComplaints: { increment: 1 } },
          });
        }

        return newComplaint;
      });
    } catch (dbErr) {
      // Demo store mutation fallback
      const { createDemoComplaint } = require('../data/demo-store');
      officerToAssign = {
        id: 'demo-off-1',
        userId: 'officer-demo-uuid-202',
        badgeNumber: 'OFF-901',
        user: { name: 'Field Officer Rajesh' },
      };
      complaint = createDemoComplaint({
        ticketNumber,
        citizenId: 'demo-cit-1',
        departmentId: `dept-${matchedCode.toLowerCase()}`,
        department: { id: `dept-${matchedCode.toLowerCase()}`, name: deptName, code: matchedCode },
        title,
        description,
        category,
        currentStatus: 'ASSIGNED',
        priority: 'MEDIUM',
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || 'Reported Location',
      });
      if (imageUrl) {
        complaint.images = [{ id: `img-${Date.now()}`, imageUrl, imageType: 'INITIAL' }];
      }
    }


    // Trigger AI Microservice Analysis
    // aiService.analyzeComplaint never throws — it degrades to a safe default.
    let nearbyComplaints = [];
    try {
      nearbyComplaints = await prisma.complaint.findMany({
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
    } catch (e) {
      const { getDemoComplaints } = require('../data/demo-store');
      nearbyComplaints = getDemoComplaints();
    }

    let aiResult = null;
    try {
      aiResult = await aiService.analyzeComplaint({
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
    } catch (e) {
      console.warn('[AVENQRA] AI microservice call failed, continuing with rule defaults:', e.message);
    }

    if (aiResult) {
      const VALID_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      const aiPriority = VALID_PRIORITIES.includes(aiResult.priority) ? aiResult.priority : 'MEDIUM';
      const severityScore = Number(aiResult.severity_score);

      try {
        await prisma.aIAnalysis.create({
          data: {
            complaintId: complaint.id,
            predictedCategory: aiResult.category || category,
            confidenceScore: aiResult.confidence || 0.90,
            severityScore: Number.isFinite(severityScore) ? severityScore : 5.0,
            isDuplicate: aiResult.isDuplicate || false,
          },
        });

        const priorityRank = { LOW: 0, MEDIUM: 1, HIGH: 2, CRITICAL: 3 };
        if (priorityRank[aiPriority] > priorityRank[complaint.priority]) {
          await prisma.complaint.update({
            where: { id: complaint.id },
            data: { priority: aiPriority },
          });
        }
      } catch (dbErr) {
        complaint.priority = aiPriority;
        complaint.aiAnalysis = {
          predictedCategory: aiResult.category || category,
          confidenceScore: aiResult.confidence || 0.90,
          severityScore: Number.isFinite(severityScore) ? severityScore : 5.0,
          isDuplicate: aiResult.isDuplicate || false,
        };
      }

      if (aiResult.isDuplicate && aiResult.duplicate_ticket) {
        console.info(
          `[AVENQRA] Ticket #${ticketNumber} flagged as a possible duplicate of #${aiResult.duplicate_ticket} ` +
          `(${aiResult.distance_meters ?? 0}m away).`
        );
      }
    }

    // Retrieve full complaint record
    let fullComplaint = null;
    try {
      fullComplaint = await prisma.complaint.findUnique({
        where: { id: complaint.id },
        include: {
          images: true,
          location: true,
          aiAnalysis: true,
          department: true,
        },
      });
    } catch (e) {
      // Use in-memory complaint
    }
    if (!fullComplaint) {
      fullComplaint = complaint;
    }


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
    let complaints = [];
    try {
      complaints = await prisma.complaint.findMany({
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
    } catch (dbErr) {
      const { getDemoComplaints } = require('../data/demo-store');
      complaints = getDemoComplaints();
    }

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
    let complaints = [];

    try {
      const citizen = await prisma.citizen.findUnique({ where: { userId } });
      if (!citizen) {
        return ApiResponse.success(res, 'No complaints found', []);
      }

      const { status, category } = req.query;
      const where = { citizenId: citizen.id };

      if (status) where.currentStatus = status;
      if (category) where.category = category;

      complaints = await prisma.complaint.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: {
          images: true,
          location: true,
          aiAnalysis: true,
          department: { select: { name: true, code: true } },
        },
      });
    } catch (dbErr) {
      const { getDemoComplaints } = require('../data/demo-store');
      complaints = getDemoComplaints().slice(0, 3);
    }

    return ApiResponse.success(res, 'Citizen complaints retrieved successfully', complaints);
  } catch (error) {
    next(error);
  }
};

exports.getComplaintById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let complaint = null;

    try {
      complaint = await prisma.complaint.findUnique({
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
    } catch (dbErr) {
      const { getDemoComplaintById } = require('../data/demo-store');
      complaint = getDemoComplaintById(id);
    }

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
    let complaints = [];

    try {
      const where = {};
      if (status) where.currentStatus = status;
      if (category) where.category = category;

      complaints = await prisma.complaint.findMany({
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
    } catch (dbErr) {
      const { getDemoComplaints } = require('../data/demo-store');
      complaints = getDemoComplaints();
      if (status) complaints = complaints.filter((c) => c.currentStatus === status);
      if (category) complaints = complaints.filter((c) => c.category === category);
    }

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

    let existing = null;
    try {
      existing = await prisma.complaint.findUnique({ where: { id } });
    } catch (e) {
      const { getDemoComplaintById } = require('../data/demo-store');
      existing = getDemoComplaintById(id);
    }
    if (!existing) {
      const { getDemoComplaintById } = require('../data/demo-store');
      existing = getDemoComplaintById(id);
    }
    if (!existing) {
      return ApiResponse.error(res, 'Complaint not found', 404);
    }

    // Persist optional proof-of-resolution evidence uploaded by the officer.
    let resolutionImageUrl = null;
    if (req.file) {
      resolutionImageUrl = StorageService.getFileUrl(req.file);
    }
    const now = new Date();
    let updated = null;
    let complaintData = existing;

    try {
      updated = await prisma.$transaction(async (tx) => {
        const row = await tx.complaint.update({
          where: { id },
          data: {
            currentStatus: status,
            // Escalation raises priority to CRITICAL, matching the SLA worker.
            ...(status === 'ESCALATED'
              ? { isEscalated: true, escalatedAt: existing.escalatedAt || now, priority: 'CRITICAL' }
              : {}),
          },
          include: {
            department: true,
            location: true,
            citizen: { include: { user: { select: { name: true, email: true, phone: true } } } },
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
      complaintData = updated;
    } catch (dbErr) {
      // Demo store mutation fallback
      const { updateDemoComplaint } = require('../data/demo-store');
      updated = updateDemoComplaint(id, {
        currentStatus: status,
        ...(status === 'ESCALATED' ? { isEscalated: true, priority: 'CRITICAL', escalatedAt: new Date().toISOString() } : {}),
      });
      complaintData = updated || existing;
    }

    // --- Automatic Corporation & User Notifications ---
    try {
      const Notify = require('../services/notification.service');
      const slaMin = parseInt(process.env.SLA_MINUTES || '30', 10);
      const slaDeadline = new Date(new Date(complaintData.createdAt || Date.now()).getTime() + slaMin * 60000).toISOString();
      const statusMessage = Notify.buildComplaintMessage({
        ticketNumber: complaintData.ticketNumber,
        title: complaintData.title,
        category: complaintData.category,
        severity: complaintData.priority,
        address: complaintData.location?.addressFormatted,
        departmentName: complaintData.department?.name,
        officerName: null,
        createdAt: complaintData.createdAt,
        slaDeadline,
        linkPath: `#/complaints?focus=${complaintData.id}`,
      });

      const eventKind = status === 'RESOLVED'
        ? 'complaint:completed'
        : status === 'ESCALATED'
          ? 'complaint:escalated'
          : 'complaint:statusUpdated';

      const notifTitle = status === 'RESOLVED'
        ? `Task Completed: #${complaintData.ticketNumber}`
        : status === 'ESCALATED'
          ? `🚨 SLA Escalation: #${complaintData.ticketNumber}`
          : `Status Update: #${complaintData.ticketNumber} → ${status}`;

      await Notify.notify({
        userId,
        title: notifTitle,
        message: statusMessage,
        kind: eventKind,
        complaintId: complaintData.id,
        payload: {
          ticketNumber: complaintData.ticketNumber,
          status,
          remarks: remarks || `Status transitioned to ${status}`,
          department: complaintData.department?.name,
          slaDeadline,
        },
        channels: [Notify.CHANNEL.INAPP, Notify.CHANNEL.EMAIL, Notify.CHANNEL.WEBHOOK],
      });
    } catch (e) {
      console.warn('[AVENQRA] status notification skipped:', e.message);
    }

    // --- Realtime Broadcast ---
    try {
      const realtime = require('../services/realtime.service');
      const ev = status === 'RESOLVED' ? 'complaint:completed' : status === 'ESCALATED' ? 'complaint:escalated' : 'complaint:statusUpdated';
      let adminIds = [userId, 'admin-demo-uuid-101', 'officer-demo-uuid-202'];
      try {
        const admins = await prisma.user.findMany({ where: { role: { in: ['SUPER_ADMIN', 'DEPARTMENT_ADMIN'] } }, select: { id: true } });
        adminIds = Array.from(new Set([...adminIds, ...admins.map((u) => u.id)]));
      } catch {}
      realtime.emitToUsers(adminIds, ev, complaintData);
    } catch (e) {
      console.warn('[AVENQRA] status realtime skipped:', e.message);
    }

    return ApiResponse.success(res, 'Complaint status updated', complaintData);
  } catch (error) {
    next(error);
  }
};

