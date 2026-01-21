import { Router } from 'express';
import { signupWaitlist } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/waitlist', requireAuth, signupWaitlist);

export default router;
