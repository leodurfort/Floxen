import { Request, Response } from 'express';

export function handleWooWebhook(req: Request, res: Response) {
  const { shopId } = req.params;
  // In production, verify signature and enqueue job.
  return res.status(202).json({ shopId, receivedAt: new Date().toISOString(), event: req.body });
}
