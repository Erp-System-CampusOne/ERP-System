import { Router } from 'express';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '../controllers/departmentController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'hod', 'faculty', 'student'), getDepartments);
router.post('/', authorizeRoles('admin'), createDepartment);
router.put('/:id', authorizeRoles('admin'), updateDepartment);
router.delete('/:id', authorizeRoles('admin'), deleteDepartment);

export default router;
