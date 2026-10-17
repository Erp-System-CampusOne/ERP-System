import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../config/db';
import { verifyCredentials } from '../services/credentialService';
import { createSession, revokeSession } from '../services/sessionService';
import { getUserActiveRoles } from '../services/roleService';
import { AuthRequest } from '../middlewares/authMiddleware';

const JWT_SECRET = process.env.JWT_SECRET as string;

export const loginUser = async (req: Request, res: Response) => {
  try {
    const { identifier, password, role } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    // Step 1: Concurrency-safe credential verification & lockout enforcement
    const verifyResult = await verifyCredentials(identifier, password);

    if (!verifyResult.success) {
      if (verifyResult.locked) {
        return res.status(403).json({
          success: false,
          message: verifyResult.error || 'Account temporarily locked. Please try again later.'
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
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
