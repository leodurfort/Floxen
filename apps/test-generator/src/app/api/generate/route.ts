import { NextResponse } from 'next/server';
import { getSession, isSessionValid } from '@/lib/session';
import { createWooClientFromSession } from '@/lib/woo-client';
import { ProductGenerator } from '@/lib/product-generator';
import { ERROR_CODES } from '@/types/api';

const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds

/**
 * GET /api/generate
 * Starts product generation and streams progress via SSE
 */
export async function GET() {
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

    const wooClient = createWooClientFromSession(session);
    const generator = new ProductGenerator(wooClient);
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
          for await (const event of generator.generate()) {
            const data = `data: ${JSON.stringify(event)}\n\n`;
            controller.enqueue(encoder.encode(data));

            // If error or complete, stop
            if (event.type === 'error' || event.type === 'complete') {
              break;
            }
          }
        } catch (error) {
          console.error('Generation error:', error);
          const errorEvent = `data: ${JSON.stringify({
            type: 'error',
            error: {
              code: ERROR_CODES.GENERATION_FAILED,
              message: error instanceof Error ? error.message : 'Generation failed',
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
    console.error('Generate endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: ERROR_CODES.INTERNAL_ERROR,
          message: 'Failed to start generation',
        },
      },
      { status: 500 }
    );
  }
}
