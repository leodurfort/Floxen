import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  changeEmail,
  changeEmailVerify,
  changePassword,
  deleteAccount,
} from '../controllers/userController';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Profile
router.get('/me', getProfile);
router.patch('/me/profile', updateProfile);

// Email change
router.post('/me/change-email', changeEmail);
router.post('/me/change-email/verify', changeEmailVerify);

// Password change
router.post('/me/change-password', changePassword);

// Account deletion (immediate hard delete)
router.delete('/me/delete', deleteAccount);

export default router;
