import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { createCheckout, createPortal, getBilling, getPrices } from '../controllers/billingController';

const router = Router();

// All billing routes require authentication
router.get('/', requireAuth, getBilling);
router.get('/prices', requireAuth, getPrices);
router.post('/checkout', requireAuth, createCheckout);
router.post('/portal', requireAuth, createPortal);

export default router;
