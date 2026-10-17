import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { validateSession } from '../services/sessionService';
import prisma from '../config/db';

const JWT_SECRET = process.env.JWT_SECRET as string;

// Server-enforced cutoff timestamp for legacy tokens lacking 'sid'
// Tokens issued on or after this timestamp MUST contain a valid canonical session ID ('sid')
export const TRANSITION_CUTOFF_TIMESTAMP = process.env.AUTH_LEGACY_CUTOFF_TIMESTAMP
  ? parseInt(process.env.AUTH_LEGACY_CUTOFF_TIMESTAMP, 10)
  : Math.floor(Date.now() / 1000);

// Maximum transition grace period (24 hours): legacy tokens cannot be used indefinitely after cutoff
export const TRANSITION_GRACE_PERIOD_SECONDS = process.env.AUTH_LEGACY_GRACE_SECONDS
  ? parseInt(process.env.AUTH_LEGACY_GRACE_SECONDS, 10)
  : 24 * 60 * 60;

export interface AuthUserContext {
  id: string;
  role: string;
  roles: string[];
  sessionId?: string;
  tokenVersion?: number;
}

export interface AuthRequest extends Request {
  user?: AuthUserContext;
}

interface DecodedTokenPayload {
  id: string;
  role: string;
  roles?: string[];
  sid?: string;
  ver?: number;
  iat: number;
  exp: number;
}

export const authenticateJWT = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization header missing or malformed' });
  }

  const token = authHeader.split(' ')[1];

  let payload: DecodedTokenPayload;
  try {
    payload = jwt.verify(token, JWT_SECRET) as DecodedTokenPayload;
  } catch (err: any) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }

  if (!payload || !payload.id || typeof payload.id !== 'string') {
    return res.status(401).json({ success: false, message: 'Invalid token: missing subject identity' });
  }

  try {
    // Check 1: Canonical Session Validation
    if (payload.sid) {
      const sessionResult = await validateSession(payload.sid, payload.id);
      if (!sessionResult.valid) {
        return res.status(401).json({
          success: false,
          message: sessionResult.reason || 'Session has been revoked or expired'
        });
      }

      // Check account lockout status in user_credentials
      const cred = await prisma.userCredential.findUnique({
        where: { userId_credentialType: { userId: payload.id, credentialType: 'password' } },
        select: { lockedUntil: true }
      });
      if (cred?.lockedUntil && cred.lockedUntil > new Date()) {
        return res.status(403).json({ success: false, message: 'Account temporarily locked' });
      }

      req.user = {
        id: payload.id,
        role: payload.role,
        roles: payload.roles && payload.roles.length > 0 ? payload.roles : [payload.role],
        sessionId: payload.sid,
        tokenVersion: payload.ver || 1
      };

      return next();
    }

    // Check 2: Legacy Token Transition Window Validation
    // Missing, malformed, or non-numeric iat is strictly rejected
    if (payload.iat === undefined || payload.iat === null || typeof payload.iat !== 'number' || isNaN(payload.iat)) {
      return res.status(401).json({
        success: false,
        message: 'Legacy token rejected: missing or malformed issued-at (iat) claim'
      });
    }

    const nowSec = Math.floor(Date.now() / 1000);

    // Reject tokens claiming to be issued in the future (allowing max 60s clock skew)
    if (payload.iat > nowSec + 60) {
      return res.status(401).json({
        success: false,
        message: 'Legacy token rejected: issued-at timestamp is in the future'
      });
    }

    // Tokens without 'sid' issued on or after the transition cutoff are strictly rejected
    if (payload.iat >= TRANSITION_CUTOFF_TIMESTAMP) {
      return res.status(401).json({
        success: false,
        message: 'Legacy token issued after migration cutoff is invalid. Re-authentication required.'
      });
    }

    // Legacy tokens cannot bypass cutoff indefinitely: reject if grace window has elapsed
    if (nowSec > TRANSITION_CUTOFF_TIMESTAMP + TRANSITION_GRACE_PERIOD_SECONDS) {
      return res.status(401).json({
        success: false,
        message: 'Legacy token transition window has expired. Please log in again.'
      });
    }

    // Check account lockout even for eligible legacy tokens
    const cred = await prisma.userCredential.findUnique({
      where: { userId_credentialType: { userId: payload.id, credentialType: 'password' } },
      select: { lockedUntil: true }
    });
    if (cred?.lockedUntil && cred.lockedUntil > new Date()) {
      return res.status(403).json({ success: false, message: 'Account temporarily locked' });
    }

    // Eligible legacy token accepted within transition window
    req.user = {
      id: payload.id,
      role: payload.role,
      roles: [payload.role]
    };

    return next();
  } catch (dbErr: any) {
    console.error(`[AuthMiddleware] Fail-closed authentication error: ${dbErr.message}`);
    return res.status(500).json({ success: false, message: 'Authentication verification service error' });
  }
};
