import { Router } from 'express';
import {
  getSyncHistory,
  getSyncStatus,
  previewFeed,
  pushFeed,
  triggerSync,
} from '../controllers/syncController';
import { requireAuth } from '../middleware/auth';
import { syncLimiter } from '../middleware/rateLimit';

const router = Router({ mergeParams: true });

// POST routes are rate limited: 5 req/min per shop
router.post('/', requireAuth, syncLimiter, triggerSync);
router.get('/status', requireAuth, getSyncStatus);
router.get('/history', requireAuth, getSyncHistory);
router.post('/push', requireAuth, syncLimiter, pushFeed);
router.get('/feed/preview', requireAuth, previewFeed);

export default router;
