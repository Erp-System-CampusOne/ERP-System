import { Request, Response } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';
import { generateUniqueCampusId } from '../utils/campusIdGenerator';

/**
 * Resolves the target student profile and enforces backend ownership rules.
 * - If requestedId === 'me': resolves current authenticated student's profile.
 * - If caller is 'student': enforces that target student profile belongs to req.user.id.
 * - Returns { authorized: false, status, message } if unauthorized or not found.
 */
async function resolveStudentScope(
  req: AuthRequest,
  requestedId: string
): Promise<
  | { authorized: true; studentId: string; student: any }
  | { authorized: false; status: number; message: string }
> {
  const userId = req.user?.id;
  if (!userId) {
    return { authorized: false, status: 401, message: 'Unauthenticated' };
  }

  const isStudent = req.user?.role === 'student' || req.user?.roles?.includes('student');

  if (requestedId === 'me') {
    const student = await prisma.student.findUnique({
      where: { userId },
      include: { user: true, department: true }
    });
    if (!student) {
      return { authorized: false, status: 404, message: 'Student profile not found' };
    }
    return { authorized: true, studentId: student.id, student };
  }

  const student = await prisma.student.findUnique({
    where: { id: requestedId },
    include: { user: true, department: true }
  });

  if (!student) {
    return { authorized: false, status: 404, message: 'Student not found' };
  }

  if (isStudent && student.userId !== userId) {
    return {
      authorized: false,
      status: 403,
      message: 'Access denied: Students may only access their own records'
    };
  }

  return { authorized: true, studentId: student.id, student };
}

export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    // Defense-in-depth: enforce that students never receive the full institutional student roster
    const isStudent = req.user?.role === 'student' || req.user?.roles?.includes('student');
    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'hod' || req.user?.role === 'faculty' ||
      req.user?.roles?.some(r => ['admin', 'hod', 'faculty', 'management', 'analytics'].includes(r));

    if (isStudent && !isPrivileged) {
      return res.status(403).json({ success: false, message: 'Access denied: Students may not browse the student roster' });
    }

    const { department, semester, batch, search } = req.query;
    
    let whereClause: any = {};
    if (department) whereClause.departmentId = department;
    if (semester) whereClause.semester = parseInt(semester as string, 10);
    if (batch) whereClause.batch = batch;
    
    if (search) {
      whereClause.OR = [
        { rollNumber: { contains: search as string, mode: 'insensitive' } },
        { user: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const students = await prisma.student.findMany({
      where: whereClause,
      include: {
        user: { select: { campusId: true, name: true, email: true, phone: true, avatarUrl: true } },
        department: { select: { name: true } }
      }
    });

    const formatted = (students as any[]).map((s: any) => ({
      id: s.id,
      campusId: s.user?.campusId,
      rollNumber: s.rollNumber,
      name: s.user?.name,
      email: s.user?.email,
      phone: s.user?.phone,
      department: s.department ? s.department.name : '',
      degree: s.degree,
      semester: s.semester,
      batch: s.batch,
      section: s.section,
      cgpa: s.cgpa,
      attendancePercentage: s.attendancePercentage,
      feeStatus: s.feeStatus,
      feeQuota: s.feeQuota,
      avatarUrl: s.user?.avatarUrl
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch students' });
  }
};

export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, department, degree, feeQuota, semester, batch, section } = req.body;

    // Generate roll number
    const rollNumber = `STU${new Date().getFullYear()}${Math.floor(1000 + Math.random() * 9000)}`;
    let resolvedDeptId = department;
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(department || '');
    if (!isUuid) {
      const dept = department 
        ? await prisma.department.findFirst({ where: { name: department } })
        : await prisma.department.findFirst();
      if (dept) {
        resolvedDeptId = dept.id;
      }
    }
    if (!resolvedDeptId && req.user?.id) {
      const callerFaculty = await prisma.faculty.findFirst({
        where: { userId: req.user.id },
        select: { departmentId: true }
      });
      if (callerFaculty?.departmentId) {
        resolvedDeptId = callerFaculty.departmentId;
      }
    }

    const defaultPassword = await bcrypt.hash('student123', 10);
    const campusId = await generateUniqueCampusId(prisma);

    const student = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          campusId,
          name,
          email,
          phone,
          password: defaultPassword,
          role: 'student',
          studentProfile: {
            create: {
              rollNumber,
              departmentId: resolvedDeptId,
              degree,
              feeQuota,
              semester: semester || 1,
              batch,
              section
            }
          }
        },
        include: {
          studentProfile: { include: { department: true } }
        }
      });

      // Synchronize canonical userCredential
      await tx.userCredential.create({
        data: {
          userId: u.id,
          credentialType: 'password',
          passwordHash: defaultPassword,
          algorithm: 'bcrypt',
          requiresChange: false,
          failedLoginAttempts: 0,
          lockedUntil: null
        }
      });

      // Synchronize canonical userRoleAssignment
      const canonicalRole = await tx.appRole.findUnique({ where: { code: 'student' } });
      if (canonicalRole) {
        await tx.userRoleAssignment.create({
          data: {
            userId: u.id,
            roleId: canonicalRole.id,
            isActive: true,
            validFrom: new Date()
          }
        });
      }

      return u;
    });

    if (student.studentProfile) {
      res.json({
        id: student.studentProfile.id,
        campusId: student.campusId,
        rollNumber: student.studentProfile.rollNumber,
        name: student.name,
        email: student.email,
        department: student.studentProfile.department ? student.studentProfile.department.name : '',
        semester: student.studentProfile.semester
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to create student profile' });
    }
  } catch (error: any) {
    console.error('Failed to create student:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A user with this email or phone already exists.' });
    }
    res.status(500).json({ success: false, message: 'Failed to create student', error: error.message });
  }
};

export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const student = scope.student;
    
    res.json({
      id: student.id,
      campusId: student.user.campusId,
      rollNumber: student.rollNumber,
      name: student.user.name,
      email: student.user.email,
      phone: student.user.phone,
      department: student.department ? student.department.name : '',
      degree: student.degree,
      semester: student.semester,
      batch: student.batch,
      section: student.section,
      cgpa: student.cgpa,
      attendancePercentage: student.attendancePercentage,
      feeStatus: student.feeStatus,
      feeQuota: student.feeQuota,
      avatarUrl: student.user.avatarUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const student = scope.student;
    const isStudent = req.user?.role === 'student' || req.user?.roles?.includes('student');

    const { name, phone, semester, section } = req.body;

    // Security Rule: Students cannot modify academic progression (semester, section, cgpa, rollNumber)
    if (isStudent) {
      const updatedUser = await prisma.user.update({
        where: { id: student.userId },
        data: { ...(phone ? { phone } : {}) }
      });

      return res.json({
        id: student.id,
        name: updatedUser.name,
        semester: student.semester
      });
    }

    // Admin / HOD authorized updates
    await prisma.user.update({
      where: { id: student.userId },
      data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) }
    });

    const updated = await prisma.student.update({
      where: { id: student.id },
      data: {
        ...(semester !== undefined ? { semester: Number(semester) } : {}),
        ...(section ? { section } : {})
      },
      include: { user: true, department: true }
    });

    res.json({
      id: updated.id,
      name: updated.user.name,
      semester: updated.semester
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update student' });
  }
};

export const getStudentAttendance = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const studentId = scope.studentId;

    const records = await prisma.attendanceRecord.findMany({
      where: { studentId },
      include: { course: true }
    });

    const totalLectures = records.length;
    const attendedLectures = records.filter(r => r.status === 'present').length;
    const overallPercentage = totalLectures === 0 ? 0 : (attendedLectures / totalLectures) * 100;

    const courseStats = new Map<string, { course: any; total: number; attended: number }>();
    records.forEach(r => {
      const existing = courseStats.get(r.courseId) || { course: r.course, total: 0, attended: 0 };
      existing.total += 1;
      if (r.status === 'present') existing.attended += 1;
      courseStats.set(r.courseId, existing);
    });

    const detailedRecords = Array.from(courseStats.values()).map(stat => ({
      id: stat.course.id,
      subjectCode: stat.course.code,
      subjectName: stat.course.name,
      totalClasses: stat.total,
      attendedClasses: stat.attended,
      percentage: stat.total > 0 ? (stat.attended / stat.total) * 100 : 0
    }));

    res.json({
      studentId,
      overallPercentage,
      totalLectures,
      attendedLectures,
      shortageWarning: overallPercentage < 75 && totalLectures > 0,
      records: detailedRecords
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStudentGrades = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const studentId = scope.studentId;
    const isStudent = req.user?.role === 'student' || req.user?.roles?.includes('student');

    // Security Rule: Students only see results from evaluated/published exams or unlinked assignments
    const whereClause: any = { studentId };
    if (isStudent) {
      whereClause.OR = [
        { examinationId: null },
        { examination: { status: 'evaluated' } },
        { examination: { status: 'completed' } }
      ];
    }

    const results = await prisma.examResult.findMany({
      where: whereClause,
      include: { course: true, examination: true }
    });
    
    const grouped = new Map<number, typeof results>();
    results.forEach(r => {
      const sem = r.course.semester;
      const arr = grouped.get(sem) || [];
      arr.push(r);
      grouped.set(sem, arr);
    });

    const formatted = Array.from(grouped.entries()).map(([semester, subjects]) => {
      const totalPoints = subjects.reduce((sum, r) => sum + (r.totalScore / 10) * r.course.credits, 0);
      const totalCredits = subjects.reduce((sum, r) => sum + r.course.credits, 0);
      const sgpa = totalCredits > 0 ? (totalPoints / totalCredits) : 0;
      
      return {
        semester,
        academicYear: '2023-24',
        sgpa: Number(sgpa.toFixed(2)),
        cgpa: Number(sgpa.toFixed(2)),
        totalCredits,
        resultStatus: sgpa >= 5 ? 'PASS' : 'FAIL',
        subjects: subjects.map(r => ({
          subjectCode: r.course.code,
          subjectName: r.course.name,
          credits: r.course.credits,
          internalMarks: r.internalScore,
          endSemMarks: r.endSemScore,
          totalMarks: r.totalScore,
          grade: r.grade,
          gradePoint: r.totalScore / 10
        }))
      };
    });
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStudentDocuments = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const studentId = scope.studentId;

    const docs = await prisma.documentRequest.findMany({
      where: { studentId },
      orderBy: { requestedAt: 'desc' }
    });
    res.json(docs);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getStudentFees = async (req: AuthRequest, res: Response) => {
  try {
    const scope = await resolveStudentScope(req, req.params.id);
    if (!scope.authorized) {
      return res.status(scope.status).json({ success: false, message: scope.message });
    }
    const studentId = scope.studentId;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        feeTransactions: { where: { status: 'success' } }
      }
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Look up the fee structure for this student's program
    let feeStructure = await prisma.feeStructure.findUnique({
      where: { program_quota: { program: student.degree || 'B.Tech', quota: student.feeQuota } },
    });
    
    if (!feeStructure) {
      feeStructure = {
        id: 'unconfigured',
        program: student.degree || 'B.Tech',
        quota: student.feeQuota,
        tuitionFee: 0,
        hostelFee: 0,
        examFee: 0,
        libraryDeposit: 0,
        totalAmount: 0,
        dueDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const totalAnnualFee = feeStructure.totalAmount;
    const totalPaid = student.feeTransactions.reduce((sum, t) => sum + t.amount, 0);
    const dueBalance = Math.max(0, totalAnnualFee - totalPaid);
    const calculatedStatus = dueBalance === 0 ? 'paid' : totalPaid > 0 ? 'partial' : 'due';
    if (student.feeStatus !== calculatedStatus) {
      await prisma.student.update({ where: { id: student.id }, data: { feeStatus: calculatedStatus } });
    }

    // Fetch all transactions for the ledger (success + pending)
    const allTransactions = await prisma.feeTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' }
    });

    res.json({
      studentId,
      totalAnnualFee,
      totalPaid,
      dueBalance,
      status: calculatedStatus,
      transactions: allTransactions
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const student = await prisma.student.findUnique({ where: { id: req.params.id } });
    if (!student) return res.status(404).json({ success: false, message: 'Student not found' });

    // Deleting the user will cascade and delete the student profile
    await prisma.user.delete({ where: { id: student.userId } });

    res.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete student' });
  }
};
