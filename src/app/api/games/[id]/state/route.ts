// KAN-69: GET /api/games/[id]/state — fetch current player-filtered state (for reconnect)
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.headers.get('x-player-token') ?? (req.nextUrl.searchParams.get('token') ?? '');

  const state = gameStore.getPlayerState(id.toUpperCase(), token);
  if (!state) {
    return NextResponse.json({ error: 'Game not found or invalid token' }, { status: 404 });
  }

  return NextResponse.json(state);
}
