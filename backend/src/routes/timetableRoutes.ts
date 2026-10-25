import { Router } from 'express';
import { generateTimetable, getTimetables, saveTimetable, exportTimetable, deleteTimetableEntry } from '../controllers/timetableController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'hod', 'faculty', 'student'), getTimetables);
router.get('/export', authorizeRoles('admin', 'hod', 'faculty'), exportTimetable);
router.post('/generate', authorizeRoles('admin', 'hod'), generateTimetable);
router.post('/save', authorizeRoles('admin', 'hod'), saveTimetable);
router.delete('/:id', authorizeRoles('admin', 'hod'), deleteTimetableEntry);
router.delete('/', authorizeRoles('admin', 'hod'), deleteTimetableEntry);

export default router;
