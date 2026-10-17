import crypto from 'crypto';
import prisma from '../config/db';
import { AuthSession } from '@prisma/client';

export interface SessionMetadata {
  ipAddress?: string;
  userAgent?: string;
  durationMs?: number;
}

export interface SessionValidationResult {
  valid: boolean;
  session?: AuthSession;
  reason?: string;
}

const DEFAULT_SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours
const ACTIVITY_THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Creates a server-side session in auth_sessions.
 * Stores a cryptographically secure SHA-256 hash in session_token_hash.
 */
export async function createSession(
  userId: string,
  metadata?: SessionMetadata
): Promise<{ sessionId: string; expiresAt: Date }> {
  const duration = metadata?.durationMs || DEFAULT_SESSION_DURATION_MS;
  const expiresAt = new Date(Date.now() + duration);

  // Generate a random token material and hash it
  const rawTokenSecret = crypto.randomBytes(32).toString('hex');
  const sessionTokenHash = crypto.createHash('sha256').update(rawTokenSecret).digest('hex');

  const session = await prisma.authSession.create({
    data: {
      userId,
      sessionTokenHash,
      ipAddress: metadata?.ipAddress || null,
      userAgent: metadata?.userAgent || null,
      isActive: true,
      expiresAt,
      lastActivityAt: new Date()
    }
  });

  return { sessionId: session.id, expiresAt };
}

/**
 * Validates session status against auth_sessions table.
 * Asserts active status, non-expired, and user identity match.
 * Performs throttled activity updating.
 */
export async function validateSession(
  sessionId: string,
  userId: string
): Promise<SessionValidationResult> {
  if (!sessionId || !userId) {
    return { valid: false, reason: 'Missing session or user identifier' };
  }

  const session = await prisma.authSession.findUnique({
    where: { id: sessionId }
  });

  if (!session) {
    return { valid: false, reason: 'Session not found' };
  }

  if (session.userId !== userId) {
    return { valid: false, reason: 'Session user identity mismatch' };
  }

  if (!session.isActive) {
    return { valid: false, reason: 'Session has been revoked' };
  }

  const now = new Date();
  if (session.expiresAt <= now) {
    return { valid: false, reason: 'Session has expired' };
  }

  // Throttled activity update (at most once every 5 minutes)
  const timeSinceLastActivity = now.getTime() - new Date(session.lastActivityAt).getTime();
  if (timeSinceLastActivity > ACTIVITY_THROTTLE_MS) {
    // Non-blocking fire-and-forget update
    prisma.authSession.update({
      where: { id: session.id },
      data: { lastActivityAt: now }
    }).catch((err) => {
      console.warn(`[SessionService] Activity update failed: ${err.message}`);
    });
  }

  return { valid: true, session };
}

/**
 * Revokes a single session (used on logout).
 */
export async function revokeSession(
  sessionId: string,
  reason: string = 'user_logout'
): Promise<boolean> {
  if (!sessionId) return false;

  const result = await prisma.authSession.updateMany({
    where: { id: sessionId, isActive: true },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revocationReason: reason
    }
  });

  return result.count > 0;
}

/**
 * Revokes all active sessions for a user (used on password change or account lockout).
 */
export async function revokeAllUserSessions(
  userId: string,
  reason: string = 'admin_forced'
): Promise<number> {
  if (!userId) return 0;

  const result = await prisma.authSession.updateMany({
    where: { userId, isActive: true },
    data: {
      isActive: false,
      revokedAt: new Date(),
      revocationReason: reason
    }
  });

  return result.count;
}
