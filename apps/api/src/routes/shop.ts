import { Router } from 'express';
import {
  createShop,
  disconnectShop,
  getShop,
  getOAuthUrl,
  listShops,
  oauthCallback,
  updateShop,
  getFieldMappings,
  updateFieldMappings,
  discoverWooFields,
  getWooFields,
  activateFeed,
  getProductStats,
  discoverProducts,
  getDiscoveredProductsList,
  getFilteredProductIdsList,
  updateProductSelection,
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
router.get('/:id/oauth-url', requireAuth, getOAuthUrl);
router.get('/:id/field-mappings', requireAuth, getFieldMappings);
router.put('/:id/field-mappings', requireAuth, updateFieldMappings);
router.post('/:id/discover-fields', requireAuth, discoverWooFields);
router.get('/:id/woo-fields', requireAuth, getWooFields);
router.post('/:id/activate-feed', requireAuth, activateFeed);
router.get('/:id/product-stats', requireAuth, getProductStats);

// Product discovery and selection for billing
router.post('/:id/discover', requireAuth, discoverProducts);
router.get('/:id/products/discovered', requireAuth, getDiscoveredProductsList);
router.get('/:id/products/discovered/ids', requireAuth, getFilteredProductIdsList);
router.put('/:id/products/selection', requireAuth, updateProductSelection);

export default router;
