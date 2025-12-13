import { Router } from 'express';
import {
  bulkAction,
  getProduct,
  listProducts,
  previewFeed,
  triggerEnrichment,
  updateProduct,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, listProducts);
router.get('/:pid', requireAuth, getProduct);
router.patch('/:pid', requireAuth, updateProduct);
router.post('/:pid/enrich', requireAuth, triggerEnrichment);
router.get('/:pid/preview-feed', requireAuth, previewFeed);
router.post('/bulk', requireAuth, bulkAction);

export default router;
