import { Request, Response } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';
import { generateUniqueCampusId } from '../utils/campusIdGenerator';

export const getFacultyList = async (req: AuthRequest, res: Response) => {
  try {
    const { department, search } = req.query;
    let whereClause: any = {};
    if (department) whereClause.departmentId = department;
    if (search) {
      whereClause.OR = [
        { employeeCode: { contains: search as string, mode: 'insensitive' } },
        { user: { name: { contains: search as string, mode: 'insensitive' } } }
      ];
    }

    const faculty = await prisma.faculty.findMany({
      where: whereClause,
      include: {
        user: { select: { campusId: true, name: true, email: true, phone: true, avatarUrl: true } },
        department: { select: { name: true } }
      }
    });

    const formatted = faculty.map(f => ({
      id: f.id,
      campusId: f.user.campusId,
      employeeCode: f.employeeCode,
      name: f.user.name,
      email: f.user.email,
      phone: f.user.phone,
      department: f.department.name,
      designation: f.designation,
      qualification: f.qualification,
      weeklyWorkloadHours: f.weeklyWorkloadHours,
      leaveBalance: f.leaveBalance,
      avatarUrl: f.user.avatarUrl
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const createFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { name, email, phone, department, designation, qualification } = req.body;
    const employeeCode = `FAC${new Date().getFullYear()}${Math.floor(100 + Math.random() * 900)}`;
    const defaultPassword = await bcrypt.hash('faculty123', 10);
    const campusId = await generateUniqueCampusId(prisma);

    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          campusId,
          name,
          email,
          phone,
          password: defaultPassword,
          role: 'faculty',
          facultyProfile: {
            create: {
              employeeCode,
              departmentId: department,
              designation,
              qualification
            }
          }
        },
        include: { facultyProfile: { include: { department: true } } }
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
      const canonicalRole = await tx.appRole.findUnique({ where: { code: 'faculty' } });
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

    res.json({
      id: created.facultyProfile?.id,
      campusId: created.campusId,
      employeeCode: created.facultyProfile?.employeeCode,
      name: created.name,
      email: created.email,
      department: created.facultyProfile?.department.name,
      designation: created.facultyProfile?.designation
    });
  } catch (error: any) {
    console.error('Failed to create faculty:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'A user with this email or phone already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getFacultyById = async (req: AuthRequest, res: Response) => {
  try {
    let facultyId = req.params.id;
    if (facultyId === 'me') {
      const own = await prisma.faculty.findUnique({
        where: { userId: req.user?.id },
        include: { user: true, department: true }
      });
      if (!own) return res.status(404).json({ success: false, message: 'Faculty profile not found' });
      return res.json({
        id: own.id,
        campusId: own.user.campusId,
        employeeCode: own.employeeCode,
        name: own.user.name,
        email: own.user.email,
        phone: own.user.phone,
        department: own.department.name,
        designation: own.designation,
        qualification: own.qualification,
        weeklyWorkloadHours: own.weeklyWorkloadHours,
        leaveBalance: own.leaveBalance,
        avatarUrl: own.user.avatarUrl
      });
    }

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: { user: true, department: true }
    });
    
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });
    
    res.json({
      id: faculty.id,
      campusId: faculty.user.campusId,
      employeeCode: faculty.employeeCode,
      name: faculty.user.name,
      email: faculty.user.email,
      phone: faculty.user.phone,
      department: faculty.department.name,
      designation: faculty.designation,
      qualification: faculty.qualification,
      weeklyWorkloadHours: faculty.weeklyWorkloadHours,
      leaveBalance: faculty.leaveBalance,
      avatarUrl: faculty.user.avatarUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const { name, phone, designation, qualification } = req.body;
    
    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
    if (!faculty) return res.status(404).json({ success: false, message: 'Not found' });

    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'hod' ||
      req.user?.roles?.some(r => ['admin', 'hod'].includes(r));

    // Non-privileged faculty can only update their own profile and cannot change designation
    if (!isPrivileged) {
      if (faculty.userId !== req.user?.id) {
        return res.status(403).json({ success: false, message: 'Access denied: Faculty may only update their own profile' });
      }

      await prisma.user.update({
        where: { id: faculty.userId },
        data: { ...(phone ? { phone } : {}) }
      });

      const updated = await prisma.faculty.update({
        where: { id: req.params.id },
        data: { ...(qualification ? { qualification } : {}) },
        include: { user: true }
      });

      return res.json({ id: updated.id, name: updated.user.name, designation: updated.designation });
    }

    // Admin / HOD privileged update
    await prisma.user.update({
      where: { id: faculty.userId },
      data: { ...(name ? { name } : {}), ...(phone ? { phone } : {}) }
    });

    const updated = await prisma.faculty.update({
      where: { id: req.params.id },
      data: { ...(designation ? { designation } : {}), ...(qualification ? { qualification } : {}) },
      include: { user: true }
    });

    res.json({ id: updated.id, name: updated.user.name, designation: updated.designation });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getFacultyWorkload = async (req: AuthRequest, res: Response) => {
  try {
    const timetables = await prisma.timetableEntry.findMany({
      where: { facultyId: req.params.id },
      include: { course: true }
    });

    const workloadMap = new Map<string, any>();
    for (const t of timetables) {
      const key = `${t.courseId}-${t.section}`;
      if (!workloadMap.has(key)) {
        const totalStudents = await prisma.student.count({
          where: {
            departmentId: t.course.departmentId,
            semester: t.semester,
            section: t.section
          }
        });

        workloadMap.set(key, {
          courseCode: t.course.code,
          courseName: t.course.name,
          section: t.section,
          hoursPerWeek: 0,
          roomNumber: t.roomNumber,
          totalStudents
        });
      }
      const existing = workloadMap.get(key);
      existing.hoursPerWeek += 1;
      workloadMap.set(key, existing);
    }

    res.json(Array.from(workloadMap.values()));
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getLeaveRequests = async (req: AuthRequest, res: Response) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    const isPrivileged = req.user?.role === 'admin' || req.user?.role === 'hod' ||
      req.user?.roles?.some(r => ['admin', 'hod'].includes(r));

    if (!isPrivileged && faculty.userId !== req.user?.id) {
      return res.status(403).json({ success: false, message: 'Access denied: Faculty may only view their own leaves' });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { facultyId: req.params.id }
    });
    res.json(leaves);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const deleteFaculty = async (req: AuthRequest, res: Response) => {
  try {
    const faculty = await prisma.faculty.findUnique({ where: { id: req.params.id } });
    if (!faculty) return res.status(404).json({ success: false, message: 'Faculty not found' });

    // Deleting the user will cascade and delete the faculty profile
    await prisma.user.delete({ where: { id: faculty.userId } });

    res.json({ success: true, message: 'Faculty deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete faculty' });
  }
};
