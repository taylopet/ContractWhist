// KAN-69: POST /api/games/[id]/action — dispatch a game action
// KAN-74: structured logging for all error and success conditions
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { GameAction } from '@/lib/gameReducer';
import { log, generateRequestId, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const requestId = generateRequestId();
  const elapsed = startTimer();

  try {
    const { id } = await params;
    const gameId = id.toUpperCase();
    const { token, action } = await req.json() as { token: string; action: GameAction };

    log.info('http.request', { requestId, gameId, action: action?.type, detail: { method: 'POST', path: `/api/games/${gameId}/action` } });

    if (!token || !action?.type) {
      log.warn('http.bad_request', { requestId, gameId, statusCode: 400, detail: { reason: 'missing token or action', hasToken: !!token, hasAction: !!action?.type } });
      return NextResponse.json({ error: 'token and action required' }, { status: 400 });
    }

    const ok = await gameStore.dispatch(gameId, token, action);
    if (!ok) {
      log.warn('action.rejected', { requestId, gameId, action: action.type, statusCode: 403, detail: { reason: 'invalid_token_or_game_not_found' } });
      return NextResponse.json({ error: 'Action rejected' }, { status: 403 });
    }

    log.info('http.response', { requestId, gameId, action: action.type, statusCode: 200, durationMs: elapsed() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('http.error', err, { requestId, statusCode: 400, durationMs: elapsed() });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
