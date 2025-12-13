import { Router } from 'express';
import { handleWooWebhook } from '../controllers/webhookController';

const router = Router();

router.post('/woocommerce/:shopId', handleWooWebhook);

export default router;
