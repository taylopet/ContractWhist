// KAN-69: POST /api/games/[id]/join — join an existing game by join code
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { playerName } = await req.json() as { playerName: string };

    if (!playerName?.trim()) {
      return NextResponse.json({ error: 'playerName required' }, { status: 400 });
    }

    const lobby = gameStore.getLobbyInfo(id.toUpperCase());
    if (!lobby) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 });
    }
    if (lobby.phase !== 'joining') {
      return NextResponse.json({ error: 'Game already started' }, { status: 409 });
    }

    const result = gameStore.joinGame(id, playerName.trim());
    if (!result) {
      return NextResponse.json({ error: 'Cannot join game' }, { status: 409 });
    }

    return NextResponse.json({ gameId: result.gameId, token: result.token });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
