import { NextResponse } from 'next/server';
import { clearSession } from '@/lib/session';

/**
 * POST /api/oauth/disconnect
 * Clears the session and disconnects from the store
 */
export async function POST() {
  try {
    await clearSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Disconnect error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to disconnect' },
      { status: 500 }
    );
  }
}
