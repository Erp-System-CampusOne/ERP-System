import { Router } from 'express';
import {
  getFacultyList,
  createFaculty,
  getFacultyById,
  updateFaculty,
  getFacultyWorkload,
  getLeaveRequests,
  deleteFaculty
} from '../controllers/facultyController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'hod', 'faculty', 'student'), getFacultyList);
// Level 2 Hierarchy: HOD can create faculty
router.post('/', authorizeRoles('admin', 'hod'), createFaculty);
router.get('/:id', authorizeRoles('admin', 'hod', 'faculty', 'student'), getFacultyById);
router.put('/:id', authorizeRoles('admin', 'hod', 'faculty'), updateFaculty);
router.get('/:id/workload', authorizeRoles('admin', 'hod', 'faculty'), getFacultyWorkload);
router.get('/:id/leaves', authorizeRoles('admin', 'hod', 'faculty'), getLeaveRequests);
router.delete('/:id', authorizeRoles('admin'), deleteFaculty);

export default router;
