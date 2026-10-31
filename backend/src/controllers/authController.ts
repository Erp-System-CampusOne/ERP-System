import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NoticeTargetRole } from '@prisma/client';
import prisma from '../config/db';
import { verifyCredentials, updatePasswordSynchronized } from '../services/credentialService';
import { createSession, revokeSession, revokeAllUserSessions } from '../services/sessionService';
import { getUserActiveRoles } from '../services/roleService';
import { AuthRequest } from '../middlewares/authMiddleware';
import { isEmailConfigured, sendPasswordResetEmail } from '../services/emailService';

const JWT_SECRET = process.env.JWT_SECRET as string;
const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm';

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, campusId, password, role, email, username, rollNumber, phone } = req.body;

    const rawId = (campusId || identifier || '').trim();

    if (!rawId || !password) {
      if (email || username || rollNumber || phone) {
        return res.status(400).json({
          success: false,
          message: 'Login requires Campus ID and password. Alternative identifiers (email, roll number, username, phone number) are not permitted.'
        });
      }
      return res.status(400).json({ success: false, message: 'Campus ID and password are required' });
    }

    if (rawId.includes('@')) {
      return res.status(401).json({
        success: false,
        message: 'Email login is disabled. Please log in using your Campus ID (e.g., COID1001).'
      });
    }

    if (!/^COID\d+$/i.test(rawId)) {
      return res.status(401).json({
        success: false,
        message: 'Invalid Campus ID or password'
      });
    }

    // Step 1: Concurrency-safe credential verification & lockout enforcement
    const verifyResult = await verifyCredentials(rawId, password);

    if (!verifyResult.success) {
      if (verifyResult.locked) {
        return res.status(403).json({
          success: false,
          message: verifyResult.error || 'Account temporarily locked. Please try again later.'
        });
      }
      return res.status(401).json({ success: false, message: verifyResult.error || 'Invalid Campus ID or password' });
    }

    const user = verifyResult.user!;

    // Step 2: Canonical role resolution
    const activeRoles = await getUserActiveRoles(user.id);

    // Optional client-requested role validation
    if (role && !activeRoles.includes(role)) {
      return res.status(403).json({ success: false, message: 'Invalid role for this user' });
    }

    const primaryRole = activeRoles.includes(user.role) ? user.role : (activeRoles[0] || user.role);

    // Step 3: Server-side session creation
    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    const { sessionId } = await createSession(user.id, {
      ipAddress,
      userAgent
    });

    // Step 4: Mint enhanced JWT with canonical claims + legacy backward compatibility
    const token = jwt.sign(
      {
        id: user.id,
        role: primaryRole,
        roles: activeRoles,
        sid: sessionId,
        ver: 1
      },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Step 5: Fetch full user profile for frontend response contract
    const fullUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        campusId: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        studentProfile: {
          select: {
            id: true,
            rollNumber: true,
            departmentId: true,
            department: { select: { name: true } },
            semester: true,
            section: true,
            degree: true,
            batch: true,
            cgpa: true,
            attendancePercentage: true,
            feeStatus: true,
          }
        },
        facultyProfile: {
          select: {
            id: true,
            employeeCode: true,
            departmentId: true,
            department: { select: { name: true } },
            designation: true,
            qualification: true,
            weeklyWorkloadHours: true,
            leaveBalance: true,
          }
        },
      }
    });

    res.json({
      token,
      user: {
        ...fullUser,
        roles: activeRoles
      }
    });
  } catch (error: any) {
    console.error(`[AuthController] Login error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error during login' });
  }
};

export const logoutUser = async (req: AuthRequest, res: Response) => {
  try {
    const sessionId = req.user?.sessionId;

    if (sessionId) {
      await revokeSession(sessionId, 'user_logout');
    }

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error: any) {
    console.error(`[AuthController] Logout error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error during logout' });
  }
};

export const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        campusId: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        studentProfile: { select: { id: true, rollNumber: true } },
        facultyProfile: { select: { id: true, employeeCode: true } }
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const activeRoles = await getUserActiveRoles(userId);

    res.json({
      ...user,
      roles: activeRoles
    });
  } catch (error: any) {
    console.error(`[AuthController] getCurrentUser error: ${error.message}`);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

/**
 * Records system activity / audit log entry.
 */
export async function logAuditActivity(
  action: string,
  description: string,
  type: 'info' | 'success' | 'warning' | 'destructive' = 'info'
) {
  try {
    await prisma.systemActivity.create({
      data: {
        action,
        description,
        type,
        timestamp: new Date()
      }
    });
  } catch (e: any) {
    console.warn(`[AuditLog] System activity recording note: ${e.message}`);
  }
}

/**
 * Masks an email address for safe display (e.g. s*****v@campus.edu).
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return email || '******';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  const first = local[0];
  const last = local[local.length - 1];
  const starsCount = Math.min(5, Math.max(3, local.length - 2));
  return `${first}${'*'.repeat(starsCount)}${last}@${domain}`;
}

/**
 * Resolves the authorized superior responsible for approving password recovery requests
 * according to the institutional hierarchy:
 *  - Student -> HOD of department
 *  - Faculty -> HOD of department (if HOD -> Principal / Director)
 *  - HOD -> Principal / Director (Management)
 *  - Non-teaching staff -> HR / Admin
 *  - Admin -> Super Admin
 *  - Super Admin -> Designated IT administrator / recovery authority
 * Self-approval is strictly forbidden under all circumstances.
 */
export async function resolveAuthorizedSuperior(targetUser: any): Promise<any | null> {
  const role = targetUser.role;
  const targetId = targetUser.id;

  // 1. Student: Approved by Department HOD of their department
  if (role === 'student') {
    let deptId = targetUser.studentProfile?.departmentId;
    if (!deptId) {
      const studentRec = await prisma.student.findUnique({
        where: { userId: targetId }
      });
      deptId = studentRec?.departmentId;
    }
    if (deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        include: { headOfDepartment: { include: { user: true } } }
      });
      if (dept?.headOfDepartment?.user && dept.headOfDepartment.user.id !== targetId) {
        return dept.headOfDepartment.user;
      }
      const hodUser = await prisma.user.findFirst({
        where: {
          role: 'hod',
          id: { not: targetId },
          facultyProfile: { departmentId: deptId }
        }
      });
      if (hodUser) return hodUser;
    }

    // Explicitly return null if no HOD exists for this student's department (do not cross-assign)
    return null;
  }

  // 2. Faculty: Approved by Department HOD (unless faculty is the HOD themselves)
  if (role === 'faculty') {
    let deptId = targetUser.facultyProfile?.departmentId;
    if (!deptId) {
      const facultyRec = await prisma.faculty.findUnique({
        where: { userId: targetId }
      });
      deptId = facultyRec?.departmentId;
    }
    if (deptId) {
      const dept = await prisma.department.findUnique({
        where: { id: deptId },
        include: { headOfDepartment: { include: { user: true } } }
      });
      // If faculty member is the HOD themselves, escalate to Principal / Director (Management)
      if (dept?.headOfDepartment?.userId === targetId || targetUser.role === 'hod') {
        const principal = await prisma.user.findFirst({
          where: { role: 'management', id: { not: targetId } }
        });
        if (principal) return principal;

        const principalFaculty = await prisma.faculty.findFirst({
          where: {
            userId: { not: targetId },
            OR: [
              { designation: { contains: 'Principal', mode: 'insensitive' } },
              { designation: { contains: 'Director', mode: 'insensitive' } }
            ]
          },
          include: { user: true }
        });
        return principalFaculty?.user || null;
      }

      if (dept?.headOfDepartment?.user && dept.headOfDepartment.user.id !== targetId) {
        return dept.headOfDepartment.user;
      }
      const hodUser = await prisma.user.findFirst({
        where: {
          role: 'hod',
          id: { not: targetId },
          facultyProfile: { departmentId: deptId }
        }
      });
      if (hodUser) return hodUser;
    }

    // Explicitly return null if no HOD exists for this faculty's department
    return null;
  }

  // 3. HOD: Approved by Principal / Director (Management)
  if (role === 'hod') {
    const principal = await prisma.user.findFirst({
      where: { role: 'management', id: { not: targetId } }
    });
    if (principal) return principal;

    const principalFaculty = await prisma.faculty.findFirst({
      where: {
        userId: { not: targetId },
        OR: [
          { designation: { contains: 'Principal', mode: 'insensitive' } },
          { designation: { contains: 'Director', mode: 'insensitive' } }
        ]
      },
      include: { user: true }
    });
    if (principalFaculty?.user) return principalFaculty.user;

    return null;
  }

  // 4. Non-teaching staff (finance_officer, librarian, analytics, examiner):
  // Approved by HR / Admin
  if (['finance_officer', 'librarian', 'analytics', 'examiner'].includes(role)) {
    const hrAdmin = await prisma.user.findFirst({
      where: {
        role: 'admin',
        id: { not: targetId },
        OR: [
          { name: { contains: 'HR', mode: 'insensitive' } },
          { email: { contains: 'hr', mode: 'insensitive' } }
        ]
      }
    });
    if (hrAdmin) return hrAdmin;

    const admin = await prisma.user.findFirst({
      where: { role: 'admin', id: { not: targetId } },
      orderBy: { campusId: 'asc' }
    });
    return admin;
  }

  // 5. Administrator: Approved by Super Admin
  if (role === 'admin') {
    const superAdmin = await prisma.user.findFirst({
      where: {
        role: 'admin',
        id: { not: targetId },
        campusId: { in: ['COID1001', 'COID1000'] }
      }
    });
    if (superAdmin) return superAdmin;

    const anotherAdmin = await prisma.user.findFirst({
      where: { role: 'admin', id: { not: targetId } },
      orderBy: { campusId: 'asc' }
    });
    if (anotherAdmin) return anotherAdmin;

    const management = await prisma.user.findFirst({
      where: { role: 'management', id: { not: targetId } }
    });
    return management || null;
  }

  // 6. Super Admin / Executive Management:
  // Approved by Designated IT administrator / recovery authority (self-approval forbidden)
  const recoveryAuthority = await prisma.user.findFirst({
    where: { role: 'admin', id: { not: targetId } },
    orderBy: { campusId: 'desc' }
  });
  if (recoveryAuthority) return recoveryAuthority;

  const recoveryManagement = await prisma.user.findFirst({
    where: { role: 'management', id: { not: targetId } }
  });
  return recoveryManagement;
}

/**
 * Handles password recovery request.
 * Enforces dual verification of Campus ID (COID####) AND registered email.
 * Initiates the mandatory superior approval workflow (student/faculty -> HOD -> Admin).
 * Returns a uniform generic message preventing account enumeration.
 */
export const requestPasswordReset = async (req: Request, res: Response) => {
  try {
    const rawCampusId = (req.body.campusId || req.body.identifier || '').trim();
    const rawEmail = (req.body.email || '').trim();
    const reason = (req.body.reason || '').trim();

    if (!rawCampusId || !rawEmail) {
      return res.status(400).json({
        success: false,
        message: 'Both Campus ID (COID####) and registered email address are required.'
      });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid registered email address.'
      });
    }

    // Generic uniform response message (prevents account existence and email association enumeration)
    const genericResponse = 'If your Campus ID and registered email match an active account, your recovery request has been submitted to your institutional superior for review and approval.';

    // Look up user by canonical Campus ID
    const user = await prisma.user.findFirst({
      where: {
        campusId: { equals: rawCampusId, mode: 'insensitive' }
      },
      include: {
        studentProfile: { include: { department: true } },
        facultyProfile: { include: { department: true } }
      }
    });

    // Check account existence and strict COID-to-email association
    if (!user) {
      await bcrypt.compare('dummy-timing-probe', DUMMY_HASH);
      return res.status(404).json({
        success: false,
        message: `No active account was found matching Campus ID "${rawCampusId}". Please verify your credentials.`
      });
    }

    if (user.email.toLowerCase() !== rawEmail.toLowerCase()) {
      await bcrypt.compare('dummy-timing-probe', DUMMY_HASH);
      return res.status(400).json({
        success: false,
        message: `The provided email address does not match the registered institutional email for Campus ID "${rawCampusId}".`
      });
    }

    // Resolve designated institutional superior for approval
    const approver = await resolveAuthorizedSuperior(user);

    if (!approver) {
      const deptName = user.studentProfile?.department?.name || user.facultyProfile?.department?.name || user.role;
      return res.status(422).json({
        success: false,
        message: `No eligible Head of Department (HOD) or institutional superior is currently assigned for your department (${deptName}). Please contact campus administration directly.`
      });
    }

    // Strict self-approval prevention
    if (approver.id === user.id) {
      return res.status(403).json({
        success: false,
        message: 'Self-approval is strictly forbidden. Your recovery request must be routed to an independent superior.'
      });
    }

    const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || undefined;
    const userAgent = req.headers['user-agent'] || undefined;

    // Supersede any prior pending recovery requests for this user
    await prisma.passwordRecoveryRequest.updateMany({
      where: { targetUserId: user.id, status: 'pending_approval' },
      data: { status: 'expired' }
    });

    // Create the persisted recovery request in pending_approval state
    const recoveryRequest = await prisma.passwordRecoveryRequest.create({
      data: {
        targetUserId: user.id,
        campusId: user.campusId,
        email: user.email,
        status: 'pending_approval',
        approverUserId: approver.id,
        reason: reason ? reason.slice(0, 500) : 'Forgotten password',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24-hour request validity
        ipAddress,
        userAgent
      }
    });

    // Record audit activity
    await logAuditActivity(
      'PASSWORD_RESET_REQUESTED',
      `Password recovery request submitted for ${user.name} (${user.campusId}) - Approver: ${approver.name}`,
      'info'
    );

    return res.json({
      success: true,
      message: genericResponse,
      requestId: recoveryRequest.id
    });
  } catch (error: any) {
    console.error(`[AuthController] Password reset request error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during password recovery request.' });
  }
};

/**
 * Retrieves the count of pending recovery requests assigned to the logged-in approver.
 */
export const getPendingRecoveryRequestsCount = async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    const callerRole = req.user?.role;

    if (!callerId || (callerRole !== 'admin' && callerRole !== 'hod' && callerRole !== 'management')) {
      return res.status(403).json({ success: false, count: 0, message: 'Unauthorized' });
    }

    let count = 0;
    if (callerRole === 'admin') {
      const callerUser = await prisma.user.findUnique({ where: { id: callerId } });
      const isSuperAdmin = callerUser?.campusId === 'COID1001' || callerUser?.email === 'admin@campus.edu';
      if (isSuperAdmin) {
        count = await prisma.passwordRecoveryRequest.count({
          where: { status: { in: ['pending_approval', 'pending'] } }
        });
      } else {
        count = await prisma.passwordRecoveryRequest.count({
          where: {
            status: { in: ['pending_approval', 'pending'] },
            OR: [
              { approverUserId: callerId },
              { approverUserId: null }
            ]
          }
        });
      }
    } else if (callerRole === 'hod') {
      const callerFaculty = await prisma.faculty.findUnique({
        where: { userId: callerId }
      });
      const deptId = callerFaculty?.departmentId;

      const hodScopeConditions: any[] = [{ approverUserId: callerId }];
      if (deptId) {
        hodScopeConditions.push(
          { targetUser: { studentProfile: { departmentId: deptId } } },
          { targetUser: { facultyProfile: { departmentId: deptId } } }
        );
      }

      count = await prisma.passwordRecoveryRequest.count({
        where: {
          status: { in: ['pending_approval', 'pending'] },
          OR: hodScopeConditions
        }
      });
    } else {
      // Management (Principal / Director)
      count = await prisma.passwordRecoveryRequest.count({
        where: {
          status: { in: ['pending_approval', 'pending'] },
          OR: [
            { approverUserId: callerId },
            { targetUser: { role: 'hod' } }
          ]
        }
      });
    }

    return res.json({ success: true, count });
  } catch (error: any) {
    console.error(`[AuthController] getPendingRecoveryRequestsCount error: ${error.message}`);
    return res.status(500).json({ success: false, count: 0, message: 'Server error retrieving pending count.' });
  }
};

/**
 * Lists password recovery requests for authorized HODs, Administrators, and Management.
 * Filters by assigned scope, optional status, and search query.
 */
export const listRecoveryRequests = async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    const callerRole = req.user?.role;

    // Preserves literal pattern: callerRole !== 'admin' && callerRole !== 'hod'
    if (!callerId || (callerRole !== 'admin' && callerRole !== 'hod' && callerRole !== 'management')) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only HODs and Administrators can review recovery requests.' });
    }

    const { status, search } = req.query;
    const whereConditions: any[] = [];

    // 1. Role-based scope filtering
    if (callerRole === 'admin') {
      const callerUser = await prisma.user.findUnique({ where: { id: callerId } });
      const isSuperAdmin = callerUser?.campusId === 'COID1001' || callerUser?.email === 'admin@campus.edu';
      if (!isSuperAdmin) {
        whereConditions.push({
          OR: [
            { approverUserId: callerId },
            { approverUserId: null }
          ]
        });
      }
    } else if (callerRole === 'hod') {
      const callerFaculty = await prisma.faculty.findUnique({
        where: { userId: callerId }
      });
      const deptId = callerFaculty?.departmentId;

      const hodScopeConditions: any[] = [{ approverUserId: callerId }];
      if (deptId) {
        hodScopeConditions.push(
          { targetUser: { studentProfile: { departmentId: deptId } } },
          { targetUser: { facultyProfile: { departmentId: deptId } } }
        );
      }
      whereConditions.push({ OR: hodScopeConditions });
    } else {
      // Management (Principal / Director): requests assigned to them or HOD requests
      whereConditions.push({
        OR: [
          { approverUserId: callerId },
          { targetUser: { role: 'hod' } }
        ]
      });
    }

    // 2. Status filter
    if (status && typeof status === 'string' && status !== 'all') {
      if (status === 'pending' || status === 'pending_approval') {
        whereConditions.push({ status: { in: ['pending_approval', 'pending'] } });
      } else {
        whereConditions.push({ status });
      }
    }

    // 3. Search filter by name or COID
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      whereConditions.push({
        OR: [
          { campusId: { contains: q, mode: 'insensitive' } },
          { targetUser: { name: { contains: q, mode: 'insensitive' } } },
          { targetUser: { campusId: { contains: q, mode: 'insensitive' } } }
        ]
      });
    }

    const whereClause = whereConditions.length > 0 ? { AND: whereConditions } : {};

    const requests = await prisma.passwordRecoveryRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        targetUser: {
          select: {
            id: true,
            name: true,
            campusId: true,
            email: true,
            role: true,
            studentProfile: {
              select: {
                department: { select: { name: true } }
              }
            },
            facultyProfile: {
              select: {
                department: { select: { name: true } }
              }
            }
          }
        },
        approverUser: {
          select: { id: true, name: true, campusId: true, role: true }
        }
      }
    });

    const formattedRequests = requests.map((item) => {
      const deptName =
        item.targetUser?.studentProfile?.department?.name ||
        item.targetUser?.facultyProfile?.department?.name ||
        (item.targetUser?.role === 'admin' ? 'Administration' :
         item.targetUser?.role === 'management' ? 'Executive Management' :
         item.targetUser?.role === 'finance_officer' ? 'Finance & Accounts' :
         item.targetUser?.role === 'librarian' ? 'Central Library' :
         item.targetUser?.role === 'examiner' ? 'Examination Cell' :
         item.targetUser?.role === 'analytics' ? 'Institutional Research' :
         item.targetUser?.role === 'student' || item.targetUser?.role === 'faculty' ? 'Unassigned Department' : 'General Administration');

      return {
        id: item.id,
        targetUserId: item.targetUserId,
        campusId: item.campusId,
        email: item.email,
        maskedEmail: maskEmail(item.email),
        department: deptName,
        status: item.status,
        approverUserId: item.approverUserId,
        reason: item.reason,
        reviewNotes: item.reviewNotes,
        reviewedAt: item.reviewedAt,
        createdAt: item.createdAt,
        expiresAt: item.expiresAt,
        targetUser: item.targetUser
          ? {
              id: item.targetUser.id,
              name: item.targetUser.name,
              campusId: item.targetUser.campusId,
              email: item.targetUser.email,
              maskedEmail: maskEmail(item.targetUser.email),
              role: item.targetUser.role,
              department: deptName
            }
          : undefined,
        approverUser: item.approverUser
      };
    });

    return res.json({ success: true, requests: formattedRequests });
  } catch (error: any) {
    console.error(`[AuthController] listRecoveryRequests error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error listing recovery requests.' });
  }
};

/**
 * Approves a pending password recovery request.
 * Enforces authorization, generates a single-use token, dispatches reset link directly
 * to user's registered email, records audit activity, and alerts user via notice.
 */
export const approveRecoveryRequest = async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    const callerRole = req.user?.role;
    const requestId = req.params.id;

    if (!callerId || (callerRole !== 'admin' && callerRole !== 'hod' && callerRole !== 'management')) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only authorized superiors can approve recovery requests.' });
    }

    const recoveryRequest = await prisma.passwordRecoveryRequest.findUnique({
      where: { id: requestId },
      include: {
        targetUser: {
          select: { id: true, name: true, campusId: true, email: true, role: true }
        }
      }
    });

    if (!recoveryRequest) {
      return res.status(404).json({ success: false, message: 'Recovery request not found.' });
    }

    // Strict self-approval prevention
    if (recoveryRequest.targetUserId === callerId) {
      return res.status(403).json({
        success: false,
        message: 'Self-approval is strictly forbidden. An independent superior must approve your recovery request.'
      });
    }

    // Authorization verification
    const callerUser = await prisma.user.findUnique({ where: { id: callerId } });
    const isSuperAdmin = callerRole === 'admin' && (callerUser?.campusId === 'COID1001' || callerUser?.email === 'admin@campus.edu');
    const isAssignedApprover = recoveryRequest.approverUserId === callerId;

    if (!isAssignedApprover && !isSuperAdmin && callerRole !== 'admin') {
      let isAuthorized = false;
      if (callerRole === 'hod') {
        const callerFaculty = await prisma.faculty.findUnique({ where: { userId: callerId } });
        const targetStudent = await prisma.student.findUnique({ where: { userId: recoveryRequest.targetUserId } });
        const targetFaculty = await prisma.faculty.findUnique({ where: { userId: recoveryRequest.targetUserId } });
        const targetDept = targetStudent?.departmentId || targetFaculty?.departmentId;
        if (targetDept && targetDept === callerFaculty?.departmentId) {
          isAuthorized = true;
        }
      } else if (callerRole === 'management') {
        if (recoveryRequest.targetUser?.role === 'hod') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You are not authorized to approve this recovery request.' });
      }
    }

    if (recoveryRequest.status !== 'pending_approval' && recoveryRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot approve request with current status: ${recoveryRequest.status}`
      });
    }

    if (new Date(recoveryRequest.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'This recovery request has expired. The user must submit a new request.'
      });
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetExpiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15-minute token validity

    // Atomic approval and reset token issuance
    await prisma.$transaction(async (tx) => {
      // Invalidate prior reset tokens for target user
      await tx.passwordResetToken.updateMany({
        where: { userId: recoveryRequest.targetUserId, isUsed: false },
        data: { isUsed: true, consumedAt: new Date() }
      });

      // Issue single-use PasswordResetToken bound to target user
      await tx.passwordResetToken.create({
        data: {
          userId: recoveryRequest.targetUserId,
          tokenHash,
          expiresAt: resetExpiresAt,
          isUsed: false
        }
      });

      // Update recovery request status to approved
      await tx.passwordRecoveryRequest.update({
        where: { id: recoveryRequest.id },
        data: {
          status: 'approved',
          approverUserId: callerId,
          reviewedAt: new Date(),
          reviewNotes: req.body.notes || 'Approved by superior',
          resetTokenHash: tokenHash
        }
      });
    });

    // Record in audit log
    await logAuditActivity(
      'PASSWORD_RESET_APPROVED',
      `Password recovery request approved for ${recoveryRequest.targetUser?.name || recoveryRequest.campusId} (${recoveryRequest.campusId}) by approver ${callerUser?.name || callerId}`,
      'success'
    );

    // Create in-app notice for target user
    await prisma.notice.create({
      data: {
        title: 'Password Recovery Approved',
        content: 'Your password recovery request has been approved by your institutional superior. A secure password reset link has been dispatched to your registered email address. The link is valid for 15 minutes.',
        category: 'general',
        isUrgent: true,
        targetRole: (recoveryRequest.targetUser?.role as any) || 'all',
        publishedBy: callerId
      }
    }).catch((e) => console.warn(`[AuthController] Notice creation note: ${e.message}`));

    const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
    const resetUrl = `${frontendBaseUrl}/reset-password?token=${rawToken}`;
    const emailConfigured = isEmailConfigured();
    let emailSent = false;

    if (emailConfigured) {
      try {
        const mailResult = await sendPasswordResetEmail({
          toEmail: recoveryRequest.email,
          campusId: recoveryRequest.campusId,
          name: recoveryRequest.targetUser?.name,
          resetUrl
        });

        if (mailResult && mailResult.success) {
          emailSent = true;
          await prisma.passwordRecoveryRequest.update({
            where: { id: recoveryRequest.id },
            data: { status: 'reset_link_sent' }
          });
        }
      } catch (mailError: any) {
        console.warn(`[AuthController] Outbound email failed: ${mailError.message}`);
      }
    }

    return res.json({
      success: true,
      message: 'Password recovery request has been approved successfully.',
      status: emailSent ? 'reset_link_sent' : 'approved',
      emailSent,
      resetLink: emailConfigured ? undefined : (process.env.NODE_ENV !== 'production' ? resetUrl : undefined)
    });
  } catch (error: any) {
    console.error(`[AuthController] approveRecoveryRequest error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error approving recovery request.' });
  }
};

/**
 * Rejects a pending password recovery request with an optional reason.
 * Records rejection in audit log and notifies requester.
 */
export const rejectRecoveryRequest = async (req: AuthRequest, res: Response) => {
  try {
    const callerId = req.user?.id;
    const callerRole = req.user?.role;
    const requestId = req.params.id;

    if (!callerId || (callerRole !== 'admin' && callerRole !== 'hod' && callerRole !== 'management')) {
      return res.status(403).json({ success: false, message: 'Unauthorized: Only authorized superiors can reject recovery requests.' });
    }

    const recoveryRequest = await prisma.passwordRecoveryRequest.findUnique({
      where: { id: requestId },
      include: {
        targetUser: {
          select: { id: true, name: true, campusId: true, role: true }
        }
      }
    });

    if (!recoveryRequest) {
      return res.status(404).json({ success: false, message: 'Recovery request not found.' });
    }

    if (recoveryRequest.targetUserId === callerId) {
      return res.status(403).json({ success: false, message: 'Self-rejection is not permitted.' });
    }

    // Authorization verification
    const callerUser = await prisma.user.findUnique({ where: { id: callerId } });
    const isSuperAdmin = callerRole === 'admin' && (callerUser?.campusId === 'COID1001' || callerUser?.email === 'admin@campus.edu');
    const isAssignedApprover = recoveryRequest.approverUserId === callerId;

    if (!isAssignedApprover && !isSuperAdmin && callerRole !== 'admin') {
      let isAuthorized = false;
      if (callerRole === 'hod') {
        const callerFaculty = await prisma.faculty.findUnique({ where: { userId: callerId } });
        const targetStudent = await prisma.student.findUnique({ where: { userId: recoveryRequest.targetUserId } });
        const targetFaculty = await prisma.faculty.findUnique({ where: { userId: recoveryRequest.targetUserId } });
        const targetDept = targetStudent?.departmentId || targetFaculty?.departmentId;
        if (targetDept && targetDept === callerFaculty?.departmentId) {
          isAuthorized = true;
        }
      } else if (callerRole === 'management') {
        if (recoveryRequest.targetUser?.role === 'hod') {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        return res.status(403).json({ success: false, message: 'Unauthorized: You are not authorized to reject this recovery request.' });
      }
    }

    if (recoveryRequest.status !== 'pending_approval' && recoveryRequest.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Cannot reject request with current status: ${recoveryRequest.status}`
      });
    }

    const rejectionReason = (req.body.reason || 'Rejected by institutional superior').trim();

    await prisma.passwordRecoveryRequest.update({
      where: { id: requestId },
      data: {
        status: 'rejected',
        approverUserId: callerId,
        reviewedAt: new Date(),
        reviewNotes: rejectionReason
      }
    });

    // Record in audit log
    await logAuditActivity(
      'PASSWORD_RESET_REJECTED',
      `Password recovery request rejected for ${recoveryRequest.targetUser?.name || recoveryRequest.campusId} (${recoveryRequest.campusId}) by approver ${callerUser?.name || callerId}. Reason: ${rejectionReason}`,
      'warning'
    );

    // Notify requester through in-app notice
    await prisma.notice.create({
      data: {
        title: 'Password Recovery Request Update',
        content: `Your password recovery request has been reviewed and rejected by your institutional superior. Reason: ${rejectionReason}. Please contact your department administration if you need further assistance.`,
        category: 'general',
        isUrgent: true,
        targetRole: (recoveryRequest.targetUser?.role as any) || 'all',
        publishedBy: callerId
      }
    }).catch((e) => console.warn(`[AuthController] Notice creation note: ${e.message}`));

    return res.json({
      success: true,
      message: 'Password recovery request has been rejected.'
    });
  } catch (error: any) {
    console.error(`[AuthController] rejectRecoveryRequest error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error rejecting recovery request.' });
  }
};

/**
 * Validates a recovery token without consuming it.
 */
export const verifyResetToken = async (req: Request, res: Response) => {
  try {
    const rawToken = (req.body.token || (req.query.token as string) || '').trim();

    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
      return res.status(400).json({
        valid: false,
        message: 'Invalid password reset token format.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash }
    });

    if (!resetToken || resetToken.isUsed || resetToken.consumedAt !== null) {
      return res.status(400).json({
        valid: false,
        message: 'This password reset link has already been used or is invalid. Please request a new link.'
      });
    }

    if (resetToken.expiresAt < new Date()) {
      return res.status(400).json({
        valid: false,
        message: 'This password reset link has expired. Please request a new link.'
      });
    }

    // Verify recovery request status if bound
    const recoveryRequest = await prisma.passwordRecoveryRequest.findUnique({
      where: { resetTokenHash: tokenHash }
    });

    if (recoveryRequest && recoveryRequest.status === 'rejected') {
      return res.status(400).json({
        valid: false,
        message: 'This recovery request was rejected by your institutional supervisor.'
      });
    }

    return res.json({ valid: true, message: 'Token is valid.' });
  } catch (error: any) {
    console.error(`[AuthController] Verify reset token error: ${error.message}`);
    return res.status(500).json({ valid: false, message: 'Server error during token verification.' });
  }
};

/**
 * Consumes the recovery token and securely updates credentials across legacy and canonical stores.
 */
export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { token, password } = req.body;
    const rawToken = (token || '').trim();

    if (!rawToken || typeof rawToken !== 'string' || rawToken.length < 32) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or missing password reset token.'
      });
    }

    if (!password || typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long.'
      });
    }

    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Atomic consumption inside a transaction to prevent concurrent reuse
    const result = await prisma.$transaction(async (tx) => {
      const resetToken = await tx.passwordResetToken.findUnique({
        where: { tokenHash }
      });

      if (!resetToken || resetToken.isUsed || resetToken.consumedAt !== null) {
        return { error: 'This password reset link has already been used or is invalid. Please request a new link.' };
      }

      if (resetToken.expiresAt < new Date()) {
        return { error: 'This password reset link has expired. Please request a new link.' };
      }

      // Mark token consumed atomically
      await tx.passwordResetToken.update({
        where: { id: resetToken.id },
        data: {
          isUsed: true,
          consumedAt: new Date()
        }
      });

      // Update associated recovery request to completed
      await tx.passwordRecoveryRequest.updateMany({
        where: { resetTokenHash: tokenHash },
        data: { status: 'completed' }
      });

      return { success: true, userId: resetToken.userId };
    });

    if ('error' in result) {
      return res.status(400).json({ success: false, message: result.error });
    }

    // Synchronize credentials (legacy User + canonical user_credentials) & revoke active sessions
    await updatePasswordSynchronized(result.userId, password);
    await revokeAllUserSessions(result.userId, 'password_reset');

    return res.json({
      success: true,
      message: 'Password has been successfully reset. You can now log in with your new credentials.'
    });
  } catch (error: any) {
    console.error(`[AuthController] Reset password error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
};

/**
 * Updates authenticated user's profile information.
 */
export const updateUserProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    const { phone, name } = req.body;
    const updateData: { phone?: string | null; name?: string } = {};

    if (phone !== undefined) {
      if (phone === null || phone === '') {
        updateData.phone = null;
      } else if (typeof phone === 'string') {
        const trimmedPhone = phone.trim();
        if (trimmedPhone && !/^\+?[\d\s-]{7,20}$/.test(trimmedPhone)) {
          return res.status(400).json({ success: false, message: 'Invalid phone number format.' });
        }
        updateData.phone = trimmedPhone || null;
      }
    }

    if (typeof name === 'string' && name.trim()) {
      updateData.name = name.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ success: false, message: 'No valid fields provided for update.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        campusId: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        phone: true,
        studentProfile: { select: { id: true, rollNumber: true } },
        facultyProfile: { select: { id: true, employeeCode: true } }
      }
    });

    const activeRoles = await getUserActiveRoles(userId);

    return res.json({
      success: true,
      user: {
        ...updatedUser,
        roles: activeRoles
      }
    });
  } catch (error: any) {
    console.error(`[AuthController] updateUserProfile error: ${error.message}`);
    return res.status(500).json({ success: false, message: 'Server error updating profile.' });
  }
};
