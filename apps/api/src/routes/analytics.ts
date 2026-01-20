import { Router } from 'express';
import { getOverview } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/overview', requireAuth, getOverview);

export default router;
