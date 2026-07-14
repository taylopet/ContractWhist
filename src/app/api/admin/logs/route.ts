// KAN-74: GET /api/admin/logs — recent structured log entries for agentic troubleshooting
// Query params:
//   ?level=error          filter by level (info | warn | error)
//   ?event=action.        filter by event prefix
//   ?gameId=WOLF42        filter by gameId
//   ?limit=50             number of entries to return (default 100, max 500)
import { NextRequest, NextResponse } from 'next/server';
import { getLogBuffer } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const levelFilter = sp.get('level');
  const eventPrefix = sp.get('event');
  const gameIdFilter = sp.get('gameId');
  const limit = Math.min(parseInt(sp.get('limit') ?? '100', 10), 500);

  let entries = [...getLogBuffer()].reverse(); // most-recent first

  if (levelFilter) entries = entries.filter(e => e.level === levelFilter);
  if (eventPrefix) entries = entries.filter(e => e.event.startsWith(eventPrefix));
  if (gameIdFilter) entries = entries.filter(e => e.gameId === gameIdFilter);

  return NextResponse.json({
    total: getLogBuffer().length,
    returned: Math.min(entries.length, limit),
    entries: entries.slice(0, limit),
  });
}
