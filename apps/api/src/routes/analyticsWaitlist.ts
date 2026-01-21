import { Router } from 'express';
import { signupWaitlist, checkWaitlistStatus } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.post('/waitlist', requireAuth, signupWaitlist);
router.get('/waitlist/status', requireAuth, checkWaitlistStatus);

export default router;
