import { Request, Response } from 'express';
import prisma from '../config/db';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

export const getAdmissions = async (req: Request, res: Response) => {
  try {
    const apps = await prisma.admissionApplication.findMany();
    res.json(apps);
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateAdmissionStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const app = await prisma.admissionApplication.update({
      where: { id },
      data: { status }
    });
    
    res.json({ message: 'Admission status updated', application: app });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getRolePermissions = async (req: Request, res: Response) => {
  try {
    const roles = ['student', 'faculty', 'hod', 'admin', 'finance_officer', 'librarian', 'analytics'];
    const result = [];

    for (const role of roles) {
      const usersCount = await prisma.user.count({ where: { role: role as any } });
      const rolePerms = await prisma.rolePermission.findMany({
        where: { role: role as any },
        include: { permission: true }
      });
      
      const permissions = rolePerms.map(rp => rp.permission.name);
      
      let name = role.charAt(0).toUpperCase() + role.slice(1).replace('_', ' ');
      let color = 'bg-slate-500';
      if (role === 'admin') color = 'bg-red-500';
      else if (role === 'student') color = 'bg-blue-500';
      else if (role === 'faculty') color = 'bg-green-500';
      else if (role === 'hod') color = 'bg-purple-500';
      else if (role === 'analytics' || role === 'management') {
        name = 'Analytics';
        color = 'bg-indigo-500';
      }
      else if (role === 'finance_officer') color = 'bg-yellow-500';
      else if (role === 'librarian') color = 'bg-orange-500';

      result.push({
        id: role,
        name: name,
        description: `${name} access role`,
        status: 'active',
        users: usersCount,
        permissions,
        color
      });
    }

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const updateRolePermissions = async (req: Request, res: Response) => {
  try {
    const { role } = req.params;
    const { permissions } = req.body; // array of permission ids/names

    if (!role || !permissions || !Array.isArray(permissions)) {
      return res.status(400).json({ success: false, message: 'Invalid data' });
    }

    // Since we don't have a way to populate Permission table right now if it's empty, 
    // let's ensure the permissions exist or just insert them.
    for (const permName of permissions) {
      await prisma.permission.upsert({
        where: { name: permName },
        update: {},
        create: {
          name: permName,
          category: 'General',
          description: permName
        }
      });
    }

    // Delete existing permissions for this role
    await prisma.rolePermission.deleteMany({
      where: { role: role as any }
    });

    // Add new permissions
    for (const permName of permissions) {
      const perm = await prisma.permission.findUnique({ where: { name: permName } });
      if (perm) {
        await prisma.rolePermission.create({
          data: {
            role: role as any,
            permissionId: perm.id
          }
        });
      }
    }

    res.json({ success: true, message: 'Permissions updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};



export const createAdminUser = async (req: Request, res: Response) => {
  try {
    const authReq = req as any;
    const callerId = authReq.user?.id;
    const callerRole = authReq.user?.role;
    const callerRoles = authReq.user?.roles || [callerRole];

    const isCallerAdmin = callerRole === 'admin' || callerRoles.includes('admin');
    const isCallerHod = (callerRole === 'hod' || callerRoles.includes('hod')) && !isCallerAdmin;

    const { name, email, phone, role, departmentId, department, rollNumber, semester, batch, designation, specialization } = req.body;
    
    // Validate role
    const allValidRoles: Role[] = ['admin', 'finance_officer', 'librarian', 'analytics', 'management', 'hod', 'faculty', 'student', 'examiner'];
    if (!allValidRoles.includes(role as Role)) {
      return res.status(400).json({ success: false, message: 'Invalid role for user creation' });
    }

    // Role Hierarchy Enforcement:
    // HOD can ONLY create faculty, student, examiner
    if (isCallerHod) {
      const hodPermittedRoles: Role[] = ['faculty', 'student', 'examiner'];
      if (!hodPermittedRoles.includes(role as Role)) {
        return res.status(403).json({
          success: false,
          message: 'HOD authority is restricted to creating Faculty, Student, and Examiner accounts.'
        });
      }
    } else if (!isCallerAdmin) {
      return res.status(403).json({ success: false, message: 'Insufficient privileges to create users' });
    }

    // Single Institution-Wide HOD Enforcement:
    if (role === 'hod') {
      const activeHod = await prisma.institutionHodAssignment.findFirst({
        where: { isActive: true },
        include: { user: { select: { id: true, name: true, email: true } } }
      });
      if (activeHod) {
        return res.status(409).json({
          success: false,
          message: `An active institution-wide HOD already exists (${activeHod.user.name} - ${activeHod.user.email}). Relieve the current HOD before appointing a new one.`
        });
      }
    }

    const plainPassword = `${role.split('_')[0]}123`;
    const defaultPassword = await bcrypt.hash(plainPassword, 10);
    const generatedId = `${role.toUpperCase().substring(0,3)}${Math.floor(100 + Math.random() * 900)}`;

    const created = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({
        data: {
          name,
          email,
          phone,
          password: defaultPassword,
          role: role as Role,
        }
      });

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

      const canonicalRole = await tx.appRole.findUnique({ where: { code: role } });
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

      // If HOD, create institution_hod_assignments record & link department/faculty
      if (role === 'hod') {
        const inst = await tx.institution.findFirst();
        if (inst) {
          await tx.institutionHodAssignment.create({
            data: {
              institutionId: inst.id,
              userId: u.id,
              isActive: true,
              appointedAt: new Date()
            }
          });
        }
        const dept = departmentId 
          ? await tx.department.findUnique({ where: { id: departmentId } })
          : (department ? await tx.department.findFirst({ where: { name: department } }) : await tx.department.findFirst());
        if (dept) {
          const empCode = req.body.employeeCode || `HOD${Date.now().toString().slice(-6)}`;
          const hodFac = await tx.faculty.create({
            data: {
              userId: u.id,
              departmentId: dept.id,
              employeeCode: empCode,
              designation: designation || 'Head of Department',
              qualification: req.body.qualification || 'Ph.D.'
            }
          });
          await tx.department.update({
            where: { id: dept.id },
            data: { headOfDepartmentId: hodFac.id }
          });
        }
      }

      // If Faculty, create Faculty profile
      if (role === 'faculty') {
        const dept = departmentId 
          ? await tx.department.findUnique({ where: { id: departmentId } })
          : (department ? await tx.department.findFirst({ where: { name: department } }) : await tx.department.findFirst());
        if (dept) {
          const empCode = req.body.employeeCode || `FAC${Date.now().toString().slice(-6)}`;
          await tx.faculty.create({
            data: {
              userId: u.id,
              departmentId: dept.id,
              employeeCode: empCode,
              designation: designation || 'Assistant Professor',
              qualification: req.body.qualification || 'M.Tech / Ph.D.'
            }
          });
        }
      }

      // If Student, create Student profile
      if (role === 'student') {
        const dept = departmentId 
          ? await tx.department.findUnique({ where: { id: departmentId } })
          : (department ? await tx.department.findFirst({ where: { name: department } }) : await tx.department.findFirst());
        if (dept) {
          await tx.student.create({
            data: {
              userId: u.id,
              departmentId: dept.id,
              rollNumber: rollNumber || `CS${Date.now().toString().slice(-6)}`,
              semester: semester ? Number(semester) : 1,
              batch: batch || `${new Date().getFullYear()}-${new Date().getFullYear() + 4}`
            }
          });
        }
      }

      return u;
    });

    const { password: _passwordHash, ...safeUser } = created;
    res.status(201).json({ success: true, user: safeUser, credentials: { id: generatedId, password: plainPassword } });
  } catch (error) {
    console.error('[AdminController] createAdminUser error', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getActiveInstitutionHod = async (req: Request, res: Response) => {
  try {
    const active = await prisma.institutionHodAssignment.findFirst({
      where: { isActive: true },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true } },
        institution: { select: { id: true, name: true, code: true } }
      }
    });
    res.json({ success: true, activeHod: active || null });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const relieveInstitutionHod = async (req: Request, res: Response) => {
  try {
    const active = await prisma.institutionHodAssignment.findFirst({
      where: { isActive: true }
    });
    if (!active) {
      return res.status(404).json({ success: false, message: 'No active institution-wide HOD to relieve' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.institutionHodAssignment.update({
        where: { id: active.id },
        data: { isActive: false, relievedAt: new Date() }
      });
      const hodRole = await tx.appRole.findUnique({ where: { code: 'hod' } });
      if (hodRole) {
        await tx.userRoleAssignment.updateMany({
          where: { userId: active.userId, roleId: hodRole.id, isActive: true },
          data: { isActive: false, validTo: new Date() }
        });
      }
    });

    res.json({ success: true, message: 'Institution HOD successfully relieved' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getExaminers = async (req: Request, res: Response) => {
  try {
    const examiners = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'examiner' as Role },
          { roleAssignments: { some: { role: { code: 'examiner' }, isActive: true } } }
        ]
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        examinerAssignments: {
          include: {
            examination: { select: { id: true, title: true } },
            course: { select: { id: true, name: true, code: true } }
          }
        }
      }
    });
    res.json({ success: true, examiners });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const assignExaminer = async (req: Request, res: Response) => {
  try {
    const { examinerId, examinationId, courseId } = req.body;
    if (!examinerId || !examinationId || !courseId) {
      return res.status(400).json({ success: false, message: 'examinerId, examinationId, and courseId are required' });
    }

    const examiner = await prisma.user.findUnique({
      where: { id: examinerId },
      include: { roleAssignments: { include: { role: true } } }
    });
    if (!examiner) {
      return res.status(404).json({ success: false, message: 'Examiner user not found' });
    }

    const isExaminer = examiner.role === 'examiner' || 
      examiner.roleAssignments.some(ra => ra.role.code === 'examiner' && ra.isActive);
    if (!isExaminer) {
      return res.status(400).json({ success: false, message: 'Specified user does not have the examiner role' });
    }

    const assignment = await prisma.examinerAssignment.upsert({
      where: {
        examinerId_examinationId_courseId: { examinerId, examinationId, courseId }
      },
      update: { status: 'assigned' },
      create: { examinerId, examinationId, courseId, status: 'assigned' }
    });

    res.status(201).json({ success: true, assignment });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


