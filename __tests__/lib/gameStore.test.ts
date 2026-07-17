// KAN-73: tests for the server-side GameStore
// KAN-76: updated for async methods (Redis-backed store)
import { GameStore } from '@/lib/gameStore';
import { GameState, Player, RoundResult } from '@/types/game';

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

// ── botBid — KAN-83/84 ──────────────────────────────────────────────────────
// botBid is private; accessed via a cast, same as any other pure-logic unit test.

describe('GameStore.botBid', () => {
  const makePlayer = (id: string, overrides: Partial<Player> = {}): Player => ({
    id,
    name: id,
    hand: [],
    tricks: 0,
    bid: null,
    ...overrides,
  });

  const baseState: GameState = {
    players: [],
    currentPlayerIndex: 0,
    trickLeaderIndex: 0,
    trumpSuit: null,
    deck: [],
    currentTrick: [],
    round: 1,
    phase: 'bidding',
    scores: {},
    maxPlayers: 2,
    trickCompleted: false,
    trickWinnerIndex: 0,
    roundSchedule: [],
    handRevealed: true,
    roundHistory: [],
    gameId: null,
    joinCode: null,
    myPlayerId: null,
  };

  const botBid = (state: GameState, botId: string): number =>
    (store as unknown as { botBid: (s: GameState, id: string) => number }).botBid(state, botId);

  it('KAN-83: does not get stuck on the bust value with 1 card left (the hang scenario)', () => {
    // 2 players, 1 card each, human already bid 0 — bust value for the bot is 1 - 0 = 1,
    // and the bot's naive heuristic (floor(1/2)=0) doesn't collide, so this alone wouldn't
    // reproduce it; the real hang needs the heuristic to land ON the forbidden value.
    // With 1 card and human bid 1, forbidden = 1 - 1 = 0 — collides with the heuristic 0.
    const state: GameState = {
      ...baseState,
      players: [
        makePlayer('player1', { hand: [], bid: 1 }),
        makePlayer('player2', { hand: [{ suit: 'hearts', rank: 'ace' }], isBot: true }),
      ],
    };
    const bid = botBid(state, 'player2');
    expect(bid).not.toBe(0); // must not submit the bust value it just avoided
    expect(bid).toBe(1);
  });

  it('never returns the forbidden bust value across a range of hand sizes', () => {
    for (let cards = 1; cards <= 6; cards++) {
      for (let humanBid = 0; humanBid <= cards; humanBid++) {
        const hand = Array.from({ length: cards }, () => ({ suit: 'hearts' as const, rank: 'ace' as const }));
        const state: GameState = {
          ...baseState,
          players: [
            makePlayer('player1', { hand: [], bid: humanBid }),
            makePlayer('player2', { hand, isBot: true }),
          ],
        };
        const forbidden = cards - humanBid;
        const bid = botBid(state, 'player2');
        expect(bid).not.toBe(forbidden);
        expect(bid).toBeGreaterThanOrEqual(0);
        expect(bid).toBeLessThanOrEqual(cards);
      }
    }
  });

  it('KAN-84: avoids a third consecutive 0 bid when a legal alternative exists', () => {
    const roundHistory: RoundResult[] = [
      { roundIndex: 0, trumpSuit: null, perPlayer: { player2: { bid: 0, tricks: 0, score: 10 } } },
      { roundIndex: 1, trumpSuit: null, perPlayer: { player2: { bid: 0, tricks: 0, score: 10 } } },
    ];
    const hand = [{ suit: 'hearts' as const, rank: 'ace' as const }, { suit: 'clubs' as const, rank: 'king' as const }];
    const state: GameState = {
      ...baseState,
      roundHistory,
      players: [
        makePlayer('player1', { hand: [] }), // not yet bid — bot is not last bidder
        makePlayer('player2', { hand, isBot: true }),
      ],
    };
    expect(botBid(state, 'player2')).not.toBe(0);
  });

  it('KAN-84: yields the zero-streak rule when 0 is the only bust-legal bid', () => {
    const roundHistory: RoundResult[] = [
      { roundIndex: 0, trumpSuit: null, perPlayer: { player2: { bid: 0, tricks: 0, score: 10 } } },
      { roundIndex: 1, trumpSuit: null, perPlayer: { player2: { bid: 0, tricks: 0, score: 10 } } },
    ];
    // 1 card, human already bid 0 — bust value is 1, so 0 is the only legal bid.
    const state: GameState = {
      ...baseState,
      roundHistory,
      players: [
        makePlayer('player1', { hand: [], bid: 0 }),
        makePlayer('player2', { hand: [{ suit: 'hearts', rank: 'ace' }], isBot: true }),
      ],
    };
    expect(botBid(state, 'player2')).toBe(0);
  });
});
