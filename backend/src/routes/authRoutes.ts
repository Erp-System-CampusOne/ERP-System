import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import {
  loginUser,
  logoutUser,
  getCurrentUser,
  requestPasswordReset,
  getPendingRecoveryRequestsCount,
  listRecoveryRequests,
  approveRecoveryRequest,
  rejectRecoveryRequest,
  verifyResetToken,
  resetPassword,
  updateUserProfile
} from '../controllers/authController';
import { authenticateJWT } from '../middlewares/authMiddleware';

const router = Router();

// Dedicated rate limiting for password recovery to prevent brute-force / enumeration
const recoveryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many recovery attempts from this IP. Please try again after 15 minutes.'
  }
});

router.post('/login', loginUser);
router.post('/logout', authenticateJWT, logoutUser);
router.get('/me', authenticateJWT, getCurrentUser);

// Password Recovery & Superior Approval Endpoints
router.post('/forgot-password', recoveryLimiter, requestPasswordReset);
router.get('/recovery-requests/pending-count', authenticateJWT, getPendingRecoveryRequestsCount);
router.get('/recovery-requests', authenticateJWT, listRecoveryRequests);
router.post('/recovery-requests/:id/approve', authenticateJWT, approveRecoveryRequest);
router.post('/recovery-requests/:id/reject', authenticateJWT, rejectRecoveryRequest);

// Password Reset Token Verification & Execution Endpoints
router.post('/verify-reset-token', verifyResetToken);
router.get('/reset-password/verify', verifyResetToken);
router.post('/reset-password', recoveryLimiter, resetPassword);

// Profile Updates
router.patch('/profile', authenticateJWT, updateUserProfile);

export default router;
