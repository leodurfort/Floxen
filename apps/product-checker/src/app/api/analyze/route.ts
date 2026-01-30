import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { analyzeUrl, AnalysisError } from '@/lib/analyzer';
import { checkRateLimit, getRateLimitHeaders } from '@/lib/rateLimiter';

const requestSchema = z.object({
  url: z
    .string()
    .min(1, 'URL is required')
    .url('Must be a valid URL')
    .refine(
      (url) => url.startsWith('http://') || url.startsWith('https://'),
      'URL must use HTTP or HTTPS protocol'
    ),
});

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    return realIp;
  }
  return '0.0.0.0';
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  // Rate limiting
  if (!checkRateLimit(ip)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please wait a moment and try again.',
        },
      },
      { status: 429, headers: getRateLimitHeaders(ip) }
    );
  }

  // Parse and validate request body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INVALID_URL',
          message: 'Invalid request body. Please provide a JSON object with a "url" field.',
        },
      },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message || 'Invalid URL';
    return NextResponse.json(
      {
        success: false,
        error: { code: 'INVALID_URL', message },
      },
      { status: 400 }
    );
  }

  // Run analysis
  try {
    const result = await analyzeUrl(parsed.data.url);
    return NextResponse.json(
      { success: true, data: result },
      { status: 200, headers: getRateLimitHeaders(ip) }
    );
  } catch (err) {
    if (err instanceof AnalysisError) {
      const status =
        err.code === 'TIMEOUT' ? 504 :
        err.code === 'FETCH_FAILED' ? 502 :
        err.code === 'SSRF_BLOCKED' ? 403 :
        err.statusCode;

      return NextResponse.json(
        {
          success: false,
          error: { code: err.code, message: err.message },
        },
        { status }
      );
    }

    console.error('Unexpected analysis error:', err);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Something went wrong. Please try again.',
        },
      },
      { status: 500 }
    );
  }
}
