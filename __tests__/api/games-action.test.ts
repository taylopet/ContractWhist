// KAN-73: API route tests — POST /api/games/[id]/action and GET /api/games/[id]/state

jest.mock('@/lib/gameStore', () => ({
  gameStore: {
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

import { POST as actionRoute } from '@/app/api/games/[id]/action/route';
import { GET as stateRoute } from '@/app/api/games/[id]/state/route';
import { gameStore } from '@/lib/gameStore';

const mockStore = gameStore as jest.Mocked<typeof gameStore>;
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });
const { NextRequest } = jest.requireMock('next/server');

beforeEach(() => jest.clearAllMocks());

// ── POST /api/games/[id]/action ───────────────────────────────────────────────

describe('POST /api/games/[id]/action', () => {
  const makeActionReq = (body: object) =>
    new NextRequest('http://localhost/api/games/ABC123/action', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    });

  it('returns 200 { ok: true } when dispatch succeeds', async () => {
    mockStore.dispatch.mockReturnValue(true);
    const req = makeActionReq({ token: 'tok-1', action: { type: 'START_ROUND' } });
    const res = await actionRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
  });

  it('returns 403 when dispatch returns false (invalid token)', async () => {
    mockStore.dispatch.mockReturnValue(false);
    const req = makeActionReq({ token: 'bad-token', action: { type: 'START_ROUND' } });
    const res = await actionRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(403);
  });

  it('returns 400 when token is missing', async () => {
    const req = makeActionReq({ action: { type: 'START_ROUND' } });
    const res = await actionRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(400);
  });

  it('returns 400 when action is missing', async () => {
    const req = makeActionReq({ token: 'tok-1' });
    const res = await actionRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(400);
  });

  it('uppercases the game id before dispatching', async () => {
    mockStore.dispatch.mockReturnValue(true);
    const req = new NextRequest('http://localhost/api/games/abc123/action', {
      method: 'POST',
      body: JSON.stringify({ token: 'tok-1', action: { type: 'START_ROUND' } }),
    });
    await actionRoute(req, makeParams('abc123'));
    expect(mockStore.dispatch).toHaveBeenCalledWith('ABC123', 'tok-1', { type: 'START_ROUND' });
  });
});

// ── GET /api/games/[id]/state ─────────────────────────────────────────────────

describe('GET /api/games/[id]/state', () => {
  const mockState = { phase: 'bidding', players: [], round: 1 };

  it('returns player-filtered state with token in query string', async () => {
    mockStore.getPlayerState.mockReturnValue(mockState as any);
    const req = new NextRequest('http://localhost/api/games/ABC123/state?token=tok-1');
    const res = await stateRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.phase).toBe('bidding');
    expect(mockStore.getPlayerState).toHaveBeenCalledWith('ABC123', 'tok-1');
  });

  it('returns player-filtered state with token in x-player-token header', async () => {
    mockStore.getPlayerState.mockReturnValue(mockState as any);
    const req = new NextRequest('http://localhost/api/games/ABC123/state', {
      headers: { 'x-player-token': 'tok-header' },
    });
    const res = await stateRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(200);
    expect(mockStore.getPlayerState).toHaveBeenCalledWith('ABC123', 'tok-header');
  });

  it('returns 404 when getPlayerState returns null (bad token / unknown game)', async () => {
    mockStore.getPlayerState.mockReturnValue(null);
    const req = new NextRequest('http://localhost/api/games/XXXXXX/state?token=bad');
    const res = await stateRoute(req, makeParams('XXXXXX'));
    expect(res.status).toBe(404);
  });
});
