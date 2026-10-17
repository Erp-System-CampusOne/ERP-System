import { Router } from 'express';
import { markAttendance, getAttendanceReport } from '../controllers/attendanceController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

router.post('/mark', authorizeRoles('faculty', 'admin'), markAttendance);
router.get('/report', authorizeRoles('admin', 'hod', 'analytics', 'management'), getAttendanceReport);

export default router;
