import { Router } from 'express';
import {
  downloadFeed,
  getSyncHistory,
  getSyncStatus,
  previewFeed,
  pushFeed,
  triggerSync,
} from '../controllers/syncController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.post('/', requireAuth, triggerSync);
router.get('/status', requireAuth, getSyncStatus);
router.get('/history', requireAuth, getSyncHistory);
router.post('/push', requireAuth, pushFeed);
router.get('/feed/preview', requireAuth, previewFeed);
router.get('/feed/download', requireAuth, downloadFeed);

export default router;
