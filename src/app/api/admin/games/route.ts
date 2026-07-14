// KAN-74: GET /api/admin/games — active game list for agentic inspection
import { NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const games = gameStore.getActiveGamesSummary();
  return NextResponse.json({ activeGames: games.length, games });
}
