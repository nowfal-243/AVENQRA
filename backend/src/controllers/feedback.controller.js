const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { complaintId, rating, comments } = req.body;
    const userId = req.user.id;

    if (!complaintId || !rating) {
      return ApiResponse.error(res, 'Complaint ID and rating (1-5) are required.', 400);
    }

    const citizen = await prisma.citizen.findUnique({ where: { userId } });
    if (!citizen) {
      return ApiResponse.error(res, 'Citizen profile not found.', 404);
    }

    const complaint = await prisma.complaint.findUnique({ where: { id: complaintId } });
    if (!complaint) {
      return ApiResponse.error(res, 'Complaint not found.', 404);
    }

    const feedback = await prisma.feedback.upsert({
      where: { complaintId },
      update: {
        rating: parseInt(rating),
        comments: comments || null,
      },
      create: {
        complaintId,
        citizenId: citizen.id,
        rating: parseInt(rating),
        comments: comments || null,
      },
    });

    return ApiResponse.success(res, 'Feedback submitted successfully', feedback, 201);
  } catch (error) {
    next(error);
  }
};

exports.getFeedbackByComplaint = async (req, res, next) => {
  try {
    const { complaintId } = req.params;

    const feedback = await prisma.feedback.findUnique({
      where: { complaintId },
      include: {
        citizen: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    return ApiResponse.success(res, 'Feedback details retrieved', feedback);
  } catch (error) {
    next(error);
  }
};
