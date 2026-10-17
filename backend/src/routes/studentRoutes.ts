import { Router } from 'express';
import { 
  getStudents, 
  createStudent, 
  getStudentById, 
  updateStudent,
  getStudentAttendance,
  getStudentGrades,
  getStudentFees,
  getStudentDocuments,
  deleteStudent
} from '../controllers/studentController';
import { authenticateJWT } from '../middlewares/authMiddleware';
import { authorizeRoles } from '../middlewares/roleMiddleware';

const router = Router();

router.use(authenticateJWT); // Secure all student routes

// VULN-02 Remediation: Student role is strictly removed from the full student roster route
router.get('/', authorizeRoles('admin', 'hod', 'faculty'), getStudents);

// Level 2 Hierarchy: HOD can create students
router.post('/', authorizeRoles('admin', 'hod'), createStudent);

// Student resource endpoints: ownership enforced in controller for 'student' callers
router.get('/:id', authorizeRoles('admin', 'hod', 'faculty', 'student'), getStudentById);
router.put('/:id', authorizeRoles('admin', 'hod', 'student'), updateStudent);
router.get('/:id/attendance', authorizeRoles('admin', 'hod', 'faculty', 'student'), getStudentAttendance);
router.get('/:id/grades', authorizeRoles('admin', 'hod', 'faculty', 'student'), getStudentGrades);
router.get('/:id/fees', authorizeRoles('admin', 'finance_officer', 'student'), getStudentFees);
router.get('/:id/documents', authorizeRoles('admin', 'hod', 'student'), getStudentDocuments);
router.delete('/:id', authorizeRoles('admin'), deleteStudent);

export default router;
