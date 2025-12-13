import { Resend } from 'resend';
import { env } from '../config/env';

export function getMailer() {
  if (!env.resendApiKey) return null;
  return new Resend(env.resendApiKey);
}

export async function sendEmail(params: { to: string; subject: string; html: string }) {
  const client = getMailer();
  if (!client) throw new Error('Resend not configured');
  const from = env.resendFrom || 'no-reply@productsynch.dev';
  return client.emails.send({ from, ...params });
}
