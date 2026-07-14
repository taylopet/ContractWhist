// KAN-69: POST /api/games — create a new game, return gameId + joinCode + host token
// KAN-74: structured logging for all error and success conditions
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { RoundConfig } from '@/types/game';
import { log, generateRequestId, startTimer } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  const elapsed = startTimer();
  log.info('http.request', { requestId, detail: { method: 'POST', path: '/api/games' } });

  try {
    const body = await req.json();
    const { hostName, playerCount, roundSchedule } = body as {
      hostName: string;
      playerCount: number;
      roundSchedule?: RoundConfig[];
    };

    if (!hostName?.trim()) {
      log.warn('http.bad_request', { requestId, statusCode: 400, detail: { reason: 'hostName missing' } });
      return NextResponse.json({ error: 'hostName required' }, { status: 400 });
    }
    if (!playerCount || playerCount < 2 || playerCount > 4) {
      log.warn('http.bad_request', { requestId, statusCode: 400, detail: { reason: 'invalid playerCount', playerCount } });
      return NextResponse.json({ error: 'playerCount must be 2–4' }, { status: 400 });
    }

    const { gameId, joinCode, token } = await gameStore.createGame(
      hostName.trim(),
      playerCount,
      roundSchedule
    );

    log.info('http.response', { requestId, gameId, statusCode: 200, durationMs: elapsed() });
    return NextResponse.json({ gameId, joinCode, token });
  } catch (err) {
    log.error('http.error', err, { requestId, statusCode: 400, durationMs: elapsed() });
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
