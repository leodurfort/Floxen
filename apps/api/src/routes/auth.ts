import { Router } from 'express';
import {
  login,
  me,
  refresh,
  // Multi-step registration
  registerStart,
  registerVerify,
  registerResend,
  registerPassword,
  registerComplete,
  // Forgot password
  forgotPassword,
  forgotPasswordVerify,
  forgotPasswordReset,
} from '../controllers/authController';
import { googleAuth } from '../controllers/googleAuthController';
import { requireAuth } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';

const router = Router();

// Rate limit all auth endpoints: 20 req/min per IP
router.use(authLimiter);

// Google OAuth
router.post('/google', googleAuth);

// Multi-step registration flow
router.post('/register/start', registerStart);
router.post('/register/verify', registerVerify);
router.post('/register/resend', registerResend);
router.post('/register/password', registerPassword);
router.post('/register/complete', registerComplete);

// Login & token refresh
router.post('/login', login);
router.post('/refresh', refresh);

// Forgot password flow
router.post('/forgot-password', forgotPassword);
router.post('/forgot-password/verify', forgotPasswordVerify);
router.post('/forgot-password/reset', forgotPasswordReset);

// Protected routes
router.get('/me', requireAuth, me);

export default router;
