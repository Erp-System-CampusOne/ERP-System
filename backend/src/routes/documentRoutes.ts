import { Router } from 'express';
import {
  requestDocument,
  getMyDocumentRequests,
  getDocumentQueue,
  approveDocumentRequest,
  rejectDocumentRequest
} from '../controllers/documentController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

// Student submits request (or Admin/HOD on behalf)
router.post('/', authorizeRoles('student', 'admin', 'hod'), requestDocument);

// Student views their own request history
router.get('/my-requests', authorizeRoles('student'), getMyDocumentRequests);

// HOD and Admin review queue
router.get('/queue', authorizeRoles('admin', 'hod'), getDocumentQueue);

// HOD and Admin approvals / rejections
router.put('/:id/approve', authorizeRoles('admin', 'hod'), approveDocumentRequest);
router.put('/:id/reject', authorizeRoles('admin', 'hod'), rejectDocumentRequest);

export default router;
