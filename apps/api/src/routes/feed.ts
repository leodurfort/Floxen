/**
 * Feed Routes
 *
 * Public endpoints for accessing OpenAI product feeds.
 * No authentication required - these are meant to be fetched by OpenAI.
 */

import { Router } from 'express';
import { getFeedJson, getFeedHtml } from '../controllers/feedController';

const router = Router();

// GET /api/v1/feed/:shopId - Raw JSON feed (for OpenAI)
router.get('/:shopId', getFeedJson);

// GET /api/v1/feed/:shopId/view - HTML table view (for debugging)
router.get('/:shopId/view', getFeedHtml);

export default router;
