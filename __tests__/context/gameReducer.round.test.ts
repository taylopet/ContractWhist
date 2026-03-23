// KAN-55: tests for gameReducer — START_ROUND, PLACE_BID, END_ROUND
import { gameReducer } from '@/context/GameContext';
import { GameState, Player } from '@/types/game';

const makePlayer = (id: string, name: string): Player => ({
  id,
  name,
  hand: [],
  tricks: 0,
  bid: null,
});

const stateWith2Players: GameState = {
  players: [makePlayer('player1', 'Alice'), makePlayer('player2', 'Bob')],
  currentPlayerIndex: 0,
  trickLeaderIndex: 0,
  trumpSuit: null,
  deck: [],
  currentTrick: [],
  round: 1,
  phase: 'joining',
  scores: {},
  maxPlayers: 2,
  // KAN-65/66/69 fields — required by updated type
  trickCompleted: false,
  trickWinnerIndex: 0,
  roundSchedule: [],   // empty → reducer falls back to pyramid formula
  handRevealed: true,
  gameId: null,
  joinCode: null,
  myPlayerId: null,
};

describe('START_ROUND', () => {
  const state = gameReducer(stateWith2Players, { type: 'START_ROUND' });

  it('deals cards to every player', () => {
    state.players.forEach(p => expect(p.hand.length).toBeGreaterThan(0));
  });

  it('sets trumpSuit from remaining deck', () => {
    expect(state.trumpSuit).not.toBeNull();
  });

  it('resets all tricks to 0', () => {
    state.players.forEach(p => expect(p.tricks).toBe(0));
  });

  it('resets all bids to null', () => {
    state.players.forEach(p => expect(p.bid).toBeNull());
  });

  it('phase becomes bidding', () => {
    expect(state.phase).toBe('bidding');
  });
});

describe('PLACE_BID', () => {
  const afterStart = gameReducer(stateWith2Players, { type: 'START_ROUND' });

  it('records bid for the correct player', () => {
    const state = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 2 },
    });
    expect(state.players[0].bid).toBe(2);
  });

  it('advances currentPlayerIndex after bid', () => {
    const state = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 2 },
    });
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('transitions to playing when all bids placed', () => {
    let state = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 1 },
    });
    state = gameReducer(state, {
      type: 'PLACE_BID',
      payload: { playerId: 'player2', bid: 1 },
    });
    expect(state.phase).toBe('playing');
  });

  it('no-op if phase is not bidding', () => {
    const playingState = { ...afterStart, phase: 'playing' as const };
    const result = gameReducer(playingState, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 2 },
    });
    expect(result.players[0].bid).toBeNull();
  });
});

describe('END_ROUND', () => {
  const scoringState: GameState = {
    ...stateWith2Players,
    phase: 'scoring',
    round: 1,
    players: [
      { ...makePlayer('player1', 'Alice'), bid: 2, tricks: 2 },
      { ...makePlayer('player2', 'Bob'), bid: 1, tricks: 0 },
    ],
  };

  it('accumulates scores correctly', () => {
    const state = gameReducer(scoringState, { type: 'END_ROUND' });
    expect(state.scores['player1']).toBe(12); // 10 + 2 (exact bid)
    expect(state.scores['player2']).toBe(-1); // bid 1 won 0, miss by 1
  });

  it('increments round', () => {
    const state = gameReducer(scoringState, { type: 'END_ROUND' });
    expect(state.round).toBe(2);
  });

  it('phase becomes finished after all rounds', () => {
    const lastRoundState: GameState = {
      ...scoringState,
      round: 25, // 2 * floor(52/2) - 1 = 51 total rounds, but let's test boundary
    };
    // For 2 players: maxCards = 26, totalRounds = 51
    const highState: GameState = { ...scoringState, round: 51 };
    const state = gameReducer(highState, { type: 'END_ROUND' });
    expect(state.phase).toBe('finished');
  });

  it('phase stays bidding before final round', () => {
    const state = gameReducer(scoringState, { type: 'END_ROUND' });
    expect(state.phase).toBe('bidding');
  });
});
