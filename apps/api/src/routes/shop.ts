import { Router } from 'express';
import {
  configureOpenAI,
  createShop,
  disconnectShop,
  getShop,
  listShops,
  oauthCallback,
  updateShop,
  verifyConnection,
} from '../controllers/shopController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, listShops);
router.post('/', requireAuth, createShop);
router.get('/:id', requireAuth, getShop);
router.patch('/:id', requireAuth, updateShop);
router.delete('/:id', requireAuth, disconnectShop);
router.post('/:id/oauth/callback', oauthCallback);
router.post('/:id/verify', requireAuth, verifyConnection);
router.put('/:id/openai-config', requireAuth, configureOpenAI);

export default router;
