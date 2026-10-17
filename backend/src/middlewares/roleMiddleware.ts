import { Response, NextFunction } from 'express';
import { AuthRequest } from './authMiddleware';
import { checkUserHasRole } from '../services/roleService';

/**
 * Authorization middleware enforcing live database role verification.
 * Evaluates active canonical user_role_assignments to guarantee immediate revocation
 * of privileged access and prevent stale-token privilege escalation.
 */
export const authorizeRoles = (...allowedRoles: string[]) => {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    if (allowedRoles.includes('all')) {
      return next();
    }

    try {
      const isAuthorized = await checkUserHasRole(req.user.id, allowedRoles);

      if (isAuthorized) {
        return next();
      }

      return res.status(403).json({ success: false, message: 'Forbidden: Insufficient privileges' });
    } catch (err: any) {
      console.error(`[RoleMiddleware] Authorization check error: ${err.message}`);
      // Fail closed on database authorization error
      return res.status(500).json({ success: false, message: 'Authorization verification failed' });
    }
  };
};
