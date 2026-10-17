import { Router } from 'express';
import { 
  getInstitutionalOverview, 
  getAdmissionsAnalytics, 
  getAcademicPerformanceAnalytics, 
  getPlacementAnalytics,
  getSystemActivity,
  getFinancialHealthAnalytics,
  exportAdmissionsReport
} from '../controllers/analyticsController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();
router.use(authenticateJWT);

// Restricted to analytics, management (legacy alias), admin, and authorized academic roles
router.get('/overview', authorizeRoles('admin', 'analytics', 'management', 'hod'), getInstitutionalOverview);
router.get('/academic-performance', authorizeRoles('admin', 'analytics', 'management', 'hod'), getAcademicPerformanceAnalytics);
router.get('/placements', authorizeRoles('admin', 'analytics', 'management'), getPlacementAnalytics);
router.get('/activity', authorizeRoles('admin', 'analytics', 'management'), getSystemActivity);
router.get('/financial-health', authorizeRoles('admin', 'analytics', 'management'), getFinancialHealthAnalytics);

export default router;
