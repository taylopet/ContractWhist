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
  // KAN-65/66/69/75 fields — required by updated type
  trickCompleted: false,
  trickWinnerIndex: 0,
  roundSchedule: [],   // empty → reducer falls back to pyramid formula
  handRevealed: true,
  roundHistory: [],    // KAN-75
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

  it('starts round 1 with player at index 0', () => {
    expect(state.currentPlayerIndex).toBe(0);
    expect(state.trickLeaderIndex).toBe(0);
  });

  it('rotates the starting player on subsequent rounds', () => {
    const round2State = { ...stateWith2Players, phase: 'bidding' as const, round: 2 };
    const result = gameReducer(round2State, { type: 'START_ROUND' });
    expect(result.currentPlayerIndex).toBe(1);
    expect(result.trickLeaderIndex).toBe(1);
  });

  it('wraps the starting player index around the player count', () => {
    const round3State = { ...stateWith2Players, phase: 'bidding' as const, round: 3 };
    const result = gameReducer(round3State, { type: 'START_ROUND' });
    expect(result.currentPlayerIndex).toBe(0);
    expect(result.trickLeaderIndex).toBe(0);
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

// KAN-71: last-bidder constraint (bust-bid prevention)
describe('PLACE_BID — last-bidder constraint', () => {
  const afterStart = gameReducer(stateWith2Players, { type: 'START_ROUND' });
  const cardsDealt = afterStart.players[0].hand.length;

  it('rejects the forbidden bid for the last bidder', () => {
    // Player1 bids 1, player2 is last — forbidden bid = cardsDealt - 1
    const stateAfterP1 = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 1 },
    });
    const forbidden = cardsDealt - 1;
    const result = gameReducer(stateAfterP1, {
      type: 'PLACE_BID',
      payload: { playerId: 'player2', bid: forbidden },
    });
    // state unchanged — bid was rejected
    expect(result.players[1].bid).toBeNull();
    expect(result.phase).toBe('bidding');
  });

  it('accepts a non-forbidden bid for the last bidder', () => {
    const stateAfterP1 = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 1 },
    });
    const forbidden = cardsDealt - 1;
    const allowed = forbidden === 0 ? 1 : 0; // pick any bid that isn't forbidden
    const result = gameReducer(stateAfterP1, {
      type: 'PLACE_BID',
      payload: { playerId: 'player2', bid: allowed },
    });
    expect(result.players[1].bid).toBe(allowed);
    expect(result.phase).toBe('playing');
  });

  it('does not restrict the first bidder (not last)', () => {
    // Player1 bids cardsDealt (would be forbidden if they were last, but they're not)
    const result = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: cardsDealt },
    });
    expect(result.players[0].bid).toBe(cardsDealt);
  });
});

// KAN-84: house rule — no bid of 0 in three consecutive rounds
describe('PLACE_BID — zero-streak constraint', () => {
  const twoZeroStreakHistory = [
    { roundIndex: 0, trumpSuit: null, perPlayer: { player1: { bid: 0, tricks: 0, score: 10 } } },
    { roundIndex: 1, trumpSuit: null, perPlayer: { player1: { bid: 0, tricks: 0, score: 10 } } },
  ];

  it('rejects a third consecutive 0 bid', () => {
    const afterStart = gameReducer(
      { ...stateWith2Players, roundHistory: twoZeroStreakHistory },
      { type: 'START_ROUND' }
    );
    const result = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 0 },
    });
    expect(result.players[0].bid).toBeNull(); // rejected — state unchanged
    expect(result.phase).toBe('bidding');
  });

  it('accepts a non-zero bid after two zeros', () => {
    const afterStart = gameReducer(
      { ...stateWith2Players, roundHistory: twoZeroStreakHistory },
      { type: 'START_ROUND' }
    );
    const result = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 1 },
    });
    expect(result.players[0].bid).toBe(1);
  });

  it('does not restrict a player without two prior zero bids', () => {
    const oneZeroHistory = [twoZeroStreakHistory[0]]; // only one zero so far
    const afterStart = gameReducer(
      { ...stateWith2Players, roundHistory: oneZeroHistory },
      { type: 'START_ROUND' }
    );
    const result = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 0 },
    });
    expect(result.players[0].bid).toBe(0);
  });

  it('does not restrict a different player from the one with the zero streak', () => {
    const afterStart = gameReducer(
      { ...stateWith2Players, roundHistory: twoZeroStreakHistory },
      { type: 'START_ROUND' }
    );
    const result = gameReducer(afterStart, {
      type: 'PLACE_BID',
      payload: { playerId: 'player2', bid: 0 },
    });
    expect(result.players[1].bid).toBe(0);
  });

  it('yields to the bust rule when 0 is the only legal bid left', () => {
    // 1 card dealt, player1 (streaking) is last bidder, player2 already bid 0
    // — forbidden bust value is 1, so 0 must remain legal despite the streak.
    const oneCardState: GameState = {
      ...stateWith2Players,
      phase: 'bidding',
      players: [
        { ...makePlayer('player2', 'Bob'), hand: [], bid: 0 },
        { ...makePlayer('player1', 'Alice'), hand: [{ suit: 'hearts', rank: 'ace' }], bid: null },
      ],
      currentPlayerIndex: 1,
      roundHistory: twoZeroStreakHistory,
    };
    const result = gameReducer(oneCardState, {
      type: 'PLACE_BID',
      payload: { playerId: 'player1', bid: 0 },
    });
    expect(result.players[1].bid).toBe(0); // accepted despite the streak
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
    expect(state.scores['player2']).toBe(0);  // KAN-75: bid 1 won 0, miss → tricks won = 0
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
