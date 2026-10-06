const express = require('express');
const {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  deleteDepartment,
} = require('../controllers/department.controller');
const { authenticate, authorize } = require('../middlewares/auth.middleware');
const { validateBody, validateUUID } = require('../middlewares/validation.middleware');

const router = express.Router();

router.get('/', getDepartments);
router.get('/:id', validateUUID('id'), getDepartmentById);

router.use(authenticate, authorize('DEPARTMENT_ADMIN', 'SUPER_ADMIN'));

router.post('/', validateBody(['name', 'code']), createDepartment);
router.put('/:id', validateUUID('id'), updateDepartment);
router.delete('/:id', validateUUID('id'), deleteDepartment);

module.exports = router;
