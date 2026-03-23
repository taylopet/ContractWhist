// KAN-69: GET /api/games/[id]/events — SSE stream of player-filtered game state
// Each connected client receives state updates in real time.
// Token passed as query param: ?token=xxx (EventSource doesn't support headers)
import { NextRequest } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export const runtime = 'nodejs';
// Disable Next.js response caching for SSE
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const gameId = id.toUpperCase();

  if (!gameStore.isValidToken(gameId, token)) {
    return new Response('Unauthorized', { status: 401 });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state immediately
      const state = gameStore.getPlayerState(gameId, token);
      if (state) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
      }

      // Subscribe to future updates
      unsubscribe = gameStore.subscribe(gameId, token, (updatedState) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updatedState)}\n\n`));
        } catch {
          // Client disconnected
          unsubscribe?.();
        }
      });

      // Send a keepalive comment every 25s to prevent proxy timeouts
      const keepaliveInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: keepalive\n\n`));
        } catch {
          clearInterval(keepaliveInterval);
        }
      }, 25000);

      // Cleanup on client disconnect
      req.signal.addEventListener('abort', () => {
        clearInterval(keepaliveInterval);
        unsubscribe?.();
      });
    },
    cancel() {
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable Nginx buffering
    },
  });
}
