import { Router } from 'express';
import {
  bulkAction,
  getProduct,
  getProductEnrichmentData,
  getResolvedValues,
  listProducts,
  previewFeed,
  triggerEnrichment,
  updateManualField,
  updateOpenAIField,
  updateProduct,
  updateSelectedSource,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, listProducts);
router.get('/:pid', requireAuth, getProduct);
router.patch('/:pid', requireAuth, updateProduct);
router.post('/:pid/enrich', requireAuth, triggerEnrichment);
router.get('/:pid/preview-feed', requireAuth, previewFeed);
router.post('/bulk', requireAuth, bulkAction);

// New routes for 3-column enrichment flow
router.get('/:pid/enrichment-data', requireAuth, getProductEnrichmentData);
router.patch('/:pid/manual-field', requireAuth, updateManualField);
router.patch('/:pid/openai-field', requireAuth, updateOpenAIField);
router.patch('/:pid/selected-source', requireAuth, updateSelectedSource);
router.get('/:pid/resolved-values', requireAuth, getResolvedValues);

export default router;
