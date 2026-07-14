// KAN-69: GET /api/games/[id]/state — fetch current player-filtered state (for reconnect)
// KAN-74: structured logging
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { log, generateRequestId, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const elapsed = startTimer();

  const { id } = await params;
  const gameId = id.toUpperCase();
  const token = req.headers.get('x-player-token') ?? (req.nextUrl.searchParams.get('token') ?? '');

  log.info('http.request', { requestId, gameId, detail: { method: 'GET', path: `/api/games/${gameId}/state`, hasToken: !!token } });

  const state = await gameStore.getPlayerState(gameId, token);
  if (!state) {
    log.warn('http.not_found', { requestId, gameId, statusCode: 404, detail: { reason: 'game_not_found_or_invalid_token' } });
    return NextResponse.json({ error: 'Game not found or invalid token' }, { status: 404 });
  }

  log.info('http.response', { requestId, gameId, statusCode: 200, durationMs: elapsed() });
  return NextResponse.json(state);
}
