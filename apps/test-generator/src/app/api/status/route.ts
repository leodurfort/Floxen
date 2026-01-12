import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { StatusResponse } from '@/types/api';

/**
 * GET /api/status
 * Returns current connection status and store info
 * Also serves as health check endpoint for Railway
 */
export async function GET() {
  try {
    const session = await getSession();

    if (!isSessionValid(session)) {
      const response: StatusResponse = { connected: false };
      return NextResponse.json(response);
    }

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
  } catch (error) {
    console.error('Status check error:', error);
    // Return healthy status for health checks even on error
    return NextResponse.json({ connected: false });
  }
}
