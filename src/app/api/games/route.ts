// KAN-69: POST /api/games — create a new game, return gameId + joinCode + host token
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { RoundConfig } from '@/types/game';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { hostName, playerCount, roundSchedule } = body as {
      hostName: string;
      playerCount: number;
      roundSchedule?: RoundConfig[];
    };

    if (!hostName?.trim()) {
      return NextResponse.json({ error: 'hostName required' }, { status: 400 });
    }
    if (!playerCount || playerCount < 2 || playerCount > 4) {
      return NextResponse.json({ error: 'playerCount must be 2–4' }, { status: 400 });
    }

    const { gameId, joinCode, token } = gameStore.createGame(
      hostName.trim(),
      playerCount,
      roundSchedule
    );

    return NextResponse.json({ gameId, joinCode, token });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
