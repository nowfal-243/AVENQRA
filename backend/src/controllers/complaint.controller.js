const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');
const StorageService = require('../services/storage.service');
const aiService = require('../services/ai.service');

exports.createComplaint = async (req, res, next) => {
  try {
    const { title, description, category, latitude, longitude, address } = req.body;
    const userId = req.user.id;

    if (!title || !description || !category || !latitude || !longitude) {
      return ApiResponse.error(res, 'Title, description, category, latitude, and longitude are required.', 400);
    }

    // Resolve citizen profile ID
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

    // 1. Fetch file buffer if available for AI classification
    let fileBuffer = null;
    let filename = null;
    if (req.file) {
      fileBuffer = req.file.buffer;
      filename = req.file.originalname;
    }

    // 2. Query AI Microservice Analysis (Classification, Multi-modal Severity, Duplicate, Routing)
    let aiResult = null;
    try {
      // Get existing complaints for spatial duplicate check
      const existingComplaints = await prisma.complaint.findMany({
        where: { currentStatus: { in: ['SUBMITTED', 'ASSIGNED', 'IN_PROGRESS'] } },
        take: 50,
        select: {
          ticketNumber: true,
          category: true,
          location: { select: { latitude: true, longitude: true } },
        },
      });

      const formattedExisting = existingComplaints.map(c => ({
        ticketNumber: c.ticketNumber,
        category: c.category,
        latitude: c.location?.latitude,
        longitude: c.location?.longitude,
      }));

      aiResult = await aiService.analyzeComplaint({
        category,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        description,
        fileBuffer,
        filename,
        existingComplaints: formattedExisting,
      });
    } catch (aiErr) {
      console.warn('AI evaluation warning:', aiErr.message);
    }

    // 3. Resolve Auto-Routed Department ID
    let targetDeptId = null;
    if (aiResult && aiResult.department_code) {
      const dept = await prisma.department.findFirst({
        where: { code: aiResult.department_code },
      });
      if (dept) targetDeptId = dept.id;
    }

    const calculatedPriority = aiResult?.priority || 'MEDIUM';

    // 4. Create Complaint inside Prisma Transaction
    const complaint = await prisma.$transaction(async (tx) => {
      const newComplaint = await tx.complaint.create({
        data: {
          ticketNumber,
          citizenId: citizen.id,
          departmentId: targetDeptId,
          title,
          description,
          category: aiResult?.category || category,
          currentStatus: 'SUBMITTED',
          priority: calculatedPriority,
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

      // Log Initial Status
      await tx.complaintStatusLog.create({
        data: {
          complaintId: newComplaint.id,
          status: 'SUBMITTED',
          remarks: aiResult?.isDuplicate
            ? `Complaint submitted. AI Flagged potential duplicate of Ticket #${aiResult.duplicate_ticket}`
            : 'Complaint filed by citizen',
          updatedById: userId,
        },
      });

      // Save AI Analysis Record
      if (aiResult) {
        await tx.aIAnalysis.create({
          data: {
            complaintId: newComplaint.id,
            predictedCategory: aiResult.category || category,
            confidenceScore: aiResult.confidence || 0.85,
            severityScore: aiResult.severity_score || 5.0,
            isDuplicate: aiResult.isDuplicate || false,
          },
        });
      }

      // Send In-App Notification to Citizen
      await tx.notification.create({
        data: {
          userId,
          title: `Complaint Registered: ${ticketNumber}`,
          message: `Your complaint "${title}" has been registered and auto-routed. Track status in real-time.`,
        },
      });

      // Increment citizen total complaints counter
      await tx.citizen.update({
        where: { id: citizen.id },
        data: { totalComplaints: { increment: 1 } },
      });

      return newComplaint;
    });

    // Retrieve full complaint record with relations
    const fullComplaint = await prisma.complaint.findUnique({
      where: { id: complaint.id },
      include: {
        images: true,
        location: true,
        aiAnalysis: true,
        department: true,
        statusLogs: true,
      },
    });

    return ApiResponse.success(res, 'Complaint submitted & AI processed successfully!', fullComplaint, 201);
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

    const { status, category, page = 1, limit = 10 } = req.query;
    const where = { citizenId: citizen.id };

    if (status) where.currentStatus = status;
    if (category) where.category = category;

    const complaints = await prisma.complaint.findMany({
      where,
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
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
    const { status, category, departmentId, priority, search, officerId, page = 1, limit = 100 } = req.query;
    const where = {};

    if (status) where.currentStatus = status;
    if (category) where.category = category;
    if (departmentId) where.departmentId = departmentId;
    if (priority) where.priority = priority;

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (officerId) {
      where.assignments = {
        some: { officerId },
      };
    }

    const complaints = await prisma.complaint.findMany({
      where,
      take: parseInt(limit),
      skip: (parseInt(page) - 1) * parseInt(limit),
      orderBy: { createdAt: 'desc' },
      include: {
        citizen: { include: { user: { select: { name: true, email: true, phone: true } } } },
        department: { select: { id: true, name: true, code: true } },
        images: true,
        location: true,
        aiAnalysis: true,
        assignments: {
          include: {
            officer: {
              include: { user: { select: { name: true, email: true, phone: true } } },
            },
          },
        },
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
    const { status, remarks, departmentId } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (status) updateData.currentStatus = status;
    if (departmentId) updateData.departmentId = departmentId;

    const updated = await prisma.complaint.update({
      where: { id },
      data: updateData,
    });

    let imageUrl = null;
    if (req.file) {
      imageUrl = StorageService.getFileUrl(req.file);
      await prisma.complaintImage.create({
        data: {
          complaintId: id,
          imageUrl,
          imageType: 'RESOLUTION',
        },
      });
    }

    if (status) {
      await prisma.complaintStatusLog.create({
        data: {
          complaintId: id,
          status: status || updated.currentStatus,
          remarks: remarks || `Status updated to ${status || updated.currentStatus}`,
          updatedById: userId,
        },
      });
    }

    return ApiResponse.success(res, 'Complaint status updated', updated);
  } catch (error) {
    next(error);
  }
};
