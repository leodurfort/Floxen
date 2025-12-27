import { Router } from 'express';
import analyticsRouter from './analytics';
import authRouter from './auth';
import feedRouter from './feed';
import productRouter from './product';
import shopRouter from './shop';
import syncRouter from './sync';
import userRouter from './user';
const router = Router();

router.use('/auth', authRouter);
router.use('/users', userRouter);
router.use('/feed', feedRouter); // Public feed endpoints (no auth)
router.use('/shops', shopRouter);
router.use('/shops/:id/products', productRouter);
router.use('/shops/:id/sync', syncRouter);
router.use('/shops/:id/analytics', analyticsRouter);

export default router;
