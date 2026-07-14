// KAN-69: POST /api/games/[id]/join — join an existing game by join code
// KAN-74: structured logging for all error and success conditions
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
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
    log.info('http.request', { requestId, gameId, detail: { method: 'POST', path: `/api/games/${gameId}/join` } });

    const { playerName } = await req.json() as { playerName: string };

    if (!playerName?.trim()) {
      log.warn('http.bad_request', { requestId, gameId, statusCode: 400, detail: { reason: 'playerName missing' } });
      return NextResponse.json({ error: 'playerName required' }, { status: 400 });
    }

    const lobby = await gameStore.getLobbyInfo(gameId);
    if (!lobby) {
      log.warn('game.join_rejected', { requestId, gameId, statusCode: 404, detail: { reason: 'game_not_found', playerName: playerName.trim() } });
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (lobby.phase !== 'joining') {
      log.warn('game.join_rejected', { requestId, gameId, statusCode: 409, detail: { reason: 'wrong_phase', phase: lobby.phase, playerName: playerName.trim() } });
      return NextResponse.json({ error: 'Game already started' }, { status: 409 });
    }

    const result = await gameStore.joinGame(id, playerName.trim());
    if (!result) {
      log.warn('game.join_rejected', { requestId, gameId, statusCode: 409, detail: { reason: 'game_full', playerCount: lobby.playerCount, maxPlayers: lobby.maxPlayers, playerName: playerName.trim() } });
      return NextResponse.json({ error: 'Cannot join game' }, { status: 409 });
    }

    log.info('http.response', { requestId, gameId, statusCode: 200, durationMs: elapsed() });
    return NextResponse.json({ gameId: result.gameId, token: result.token });
  } catch (err) {
    log.error('http.error', err, { requestId, statusCode: 400, durationMs: elapsed() });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
