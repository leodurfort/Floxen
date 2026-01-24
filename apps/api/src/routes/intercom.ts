import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAuth, JwtUser } from '../middleware/auth';
import { env } from '../config/env';
import { prisma } from '../lib/prisma';

const router = Router();

router.get('/token', requireAuth, async (req: Request, res: Response) => {
  const userId = (req as Request & { user?: JwtUser }).user!.sub;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!env.intercom.identitySecret) {
    return res.status(500).json({ error: 'Intercom identity secret not configured' });
  }

  const token = jwt.sign(
    {
      user_id: user.id,
      email: user.email,
    },
    env.intercom.identitySecret,
    { expiresIn: '1h' }
  );

  res.json({ token });
});

export default router;
