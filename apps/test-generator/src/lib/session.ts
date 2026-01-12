import { getIronSession, SessionOptions } from 'iron-session';
import { cookies } from 'next/headers';
import { SessionData } from '@/types/session';

/**
 * Session configuration
 */
export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET || 'this-is-a-development-secret-that-should-be-changed',
  cookieName: 'woo-test-gen-session',
  ttl: 3600, // 1 hour
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
  },
};

/**
 * Get the current session
 */
export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

/**
 * Clear the current session
 */
export async function clearSession() {
  const session = await getSession();
  session.destroy();
}

/**
 * Check if session has valid credentials
 */
export function isSessionValid(session: SessionData | null): session is SessionData {
  return !!(
    session &&
    session.storeUrl &&
    session.consumerKey &&
    session.consumerSecret
  );
}
