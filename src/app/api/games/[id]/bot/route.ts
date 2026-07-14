// KAN-77: POST /api/games/[id]/bot — host adds a bot player to the lobby
import { NextRequest, NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const gameId = id.toUpperCase();
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'missing token' }, { status: 400 });
  const ok = await gameStore.addBot(gameId, token);
  if (!ok) return NextResponse.json({ error: 'cannot add bot' }, { status: 403 });
  return NextResponse.json({ ok: true });
}
