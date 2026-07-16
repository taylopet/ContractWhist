// KAN-74: tests for health and admin endpoints

jest.mock('@/lib/gameStore', () => ({
  gameStore: {
    getActiveGamesSummary: jest.fn(),
    createGame: jest.fn(),
    getLobbyInfo: jest.fn(),
    joinGame: jest.fn(),
    dispatch: jest.fn(),
    getPlayerState: jest.fn(),
    isValidToken: jest.fn(),
  },
}));

jest.mock('next/server', () => ({
  NextRequest: class MockNextRequest {
    private _body: string;
    headers: Map<string, string>;
    nextUrl: { searchParams: URLSearchParams };
    constructor(url: string, init?: { method?: string; body?: string; headers?: Record<string, string> }) {
      this._body = init?.body ?? '{}';
      this.headers = new Map(Object.entries(init?.headers ?? {}));
      this.nextUrl = { searchParams: new URLSearchParams(new URL(url, 'http://localhost').search) };
    }
    async json() { return JSON.parse(this._body); }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

import { GET as healthRoute } from '@/app/api/health/route';
import { GET as adminLogsRoute } from '@/app/api/admin/logs/route';
import { GET as adminGamesRoute } from '@/app/api/admin/games/route';
import { gameStore } from '@/lib/gameStore';
import { log } from '@/lib/logger';

const mockStore = gameStore as jest.Mocked<typeof gameStore>;
const { NextRequest } = jest.requireMock('next/server');

beforeEach(() => jest.clearAllMocks());

// ── GET /api/health ───────────────────────────────────────────────────────────

describe('GET /api/health', () => {
  it('returns status ok with live stats', async () => {
    mockStore.getActiveGamesSummary.mockReturnValue([
      { gameId: 'A', phase: 'bidding', playerCount: 2, maxPlayers: 2, round: 3, totalRounds: 7, createdAt: new Date().toISOString() },
    ]);
    const res = await healthRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.activeGames).toBe(1);
    expect(body.uptimeSeconds).toBeGreaterThanOrEqual(0);
    expect(body.nodeVersion).toMatch(/^v\d+/);
    expect(body.memory).toHaveProperty('heapUsedMB');
    expect(body.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

// ── GET /api/admin/games ──────────────────────────────────────────────────────

describe('GET /api/admin/games', () => {
  it('returns active games summary', async () => {
    const games = [
      { gameId: 'WOLF42', phase: 'playing', playerCount: 3, maxPlayers: 3, round: 2, totalRounds: 7, createdAt: '2026-01-01T00:00:00.000Z' },
    ];
    mockStore.getActiveGamesSummary.mockReturnValue(games);
    const res = await adminGamesRoute();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activeGames).toBe(1);
    expect(body.games[0].gameId).toBe('WOLF42');
  });
});

// ── GET /api/admin/logs ───────────────────────────────────────────────────────

describe('GET /api/admin/logs', () => {
  beforeEach(() => {
    // Add a few known log entries
    log.info('test.admin.info', { gameId: 'LOGTEST' });
    log.error('test.admin.error', new Error('test error'), { gameId: 'LOGTEST' });
  });

  it('returns recent log entries', async () => {
    const req = new NextRequest('http://localhost/api/admin/logs');
    const res = await adminLogsRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.entries)).toBe(true);
    expect(body.total).toBeGreaterThan(0);
    expect(body.returned).toBeGreaterThan(0);
  });

  it('filters by level', async () => {
    log.warn('test.admin.warn.only');
    const req = new NextRequest('http://localhost/api/admin/logs?level=warn');
    const res = await adminLogsRoute(req);
    const body = await res.json();
    expect(body.entries.every((e: { level: string }) => e.level === 'warn')).toBe(true);
  });

  it('filters by gameId', async () => {
    log.info('test.gameid.filter', { gameId: 'UNIQUEGAME' });
    const req = new NextRequest('http://localhost/api/admin/logs?gameId=UNIQUEGAME');
    const res = await adminLogsRoute(req);
    const body = await res.json();
    expect(body.entries.length).toBeGreaterThanOrEqual(1);
    expect(body.entries.every((e: { gameId: string }) => e.gameId === 'UNIQUEGAME')).toBe(true);
  });

  it('filters by event prefix', async () => {
    log.info('action.dispatched', { gameId: 'X', action: 'PLAY_CARD' });
    const req = new NextRequest('http://localhost/api/admin/logs?event=action.');
    const res = await adminLogsRoute(req);
    const body = await res.json();
    expect(body.entries.every((e: { event: string }) => e.event.startsWith('action.'))).toBe(true);
  });

  it('respects limit parameter', async () => {
    const req = new NextRequest('http://localhost/api/admin/logs?limit=2');
    const res = await adminLogsRoute(req);
    const body = await res.json();
    expect(body.entries.length).toBeLessThanOrEqual(2);
  });
});
