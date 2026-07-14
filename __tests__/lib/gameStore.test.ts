// KAN-73: tests for the server-side GameStore
// KAN-76: updated for async methods (Redis-backed store)
import { GameStore } from '@/lib/gameStore';

let store: GameStore;

beforeEach(() => {
  store = new GameStore(); // no REDIS_URL set in test env → pure in-memory
});

// ── createGame ────────────────────────────────────────────────────────────────

describe('GameStore.createGame', () => {
  it('returns gameId, joinCode, and token', async () => {
    const result = await store.createGame('Alice', 2);
    expect(result.gameId).toBeTruthy();
    expect(result.joinCode).toBeTruthy();
    expect(result.token).toBeTruthy();
  });

  it('gameId equals joinCode', async () => {
    const { gameId, joinCode } = await store.createGame('Alice', 2);
    expect(gameId).toBe(joinCode);
  });

  it('generates 6-character join code', async () => {
    const { joinCode } = await store.createGame('Alice', 2);
    expect(joinCode).toHaveLength(6);
  });

  it('creates game in joining phase with host as player1', async () => {
    const { gameId, token } = await store.createGame('Alice', 3);
    const state = await store.getPlayerState(gameId, token);
    expect(state).not.toBeNull();
    expect(state!.phase).toBe('joining');
    expect(state!.players).toHaveLength(1);
    expect(state!.players[0].name).toBe('Alice');
    expect(state!.players[0].id).toBe('player1');
  });

  it('sets maxPlayers correctly', async () => {
    const { gameId, token } = await store.createGame('Alice', 4);
    const state = await store.getPlayerState(gameId, token);
    expect(state!.maxPlayers).toBe(4);
  });

  it('host token is valid', async () => {
    const { gameId, token } = await store.createGame('Alice', 2);
    expect(await store.isValidToken(gameId, token)).toBe(true);
  });

  it('host sees their own hand (not hidden)', async () => {
    const { gameId, token } = await store.createGame('Alice', 2);
    const state = await store.getPlayerState(gameId, token);
    expect(state!.myPlayerId).toBe('player1');
  });
});

// ── joinGame ──────────────────────────────────────────────────────────────────

describe('GameStore.joinGame', () => {
  it('adds a second player and returns token', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    const result = await store.joinGame(gameId, 'Bob');
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.gameId).toBe(gameId);
  });

  it('returns null for unknown join code', async () => {
    const result = await store.joinGame('XXXXXX', 'Bob');
    expect(result).toBeNull();
  });

  it('returns null when game is full', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    await store.joinGame(gameId, 'Bob');
    const result = await store.joinGame(gameId, 'Carol');
    expect(result).toBeNull();
  });

  it('returns null when game is not in joining phase', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    await store.joinGame(gameId, 'Bob');
    // Game auto-advanced to bidding; a third join should fail
    const result = await store.joinGame(gameId, 'Carol');
    expect(result).toBeNull();
  });

  it('joiner token is valid', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    const { token } = (await store.joinGame(gameId, 'Bob'))!;
    expect(await store.isValidToken(gameId, token)).toBe(true);
  });

  it('joiner sees their own myPlayerId', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    const { token } = (await store.joinGame(gameId, 'Bob'))!;
    const state = await store.getPlayerState(gameId, token);
    expect(state!.myPlayerId).toBe('player2');
  });
});

// ── dispatch ──────────────────────────────────────────────────────────────────

describe('GameStore.dispatch', () => {
  it('returns false for unknown token', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    const result = await store.dispatch(gameId, 'bad-token', { type: 'START_ROUND' });
    expect(result).toBe(false);
  });

  it('returns false for unknown gameId', async () => {
    const result = await store.dispatch('XXXXXX', 'any-token', { type: 'START_ROUND' });
    expect(result).toBe(false);
  });

  it('runs reducer and updates state', async () => {
    const { gameId, token } = await store.createGame('Alice', 2);
    await store.joinGame(gameId, 'Bob');
    await store.dispatch(gameId, token, { type: 'START_ROUND' });
    const state = await store.getPlayerState(gameId, token);
    expect(state!.phase).toBe('bidding');
  });

  it('injects playerId from token — client cannot spoof', async () => {
    const { gameId, token } = await store.createGame('Alice', 2);
    const bobResult = (await store.joinGame(gameId, 'Bob'))!;
    await store.dispatch(gameId, token, { type: 'START_ROUND' });
    // Bob tries to bid as player1 (spoofed) — store should inject player2 instead
    await store.dispatch(gameId, bobResult.token, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 1 },
    });
    const state = (await store.getGameState(gameId))!;
    expect(state.players[1].bid).toBe(1);
    expect(state.players[0].bid).toBeNull();
  });
});

// ── getPlayerState — hand hiding ──────────────────────────────────────────────

describe('GameStore.getPlayerState — hand secrecy', () => {
  it('player sees only their own cards after round starts', async () => {
    const { gameId, token: aliceToken } = await store.createGame('Alice', 2);
    const { token: bobToken } = (await store.joinGame(gameId, 'Bob'))!;
    await store.dispatch(gameId, aliceToken, { type: 'START_ROUND' });

    const aliceState = (await store.getPlayerState(gameId, aliceToken))!;
    const bobState = (await store.getPlayerState(gameId, bobToken))!;

    const aliceInAliceView = aliceState.players.find(p => p.id === 'player1')!;
    const bobInAliceView = aliceState.players.find(p => p.id === 'player2')!;
    expect(aliceInAliceView.hand.length).toBeGreaterThan(0);
    expect(bobInAliceView.hand).toHaveLength(0);

    const aliceInBobView = bobState.players.find(p => p.id === 'player1')!;
    const bobInBobView = bobState.players.find(p => p.id === 'player2')!;
    expect(bobInBobView.hand.length).toBeGreaterThan(0);
    expect(aliceInBobView.hand).toHaveLength(0);
  });
});

// ── cleanupOldGames ───────────────────────────────────────────────────────────

describe('GameStore.cleanupOldGames', () => {
  it('removes games older than maxAgeMs', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    expect(await store.getLobbyInfo(gameId)).not.toBeNull();
    store.cleanupOldGames(-1);
    expect(await store.getLobbyInfo(gameId)).toBeNull();
  });

  it('keeps games younger than maxAgeMs', async () => {
    const { gameId } = await store.createGame('Alice', 2);
    store.cleanupOldGames(60 * 60 * 1000);
    expect(await store.getLobbyInfo(gameId)).not.toBeNull();
  });
});
