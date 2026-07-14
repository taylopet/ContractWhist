// KAN-73: API route tests — POST /api/games and POST /api/games/[id]/join
// Uses lightweight request mocks to avoid NextRequest's Web Fetch API dependency.

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

// Minimal NextRequest / NextResponse shim for tests
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

import { POST as createGameRoute } from '@/app/api/games/route';
import { POST as joinGameRoute } from '@/app/api/games/[id]/join/route';
import { gameStore } from '@/lib/gameStore';

const mockStore = gameStore as jest.Mocked<typeof gameStore>;
const makeParams = (id: string) => ({ params: Promise.resolve({ id }) });

// Re-import NextRequest from the mock so types match
const { NextRequest } = jest.requireMock('next/server');
const makeRequest = (url: string, body: object, headers?: Record<string, string>) =>
  new NextRequest(url, { method: 'POST', body: JSON.stringify(body), headers });

beforeEach(() => jest.clearAllMocks());

// ── POST /api/games ───────────────────────────────────────────────────────────

describe('POST /api/games', () => {
  it('returns 200 with gameId, joinCode, token on valid request', async () => {
    mockStore.createGame.mockReturnValue({ gameId: 'ABC123', joinCode: 'ABC123', token: 'tok-1' });
    const req = makeRequest('http://localhost/api/games', { hostName: 'Alice', playerCount: 2 });
    const res = await createGameRoute(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ gameId: 'ABC123', joinCode: 'ABC123', token: 'tok-1' });
  });

  it('calls createGame with correct args', async () => {
    mockStore.createGame.mockReturnValue({ gameId: 'X', joinCode: 'X', token: 'y' });
    const schedule = [{ cardCount: 3, modifier: 'normal' as const }];
    const req = makeRequest('http://localhost/api/games', { hostName: 'Bob', playerCount: 3, roundSchedule: schedule });
    await createGameRoute(req);
    expect(mockStore.createGame).toHaveBeenCalledWith('Bob', 3, schedule);
  });

  it('returns 400 when hostName is missing', async () => {
    const req = makeRequest('http://localhost/api/games', { playerCount: 2 });
    const res = await createGameRoute(req);
    expect(res.status).toBe(400);
  });

  it('returns 400 when playerCount is out of range', async () => {
    const req = makeRequest('http://localhost/api/games', { hostName: 'Alice', playerCount: 5 });
    const res = await createGameRoute(req);
    expect(res.status).toBe(400);
  });

  it('trims whitespace from hostName', async () => {
    mockStore.createGame.mockReturnValue({ gameId: 'X', joinCode: 'X', token: 'y' });
    const req = makeRequest('http://localhost/api/games', { hostName: '  Alice  ', playerCount: 2 });
    await createGameRoute(req);
    expect(mockStore.createGame).toHaveBeenCalledWith('Alice', 2, undefined);
  });
});

// ── POST /api/games/[id]/join ─────────────────────────────────────────────────

describe('POST /api/games/[id]/join', () => {
  it('returns 200 with gameId and token on success', async () => {
    mockStore.getLobbyInfo.mockReturnValue({ playerCount: 1, maxPlayers: 2, phase: 'joining' });
    mockStore.joinGame.mockReturnValue({ gameId: 'ABC123', token: 'tok-2' });
    const req = makeRequest('http://localhost/api/games/ABC123/join', { playerName: 'Bob' });
    const res = await joinGameRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ gameId: 'ABC123', token: 'tok-2' });
  });

  it('returns 404 when game not found', async () => {
    mockStore.getLobbyInfo.mockReturnValue(null);
    const req = makeRequest('http://localhost/api/games/XXXXXX/join', { playerName: 'Bob' });
    const res = await joinGameRoute(req, makeParams('XXXXXX'));
    expect(res.status).toBe(404);
  });

  it('returns 409 when game already started', async () => {
    mockStore.getLobbyInfo.mockReturnValue({ playerCount: 2, maxPlayers: 2, phase: 'bidding' });
    const req = makeRequest('http://localhost/api/games/ABC123/join', { playerName: 'Bob' });
    const res = await joinGameRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toMatch(/already started/i);
  });

  it('returns 409 when joinGame returns null (game full)', async () => {
    mockStore.getLobbyInfo.mockReturnValue({ playerCount: 2, maxPlayers: 2, phase: 'joining' });
    mockStore.joinGame.mockReturnValue(null);
    const req = makeRequest('http://localhost/api/games/ABC123/join', { playerName: 'Bob' });
    const res = await joinGameRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(409);
  });

  it('returns 400 when playerName is missing', async () => {
    const req = makeRequest('http://localhost/api/games/ABC123/join', {});
    const res = await joinGameRoute(req, makeParams('ABC123'));
    expect(res.status).toBe(400);
  });
});
