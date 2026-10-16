const prisma = require('../config/db');
const ApiResponse = require('../utils/api-response');

exports.createDepartment = async (req, res, next) => {
  try {
    const { name, code, slaHours } = req.body;

    const existing = await prisma.department.findFirst({
      where: { OR: [{ name }, { code }] },
    });

    if (existing) {
      return ApiResponse.error(res, 'Department with this name or code already exists.', 400);
    }

    const department = await prisma.department.create({
      data: {
        name,
        code: code.toUpperCase(),
        slaHours: slaHours ? parseInt(slaHours) : 48,
      },
    });

    return ApiResponse.success(res, 'Department created successfully', department, 201);
  } catch (error) {
    next(error);
  }
};

exports.getDepartments = async (req, res, next) => {
  try {
    let departments = [];
    try {
      departments = await prisma.department.findMany({
        orderBy: { name: 'asc' },
        include: {
          _count: {
            select: { officers: true, complaints: true },
          },
        },
      });
    } catch (dbErr) {
      const { getDemoDepartments } = require('../data/demo-store');
      departments = getDemoDepartments();
    }

    return ApiResponse.success(res, 'Departments retrieved successfully', departments);
  } catch (error) {
    next(error);
  }
};

exports.getDepartmentById = async (req, res, next) => {
  try {
    const { id } = req.params;
    let department = null;
    try {
      department = await prisma.department.findUnique({
        where: { id },
        include: {
          officers: { include: { user: { select: { name: true, email: true, phone: true } } } },
          complaints: { take: 10, orderBy: { createdAt: 'desc' } },
        },
      });
    } catch (dbErr) {
      const { getDemoDepartments } = require('../data/demo-store');
      department = getDemoDepartments().find((d) => d.id === id || d.code === id) || null;
    }

    if (!department) {
      return ApiResponse.error(res, 'Department not found.', 404);
    }

    return ApiResponse.success(res, 'Department details retrieved', department);
  } catch (error) {
    next(error);
  }
};

exports.updateDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, slaHours } = req.body;

    const updated = await prisma.department.update({
      where: { id },
      data: {
        name: name || undefined,
        code: code ? code.toUpperCase() : undefined,
        slaHours: slaHours ? parseInt(slaHours) : undefined,
      },
    });

    return ApiResponse.success(res, 'Department updated successfully', updated);
  } catch (error) {
    next(error);
  }
};

exports.deleteDepartment = async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.department.delete({ where: { id } });
    return ApiResponse.success(res, 'Department deleted successfully');
  } catch (error) {
    next(error);
  }
};
