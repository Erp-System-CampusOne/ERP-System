import { Router } from 'express';
import { 
  getExaminations, createExamination, updateExamination, deleteExamination, 
  releaseHallTickets, getExamResults, submitExamResults, 
  exportExaminations, getExamStats, downloadExamResults, remindFaculty,
  getAssignedExaminations, saveDraftMarks, submitMarksForApproval,
  getPendingApprovalResults, approveExamMarks, publishExamResults
} from '../controllers/examinationController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

router.get('/', authorizeRoles('admin', 'hod', 'faculty', 'student'), getExaminations);
router.get('/assigned', authorizeRoles('examiner', 'faculty', 'admin', 'hod'), getAssignedExaminations);
router.get('/export', authorizeRoles('admin', 'analytics', 'management'), exportExaminations);
router.get('/:id/stats', authorizeRoles('admin', 'analytics', 'management', 'faculty', 'hod'), getExamStats);
router.get('/:id/download-results', authorizeRoles('admin', 'analytics', 'management', 'faculty', 'hod'), downloadExamResults);
router.post('/:id/remind', authorizeRoles('admin', 'hod'), remindFaculty);
router.post('/', authorizeRoles('admin'), createExamination);
router.put('/:id', authorizeRoles('admin'), updateExamination);
router.delete('/:id', authorizeRoles('admin'), deleteExamination);
router.post('/:id/hall-tickets', authorizeRoles('admin'), releaseHallTickets);

// Marks entry and approval workflow
router.post('/:id/marks/draft', authorizeRoles('examiner', 'faculty', 'admin', 'hod'), saveDraftMarks);
router.post('/:id/marks/submit', authorizeRoles('examiner', 'faculty', 'admin', 'hod'), submitMarksForApproval);
router.get('/:id/pending-approval', authorizeRoles('hod', 'admin'), getPendingApprovalResults);
router.put('/:id/marks/approve', authorizeRoles('hod', 'admin'), approveExamMarks);
router.put('/:id/publish', authorizeRoles('admin'), publishExamResults);

// Results view: Students receive ONLY their own published result; staff receive authorized results
router.get('/:id/results', authorizeRoles('admin', 'hod', 'faculty', 'student'), getExamResults);
router.post('/:id/results', authorizeRoles('examiner', 'faculty', 'admin', 'hod'), submitExamResults);

export default router;

