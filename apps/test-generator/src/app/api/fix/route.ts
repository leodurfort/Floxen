import { NextRequest, NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createWooClientFromSession } from '@/lib/woo-client';
import { FixService } from '@/lib/fix-service';
import { ERROR_CODES } from '@/types/api';
import { MissingItems } from '@/types/validation';

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

/**
 * POST /api/fix
 * Accepts missing items and generates only those items
 * Streams progress via SSE
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!isSessionValid(session)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ERROR_CODES.UNAUTHORIZED,
            message: 'Not connected to a store',
          },
        },
        { status: 401 }
      );
    }

    // Parse missing items from request body
    let missingItems: MissingItems;
    try {
      missingItems = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: ERROR_CODES.FIX_FAILED,
            message: 'Invalid request body',
          },
        },
        { status: 400 }
      );
    }

    const wooClient = createWooClientFromSession(session);
    const fixService = new FixService(wooClient, missingItems);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        // Set up heartbeat to keep connection alive
        const heartbeatInterval = setInterval(() => {
          try {
            const heartbeat = `data: ${JSON.stringify({
              type: 'heartbeat',
              timestamp: Date.now(),
            })}\n\n`;
            controller.enqueue(encoder.encode(heartbeat));
          } catch {
            // Controller might be closed
            clearInterval(heartbeatInterval);
          }
        }, HEARTBEAT_INTERVAL_MS);

        try {
          for await (const event of fixService.fix()) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // If error or complete, stop
            if (event.type === 'error' || event.type === 'complete') {
              break;
            }
          }
        } catch (error) {
          console.error('Fix error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: {
              code: ERROR_CODES.FIX_FAILED,
              message: error instanceof Error ? error.message : 'Fix failed',
            },
          })}\n\n`;
          controller.enqueue(encoder.encode(errorEvent));
        } finally {
          clearInterval(heartbeatInterval);
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Fix endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to start fix',
        },
      },
      { status: 500 }
    );
  }
}
