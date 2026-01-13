import { Router } from 'express';
import {
  bulkUpdate,
  getProduct,
  getProductWooData,
  listProducts,
  updateProduct,
  getProductFieldOverrides,
  updateProductFieldOverrides,
  deleteProductFieldOverride,
  getColumnValues,
  getItemGroupCount,
} from '../controllers/productController';
import { requireAuth } from '../middleware/auth';

const router = Router({ mergeParams: true });

router.get('/', requireAuth, listProducts);
router.get('/column-values', requireAuth, getColumnValues);
router.get('/item-group-count/:itemGroupId', requireAuth, getItemGroupCount);
router.get('/:pid', requireAuth, getProduct);
router.get('/:pid/woo-data', requireAuth, getProductWooData);
router.patch('/:pid', requireAuth, updateProduct);
router.post('/bulk-update', requireAuth, bulkUpdate);

// Product field override routes
router.get('/:pid/field-overrides', requireAuth, getProductFieldOverrides);
router.put('/:pid/field-overrides', requireAuth, updateProductFieldOverrides);
router.delete('/:pid/field-overrides/:attribute', requireAuth, deleteProductFieldOverride);

export default router;
