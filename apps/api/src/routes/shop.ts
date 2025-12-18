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
  getFieldMappings,
  updateFieldMappings,
  discoverWooFields,
  getWooFields,
  testWooSettings,
} from '../controllers/shopController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireAuth, listShops);
router.post('/', requireAuth, createShop);
router.get('/:id', requireAuth, getShop);
router.patch('/:id', requireAuth, updateShop);
router.delete('/:id', requireAuth, disconnectShop);
router.get('/:id/oauth/callback', oauthCallback);
router.post('/:id/oauth/callback', oauthCallback);
router.post('/:id/verify', requireAuth, verifyConnection);
router.put('/:id/openai-config', requireAuth, configureOpenAI);
router.get('/:id/field-mappings', requireAuth, getFieldMappings);
router.put('/:id/field-mappings', requireAuth, updateFieldMappings);
router.post('/:id/discover-fields', requireAuth, discoverWooFields);
router.get('/:id/woo-fields', requireAuth, getWooFields);
router.get('/:id/test-woo-settings', requireAuth, testWooSettings);

export default router;
