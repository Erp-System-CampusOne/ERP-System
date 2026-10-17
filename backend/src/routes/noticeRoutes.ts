import { Router } from 'express';
import { getNotices, createNotice, updateNotice, deleteNotice, togglePinNotice } from '../controllers/noticeController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT);

// All authenticated users can view notices
router.get('/', authorizeRoles('all'), getNotices);

// Operational notice creation/modification restricted to Admin, HOD, and Faculty (Analytics/management revoked)
router.post('/', authorizeRoles('admin', 'faculty', 'hod'), createNotice);
router.put('/:id', authorizeRoles('admin', 'faculty', 'hod'), updateNotice);
router.patch('/:id/pin', authorizeRoles('admin'), togglePinNotice);
router.delete('/:id', authorizeRoles('admin', 'faculty', 'hod'), deleteNotice);

export default router;
