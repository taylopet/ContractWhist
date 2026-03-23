// KAN-69: POST /api/games/[id]/action — dispatch a game action
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';
import { GameAction } from '@/lib/gameReducer';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { token, action } = await req.json() as { token: string; action: GameAction };

    if (!token || !action?.type) {
      return NextResponse.json({ error: 'token and action required' }, { status: 400 });
    }

    const ok = gameStore.dispatch(id.toUpperCase(), token, action);
    if (!ok) {
      return NextResponse.json({ error: 'Action rejected' }, { status: 403 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
