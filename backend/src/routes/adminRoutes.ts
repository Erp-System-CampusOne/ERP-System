import { Router } from 'express';
import { 
  getAdmissions, 
  updateAdmissionStatus, 
  getRolePermissions, 
  updateRolePermissions, 
  createAdminUser,
  getActiveInstitutionHod,
  relieveInstitutionHod,
  getExaminers,
  assignExaminer
} from '../controllers/adminController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

// Admissions: Analytics can view, but only Admin can approve/reject
router.get('/admissions', authorizeRoles('admin', 'analytics', 'management'), getAdmissions);
router.put('/admissions/:id', authorizeRoles('admin'), updateAdmissionStatus);

// Role permissions: Analytics can view, but only Admin can update RBAC permissions
router.get('/roles', authorizeRoles('admin', 'analytics', 'management'), getRolePermissions);
router.put('/roles/:role/permissions', authorizeRoles('admin'), updateRolePermissions);

// User provisioning: Admin can create all roles, HOD can create faculty/student/examiner
router.post('/users', authorizeRoles('admin', 'hod'), createAdminUser);

// Institution-wide Single HOD governance
router.get('/hod/active', authorizeRoles('admin', 'hod', 'analytics', 'management'), getActiveInstitutionHod);
router.post('/hod/relieve', authorizeRoles('admin'), relieveInstitutionHod);

// Examiner management
router.get('/examiners', authorizeRoles('admin', 'hod'), getExaminers);
router.post('/examiners/assign', authorizeRoles('admin', 'hod'), assignExaminer);

export default router;

