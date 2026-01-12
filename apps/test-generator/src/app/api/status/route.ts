import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { StatusResponse } from '@/types/api';
import { getAnyPendingCredentials } from '@/lib/pending-credentials';

/**
 * Check if session has valid credentials
 */
function hasValidCredentials(session: {
  storeUrl?: string;
  consumerKey?: string;
  consumerSecret?: string;
}): boolean {
  return !!(session.storeUrl && session.consumerKey && session.consumerSecret);
}

/**
 * GET /api/status
 * Returns current connection status and store info
 * Also serves as health check endpoint for Railway
 *
 * This endpoint also bridges OAuth credentials from server-to-server POST
 * to the browser session by checking the pending credentials store.
 */
export async function GET() {
  try {
    const session = await getSession();

    // Check if session already has valid credentials
    if (hasValidCredentials(session)) {
      console.log('[Status] Session is valid, returning connected status');
      const response: StatusResponse = {
        connected: true,
        storeUrl: session.storeUrl,
        storeInfo: session.storeInfo
          ? {
              currency: session.storeInfo.currency,
              dimensionUnit: session.storeInfo.dimensionUnit,
              weightUnit: session.storeInfo.weightUnit,
            }
          : undefined,
        connectedAt: session.connectedAt,
      };

      return NextResponse.json(response);
    }

    // Check for pending credentials from OAuth callback
    // This bridges the gap between server-to-server POST and browser redirect
    const pending = getAnyPendingCredentials();

    if (pending) {
      console.log('[Status] Found pending credentials, saving to session');

      // Save pending credentials to this browser's session
      session.storeUrl = pending.storeUrl;
      session.consumerKey = pending.consumerKey;
      session.consumerSecret = pending.consumerSecret;
      session.connectedAt = Date.now();
      if (pending.storeInfo) {
        session.storeInfo = pending.storeInfo;
      }
      await session.save();

      console.log('[Status] Pending credentials saved to browser session');

      const response: StatusResponse = {
        connected: true,
        storeUrl: pending.storeUrl,
        storeInfo: pending.storeInfo,
        connectedAt: session.connectedAt,
      };

      return NextResponse.json(response);
    }

    // No valid session and no pending credentials
    console.log('[Status] No valid session or pending credentials');
    const response: StatusResponse = { connected: false };
    return NextResponse.json(response);
  } catch (error) {
    console.error('[Status] Error:', error);
    // Return healthy status for health checks even on error
    return NextResponse.json({ connected: false });
  }
}
