// KAN-74: POST /api/client-errors — receive client-side error reports and log them server-side
// Called by the ErrorBoundary component so client crashes appear in server logs.
import { NextRequest, NextResponse } from 'next/server';
import { log, generateRequestId } from '@/lib/logger';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const requestId = generateRequestId();
  try {
    const body = await req.json() as {
      error: string;
      stack?: string;
      componentStack?: string;
      gameId?: string;
      url?: string;
    };

    log.error('client.error', new Error(body.error), {
      requestId,
      gameId: body.gameId,
      detail: {
        stack: body.stack,
        componentStack: body.componentStack,
        url: body.url,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error('client.error_report_failed', err, { requestId });
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
