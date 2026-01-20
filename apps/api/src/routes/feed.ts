/**
 * Feed Routes
 *
 * Public endpoints for accessing OpenAI product feeds.
 * No authentication required - these are meant to be fetched by OpenAI.
 */

import { Router } from 'express';
import { getFeedJson, getFeedHtml, listSnapshots, listShopFeeds } from '../controllers/feedController';
import { feedLimiter } from '../middleware/rateLimit';

const router = Router();

// Rate limit public feed endpoints: 100 req/min per IP
router.use(feedLimiter);

// GET /api/v1/feed - List all shops with feed links (admin debug)
router.get('/', listShopFeeds);

// GET /api/v1/feed/:shopId - Raw JSON feed (for OpenAI)
router.get('/:shopId', getFeedJson);

// GET /api/v1/feed/:shopId/snapshots - List available snapshots (past 7 days)
router.get('/:shopId/snapshots', listSnapshots);

// GET /api/v1/feed/:shopId/view - HTML table view (for debugging)
router.get('/:shopId/view', getFeedHtml);

export default router;
