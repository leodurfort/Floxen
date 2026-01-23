import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Domain configuration
const LANDING_DOMAIN = 'floxen.ai';
const WWW_DOMAIN = 'www.floxen.ai';
const APP_DOMAIN = 'app.floxen.ai';

// Routes that belong to the landing page only (root handled separately)
// Note: /pricing is NOT redirected - app has its own pricing page with Stripe integration
const LANDING_ROUTES = ['/'];

// Routes that belong to the app
const APP_ROUTE_PREFIXES = [
  '/dashboard',
  '/shops',
  '/settings',
  '/analytics',
  '/login',
  '/register',
  '/forgot-password',
];

// Static assets and API routes that should always pass through
const PASSTHROUGH_PREFIXES = [
  '/_next',
  '/api',
  '/static',
  '/favicon',
  '/og-image',
  '/robots.txt',
  '/sitemap.xml',
];

// Helper to create a clean redirect URL (without internal ports)
function createRedirectUrl(targetDomain: string, pathname: string, search: string): string {
  return `https://${targetDomain}${pathname}${search}`;
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hostname = request.headers.get('host')?.split(':')[0] || '';

  // Always allow static assets and API routes
  if (PASSTHROUGH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.next();
  }

  // Allow file extensions (images, etc.)
  if (pathname.includes('.')) {
    return NextResponse.next();
  }

  // Development and Railway preview domains - allow everything
  if (
    hostname.includes('localhost') ||
    hostname.includes('railway.app') ||
    hostname.includes('127.0.0.1')
  ) {
    return NextResponse.next();
  }

  // www.floxen.ai - redirect to floxen.ai (backup for Cloudflare redirect)
  if (hostname === WWW_DOMAIN) {
    return NextResponse.redirect(createRedirectUrl(LANDING_DOMAIN, pathname, search), 301);
  }

  // Landing domain (floxen.ai)
  if (hostname === LANDING_DOMAIN) {
    // Allow landing routes
    if (LANDING_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }

    // Redirect app routes to app domain
    if (APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return NextResponse.redirect(createRedirectUrl(APP_DOMAIN, pathname, search), 302);
    }

    // For any other route on landing domain, allow through
    return NextResponse.next();
  }

  // App domain (app.floxen.ai)
  if (hostname === APP_DOMAIN) {
    // Redirect root to dashboard
    if (pathname === '/') {
      return NextResponse.redirect(createRedirectUrl(APP_DOMAIN, '/dashboard', search), 302);
    }

    // Redirect landing-only routes to landing domain
    if (LANDING_ROUTES.includes(pathname) && pathname !== '/') {
      return NextResponse.redirect(createRedirectUrl(LANDING_DOMAIN, pathname, search), 302);
    }

    // Allow all app routes
    return NextResponse.next();
  }

  // Default: allow the request
  return NextResponse.next();
}

export const config = {
  // Match all routes except static files
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
