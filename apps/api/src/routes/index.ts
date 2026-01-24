import { Router } from 'express';
import analyticsRouter from './analytics';
import analyticsWaitlistRouter from './analyticsWaitlist';
import authRouter from './auth';
import billingRouter from './billing';
import feedRouter from './feed';
import intercomRouter from './intercom';
import productRouter from './product';
import shopRouter from './shop';
import syncRouter from './sync';
import userRouter from './user';
const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/billing', billingRouter);
router.use('/feed', feedRouter); // Public feed endpoints (no auth)
router.use('/intercom', intercomRouter);
router.use('/shops', shopRouter);
router.use('/shops/:id/products', productRouter);
router.use('/shops/:id/sync', syncRouter);
router.use('/shops/:id/analytics', analyticsRouter);
router.use('/analytics', analyticsWaitlistRouter);

export default router;
