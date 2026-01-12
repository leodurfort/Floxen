import { NextResponse } from 'next/server';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/session';
import { WooClient } from '@/lib/woo-client';

/**
 * Decode store URL from Base64url encoded user_id
 */
function decodeStoreUrl(encodedUserId: string | undefined): string | null {
  if (!encodedUserId) return null;

  try {
    // Decode Base64url to get the original store URL
    const decoded = Buffer.from(encodedUserId, 'base64url').toString('utf-8');
    // Validate it looks like a URL
    new URL(decoded);
    return decoded;
  } catch {
    console.warn('[OAuth Callback] Failed to decode store URL from user_id:', encodedUserId);
    return null;
  }
}

/**
 * Extract credentials from request (supports both GET query params and POST body)
 */
async function extractCredentials(request: Request): Promise<{
  consumer_key?: string;
  consumer_secret?: string;
  user_id?: string;
} | null> {
  const url = new URL(request.url);

  // Try GET query params first
  const consumer_key = url.searchParams.get('consumer_key');
  const consumer_secret = url.searchParams.get('consumer_secret');
  const user_id = url.searchParams.get('user_id');

  if (consumer_key && consumer_secret) {
    console.log('[OAuth Callback] Extracted credentials from GET params');
    return { consumer_key, consumer_secret, user_id: user_id || undefined };
  }

  // Try POST body for some WooCommerce versions
  if (request.method === 'POST') {
    try {
      // Clone request to read body multiple times if needed
      const clonedRequest = request.clone();
      const body = await clonedRequest.json();
      if (body.consumer_key && body.consumer_secret) {
        console.log('[OAuth Callback] Extracted credentials from POST JSON body');
        return {
          consumer_key: body.consumer_key,
          consumer_secret: body.consumer_secret,
          user_id: body.user_id,
        };
      }
    } catch {
      // Not JSON body, try form data
      try {
        const formData = await request.formData();
        const key = formData.get('consumer_key');
        const secret = formData.get('consumer_secret');
        if (key && secret) {
          console.log('[OAuth Callback] Extracted credentials from POST form data');
          return {
            consumer_key: String(key),
            consumer_secret: String(secret),
            user_id: formData.get('user_id')?.toString(),
          };
        }
      } catch {
        // No form data either
        console.warn('[OAuth Callback] Failed to extract credentials from POST body');
      }
    }
  }

  return null;
}

/**
 * Handle OAuth callback and process credentials
 * Returns an object with success status and optional error for flexible response handling
 */
async function processOAuthCallback(request: Request): Promise<{
  success: boolean;
  error?: string;
  storeUrl?: string;
}> {
  console.log('[OAuth Callback] Processing callback, method:', request.method);

  const credentials = await extractCredentials(request);

  if (!credentials || !credentials.consumer_key || !credentials.consumer_secret) {
    console.error('[OAuth Callback] Missing credentials in request');
    return { success: false, error: 'missing_credentials' };
  }

  // Security: Prevent array injection
  if (
    Array.isArray(credentials.consumer_key) ||
    Array.isArray(credentials.consumer_secret)
  ) {
    console.error('[OAuth Callback] Array injection attempt detected');
    return { success: false, error: 'invalid_credentials' };
  }

  // Get session to retrieve store URL
  const session = await getSession();

  // Try to get store URL from session first, then from encoded user_id
  let storeUrl: string | undefined = session.storeUrl;

  if (!storeUrl && credentials.user_id) {
    // Decode store URL from user_id (Base64url encoded)
    const decodedUrl = decodeStoreUrl(credentials.user_id);
    if (decodedUrl) {
      storeUrl = decodedUrl;
      console.log('[OAuth Callback] Decoded store URL from user_id:', storeUrl);
    }
  }

  if (!storeUrl) {
    console.error('[OAuth Callback] No store URL in session or user_id');
    return { success: false, error: 'session_expired' };
  }

  console.log('[OAuth Callback] Using store URL:', storeUrl);

  // Test connection with the provided credentials
  const wooClient = new WooClient(
    storeUrl,
    credentials.consumer_key,
    credentials.consumer_secret
  );

  const isValid = await wooClient.testConnection();
  if (!isValid) {
    console.error('[OAuth Callback] Connection test failed for store:', storeUrl);
    return { success: false, error: 'connection_failed' };
  }

  console.log('[OAuth Callback] Connection test passed');

  // Fetch store settings
  let storeInfo;
  try {
    storeInfo = await wooClient.getStoreSettings();
  } catch (error) {
    console.error('[OAuth Callback] Failed to fetch store settings:', error);
    // Continue without store info - not critical
  }

  // Save credentials to session
  session.storeUrl = storeUrl; // Ensure store URL is saved
  session.consumerKey = credentials.consumer_key;
  session.consumerSecret = credentials.consumer_secret;
  session.connectedAt = Date.now();
  if (storeInfo) {
    session.storeInfo = storeInfo;
  }
  await session.save();

  console.log('[OAuth Callback] Credentials saved to session successfully');

  return { success: true, storeUrl };
}

/**
 * GET /api/oauth/callback
 * Handles OAuth callback from WooCommerce (browser redirect method)
 */
export async function GET(request: Request) {
  console.log('[OAuth Callback] GET request received');

  try {
    const result = await processOAuthCallback(request);

    if (result.success) {
      return redirect('/?connected=true');
    } else {
      return redirect(`/?error=${result.error}`);
    }
  } catch (error) {
    console.error('[OAuth Callback] GET handler error:', error);
    return redirect('/?error=callback_failed');
  }
}

/**
 * POST /api/oauth/callback
 * Handles OAuth callback from WooCommerce (server-to-server method)
 *
 * IMPORTANT: WooCommerce sends a POST request server-to-server with credentials.
 * This request does NOT have cookies, so we must decode store URL from user_id.
 * Must return JSON response (not redirect) for WooCommerce to consider it successful.
 */
export async function POST(request: Request) {
  console.log('[OAuth Callback] POST request received (server-to-server from WooCommerce)');

  try {
    const result = await processOAuthCallback(request);

    if (result.success) {
      console.log('[OAuth Callback] POST success - returning 200 OK to WooCommerce');
      // Return JSON success for WooCommerce server-to-server callback
      return NextResponse.json(
        { success: true, message: 'Credentials received successfully' },
        { status: 200 }
      );
    } else {
      console.error('[OAuth Callback] POST failed:', result.error);
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('[OAuth Callback] POST handler error:', error);
    return NextResponse.json(
      { success: false, error: 'callback_failed' },
      { status: 500 }
    );
  }
}
