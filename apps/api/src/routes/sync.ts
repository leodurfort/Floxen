import { Router } from 'express';
import {
  downloadFeed,
  getSyncHistory,
  getSyncStatus,
  previewFeed,
  pushFeed,
  triggerSync,
  latestFeed,
} from '../controllers/syncController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', requireAuth, triggerSync);
router.get('/status', requireAuth, getSyncStatus);
router.get('/history', requireAuth, getSyncHistory);
router.post('/push', requireAuth, pushFeed);
router.get('/feed/preview', requireAuth, previewFeed);
router.get('/feed/download', requireAuth, downloadFeed);
router.get('/feed/latest', requireAuth, latestFeed);

export default router;
