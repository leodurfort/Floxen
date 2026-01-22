import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Domain configuration
const LANDING_DOMAIN = 'www.floxen.ai';
const APP_DOMAIN = 'app.floxen.ai';
const ROOT_DOMAIN = 'floxen.ai';

// Routes that belong to the landing page
const LANDING_ROUTES = ['/', '/pricing'];

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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hostname = request.headers.get('host') || '';

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

  // Root domain (floxen.ai without www) - redirect to www
  if (hostname === ROOT_DOMAIN || hostname === `${ROOT_DOMAIN}:443`) {
    const url = request.nextUrl.clone();
    url.hostname = LANDING_DOMAIN;
    url.host = LANDING_DOMAIN;
    return NextResponse.redirect(url, 301);
  }

  // Landing domain (www.floxen.ai)
  if (hostname === LANDING_DOMAIN || hostname.startsWith(LANDING_DOMAIN)) {
    // Allow landing routes
    if (LANDING_ROUTES.includes(pathname)) {
      return NextResponse.next();
    }

    // Redirect app routes to app domain
    if (APP_ROUTE_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      const url = request.nextUrl.clone();
      url.hostname = APP_DOMAIN;
      url.host = APP_DOMAIN;
      return NextResponse.redirect(url, 302);
    }

    // For any other route on landing domain, show 404 or redirect to home
    return NextResponse.next();
  }

  // App domain (app.floxen.ai)
  if (hostname === APP_DOMAIN || hostname.startsWith(APP_DOMAIN)) {
    // Redirect root to dashboard
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url, 302);
    }

    // Redirect landing-only routes to landing domain
    if (LANDING_ROUTES.includes(pathname) && pathname !== '/') {
      const url = request.nextUrl.clone();
      url.hostname = LANDING_DOMAIN;
      url.host = LANDING_DOMAIN;
      return NextResponse.redirect(url, 302);
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
