// KAN-69: GET /api/games/[id]/events — SSE stream of player-filtered game state
// KAN-74: structured logging for connect, disconnect, and errors
import { NextRequest } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { log, generateRequestId } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const { id } = await params;
  const token = req.nextUrl.searchParams.get('token') ?? '';
  const gameId = id.toUpperCase();
  const playerId = (await gameStore.getPlayerIdByToken(gameId, token)) ?? undefined;

  if (!await gameStore.isValidToken(gameId, token)) {
    log.warn('sse.auth_failed', { requestId, gameId, statusCode: 401, detail: { reason: 'invalid_token' } });
    return new Response('Unauthorized', { status: 401 });
  }

  log.info('sse.connected', { requestId, gameId, playerId });

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      // Send initial state immediately
      const state = await gameStore.getPlayerState(gameId, token);
      if (state) {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch (err) {
          log.error('sse.initial_state_error', err, { requestId, gameId, playerId });
        }
      }

      // Subscribe to future updates
      unsubscribe = gameStore.subscribe(gameId, token, (updatedState) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(updatedState)}\n\n`));
        } catch {
          // Client disconnected during write — unsubscribe silently
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
        log.info('sse.disconnected', { requestId, gameId, playerId });
      });
    },
    cancel() {
      unsubscribe?.();
      log.info('sse.cancelled', { requestId, gameId, playerId });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
