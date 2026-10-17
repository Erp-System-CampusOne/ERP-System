import { Router } from 'express';
import { getCourses, createCourse, getCourseById, updateCourse, deleteCourse } from '../controllers/courseController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'hod', 'faculty', 'student'), getCourses);
router.post('/', authorizeRoles('admin', 'hod'), createCourse);
router.get('/:id', authorizeRoles('admin', 'hod', 'faculty', 'student'), getCourseById);
router.put('/:id', authorizeRoles('admin', 'hod'), updateCourse);
router.delete('/:id', authorizeRoles('admin', 'hod'), deleteCourse);

export default router;
