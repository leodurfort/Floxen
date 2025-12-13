import { Router } from 'express';
import { getOverview, getProductAnalytics, getTimeline } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/overview', requireAuth, getOverview);
router.get('/products', requireAuth, getProductAnalytics);
router.get('/timeline', requireAuth, getTimeline);

export default router;
