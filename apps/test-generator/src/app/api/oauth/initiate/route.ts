import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { ERROR_CODES } from '@/types/api';

/**
 * POST /api/oauth/initiate
 * Initiates WooCommerce OAuth flow
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { storeUrl } = body;

    // Validate URL
    if (!storeUrl || typeof storeUrl !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ERROR_CODES.INVALID_URL,
            message: 'Store URL is required',
          },
        },
        { status: 400 }
      );
    }

    // Parse and validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(storeUrl);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        throw new Error('Invalid protocol');
      }
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ERROR_CODES.INVALID_URL,
            message: 'Invalid URL format. Please enter a valid store URL.',
          },
        },
        { status: 400 }
      );
    }

    // Normalize store URL (remove trailing slash)
    const normalizedUrl = parsedUrl.origin;

    // Get or create session
    const session = await getSession();

    // Store the URL in session for callback verification
    session.storeUrl = normalizedUrl;
    await session.save();

    // Build OAuth URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';
    const appName = 'WooCommerce Test Data Generator';

    // Encode store URL in user_id (Base64) so callback doesn't depend on session cookies
    // This fixes the issue where server-to-server POST from WooCommerce doesn't have cookies
    const encodedStoreUrl = Buffer.from(normalizedUrl).toString('base64url');

    console.log('[OAuth Initiate] Starting OAuth flow:', {
      storeUrl: normalizedUrl,
      appUrl,
      encodedUserId: encodedStoreUrl,
    });

    const oauthParams = new URLSearchParams({
      app_name: appName,
      scope: 'read_write',
      user_id: encodedStoreUrl,
      return_url: `${appUrl}/?connected=true`,
      callback_url: `${appUrl}/api/oauth/callback`,
    });

    const authUrl = `${normalizedUrl}/wc-auth/v1/authorize?${oauthParams.toString()}`;

    return NextResponse.json({
      success: true,
      authUrl,
    });
  } catch (error) {
    console.error('OAuth initiate error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to initiate OAuth flow',
        },
      },
      { status: 500 }
    );
  }
}
