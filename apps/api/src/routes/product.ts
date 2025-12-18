import { Router } from 'express';
import {
  bulkAction,
  getProduct,
  getProductWooData,
  listProducts,
  updateProduct,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, listProducts);
router.get('/:pid', requireAuth, getProduct);
router.get('/:pid/woo-data', requireAuth, getProductWooData);
router.patch('/:pid', requireAuth, updateProduct);
router.post('/bulk', requireAuth, bulkAction);

export default router;
