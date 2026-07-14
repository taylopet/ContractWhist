// KAN-74: GET /api/health — live server health check for monitoring and agentic inspection
import { NextResponse } from 'next/server';
import { gameStore } from '@/lib/gameStore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const mem = process.memoryUsage();
  const games = gameStore.getActiveGamesSummary();

  return NextResponse.json({
    status: 'ok',
    ts: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    nodeVersion: process.version,
    activeGames: games.length,
    memory: {
      heapUsedMB: Math.round(mem.heapUsed / 1_048_576),
      heapTotalMB: Math.round(mem.heapTotal / 1_048_576),
      rssMB: Math.round(mem.rss / 1_048_576),
    },
  });
}
