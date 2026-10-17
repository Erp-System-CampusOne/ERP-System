import bcrypt from 'bcryptjs';
import prisma from '../config/db';
import { User, UserCredential } from '@prisma/client';
import { revokeAllUserSessions } from './sessionService';

export interface VerifyCredentialResult {
  success: boolean;
  user?: User & { studentProfile?: any; facultyProfile?: any };
  locked?: boolean;
  lockedUntil?: Date | null;
  error?: string;
  source?: 'canonical' | 'legacy';
}

const DUMMY_HASH = '$2a$10$abcdefghijklmnopqrstuvwxyzABCDEF1234567890abcdefghijklm'; // For timing attack prevention
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

/**
 * Resolves user identity from campusId (COID####), rollNumber, or employeeCode.
 * Email login is strictly disabled.
 */
export async function resolveUserByIdentifier(identifier: string) {
  if (!identifier || typeof identifier !== 'string') return null;

  const trimmed = identifier.trim();
  if (trimmed.includes('@')) {
    // Email is stored for record purposes only, not permitted as a login method
    return null;
  }

  const upper = trimmed.toUpperCase();

  // 1. Primary: Lookup by CampusOne ID (COID####)
  const userByCampusId = await prisma.user.findUnique({
    where: { campusId: upper },
    include: {
      studentProfile: { include: { department: true } },
      facultyProfile: { include: { department: true } }
    }
  });
  if (userByCampusId) return userByCampusId;

  // 2. Lookup student rollNumber
  const student = await prisma.student.findUnique({
    where: { rollNumber: trimmed },
    include: {
      user: {
        include: {
          studentProfile: { include: { department: true } },
          facultyProfile: { include: { department: true } }
        }
      }
    }
  });
  if (student && student.user) return student.user;

  // 3. Lookup faculty employeeCode
  const faculty = await prisma.faculty.findUnique({
    where: { employeeCode: trimmed },
    include: {
      user: {
        include: {
          studentProfile: { include: { department: true } },
          facultyProfile: { include: { department: true } }
        }
      }
    }
  });
  if (faculty && faculty.user) return faculty.user;

  return null;
}

/**
 * Concurrency-safe, atomic verification of user credentials.
 * Implements dual-read fallback, lazy backfill, and atomic lockout increment.
 */
export async function verifyCredentials(
  identifier: string,
  password: string
): Promise<VerifyCredentialResult> {
  const trimmed = (identifier || '').trim();

  // Enforce rejection if user attempts to log in using an email
  if (trimmed.includes('@')) {
    return {
      success: false,
      error: 'Email login is disabled. Please log in using your CampusOne ID (e.g., COID1001).'
    };
  }

  const user = await resolveUserByIdentifier(identifier);

  if (!user) {
    // Perform dummy compare to prevent username enumeration via timing attacks
    await bcrypt.compare(password, DUMMY_HASH);
    return { success: false, error: 'Invalid CampusOne ID or password' };
  }

  // Check canonical user_credentials table
  const credential = await prisma.userCredential.findUnique({
    where: {
      userId_credentialType: {
        userId: user.id,
        credentialType: 'password'
      }
    }
  });

  const now = new Date();

  // If canonical record exists, enforce lockout policy
  if (credential) {
    if (credential.lockedUntil && credential.lockedUntil > now) {
      return {
        success: false,
        locked: true,
        lockedUntil: credential.lockedUntil,
        error: 'Account temporarily locked. Please try again later.'
      };
    }

    const isMatch = await bcrypt.compare(password, credential.passwordHash);

    if (isMatch) {
      // Concurrency-safe reset of failed attempts on successful login
      if (credential.failedLoginAttempts > 0 || credential.lockedUntil !== null) {
        await prisma.userCredential.update({
          where: { id: credential.id },
          data: {
            failedLoginAttempts: 0,
            lockedUntil: null
          }
        });
      }

      return { success: true, user, source: 'canonical' };
    } else {
      // Atomically increment failed attempts using Prisma atomic operation
      const updated = await prisma.userCredential.update({
        where: { id: credential.id },
        data: {
          failedLoginAttempts: { increment: 1 }
        },
        select: {
          failedLoginAttempts: true,
          lockedUntil: true
        }
      });

      const isNowLocked = updated.failedLoginAttempts >= MAX_FAILED_ATTEMPTS;

      if (isNowLocked) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        await prisma.userCredential.update({
          where: { id: credential.id },
          data: { lockedUntil }
        });

        // Invalidate active sessions to prevent hijacked sessions from persisting
        await revokeAllUserSessions(user.id, 'account_locked_brute_force');

        return {
          success: false,
          locked: true,
          lockedUntil,
          error: 'Account temporarily locked due to multiple failed login attempts.'
        };
      }

      return { success: false, error: 'Invalid credentials' };
    }
  }

  // Fallback to legacy User.password
  const isLegacyMatch = await bcrypt.compare(password, user.password);

  if (!isLegacyMatch) {
    // Initialize or track failed attempts for legacy accounts in user_credentials
    try {
      const legacyCred = await prisma.userCredential.upsert({
        where: {
          userId_credentialType: {
            userId: user.id,
            credentialType: 'password'
          }
        },
        create: {
          userId: user.id,
          credentialType: 'password',
          passwordHash: user.password,
          algorithm: 'bcrypt',
          requiresChange: false,
          failedLoginAttempts: 1,
          lockedUntil: null
        },
        update: {
          failedLoginAttempts: { increment: 1 }
        }
      });

      if (legacyCred.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        const lockedUntil = new Date(now.getTime() + LOCKOUT_DURATION_MS);
        await prisma.userCredential.update({
          where: { id: legacyCred.id },
          data: { lockedUntil }
        });

        await revokeAllUserSessions(user.id, 'account_locked_brute_force');

        return {
          success: false,
          locked: true,
          lockedUntil,
          error: 'Account temporarily locked due to multiple failed login attempts.'
        };
      }
    } catch (err: any) {
      console.warn(`[CredentialService] Failed attempt tracking notice for legacy user ${user.id}`);
    }

    return { success: false, error: 'Invalid credentials' };
  }

  // Atomic lazy backfill into canonical user_credentials
  try {
    await prisma.userCredential.upsert({
      where: {
        userId_credentialType: {
          userId: user.id,
          credentialType: 'password'
        }
      },
      create: {
        userId: user.id,
        credentialType: 'password',
        passwordHash: user.password,
        algorithm: 'bcrypt',
        requiresChange: false,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      update: {} // If already created concurrently, do nothing
    });
  } catch (err) {
    // Unique constraint violation (P2002) is safe under concurrent logins
    console.warn(`[CredentialService] Concurrent backfill notice for user ${user.id}`);
  }

  return { success: true, user, source: 'legacy' };
}

/**
 * Synchronizes password updates across both legacy and canonical records atomically.
 * Automatically invalidates all existing active sessions to prevent token replay.
 */
export async function updatePasswordSynchronized(
  userId: string,
  newPlainPassword: string
): Promise<void> {
  const hashedPassword = await bcrypt.hash(newPlainPassword, 10);

  await prisma.$transaction(async (tx) => {
    // 1. Update legacy User table
    await tx.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    // 2. Upsert canonical user_credentials table
    await tx.userCredential.upsert({
      where: {
        userId_credentialType: {
          userId,
          credentialType: 'password'
        }
      },
      create: {
        userId,
        credentialType: 'password',
        passwordHash: hashedPassword,
        algorithm: 'bcrypt',
        passwordChangedAt: new Date(),
        requiresChange: false,
        failedLoginAttempts: 0,
        lockedUntil: null
      },
      update: {
        passwordHash: hashedPassword,
        algorithm: 'bcrypt',
        passwordChangedAt: new Date(),
        requiresChange: false,
        failedLoginAttempts: 0,
        lockedUntil: null
      }
    });
  });

  // Revoke all existing sessions for this user across devices
  await revokeAllUserSessions(userId, 'password_change');
}

/**
 * Explicit unlock for an account by user ID
 */
export async function unlockUserAccount(userId: string): Promise<void> {
  await prisma.userCredential.updateMany({
    where: { userId, credentialType: 'password' },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null
    }
  });
}
