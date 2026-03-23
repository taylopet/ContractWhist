// KAN-56: tests for gameReducer — PLAY_CARD action
// KAN-65: trick completion now sets trickCompleted=true (reveal delay);
//         ADVANCE_AFTER_TRICK clears the trick and advances play.
import { gameReducer } from '@/context/GameContext';
import { GameState, Card, Player } from '@/types/game';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

const makePlayer = (id: string, hand: Card[], bid = 0, tricks = 0): Player => ({
  id, name: id, hand, tricks, bid,
});

const twoPlayerPlaying: GameState = {
  players: [
    makePlayer('player1', [c('hearts', 'ace'), c('hearts', '2')]),
    makePlayer('player2', [c('hearts', 'king'), c('spades', 'ace')]),
  ],
  currentPlayerIndex: 0,
  trickLeaderIndex: 0,
  trumpSuit: 'spades',
  deck: [],
  currentTrick: [],
  round: 1,
  phase: 'playing',
  scores: {},
  maxPlayers: 2,
  trickCompleted: false,
  trickWinnerIndex: 0,
  roundSchedule: [],
  handRevealed: true,
  gameId: null,
  joinCode: null,
  myPlayerId: null,
};

describe('PLAY_CARD', () => {
  it('removes card from player hand', () => {
    const state = gameReducer(twoPlayerPlaying, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    expect(state.players[0].hand).toHaveLength(1);
    expect(state.players[0].hand[0]).toEqual(c('hearts', '2'));
  });

  it('adds card to currentTrick', () => {
    const state = gameReducer(twoPlayerPlaying, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    expect(state.currentTrick).toHaveLength(1);
    expect(state.currentTrick[0]).toEqual(c('hearts', 'ace'));
  });

  it('advances currentPlayerIndex', () => {
    const state = gameReducer(twoPlayerPlaying, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    expect(state.currentPlayerIndex).toBe(1);
  });

  it('no-op if phase is not playing', () => {
    const biddingState = { ...twoPlayerPlaying, phase: 'bidding' as const };
    const state = gameReducer(biddingState, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    expect(state.currentTrick).toHaveLength(0);
  });

  it("no-op if it's not this player's turn", () => {
    const state = gameReducer(twoPlayerPlaying, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('hearts', 'king') },
    });
    expect(state.currentTrick).toHaveLength(0);
  });

  it('no-op if card violates follow-suit rule', () => {
    const afterP1 = gameReducer(twoPlayerPlaying, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    // player2 has king of hearts — must follow hearts, can't play spade ace
    const state = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    expect(state.currentTrick).toHaveLength(1); // trick not extended
  });

  it('KAN-65: sets trickCompleted=true when trick is complete (does not clear immediately)', () => {
    // player2 has only spades (void in hearts) so can trump
    const voidState: GameState = {
      ...twoPlayerPlaying,
      players: [
        makePlayer('player1', [c('hearts', 'ace'), c('hearts', '2')]),
        makePlayer('player2', [c('spades', 'ace'), c('spades', '2')]),
      ],
    };
    const afterP1 = gameReducer(voidState, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    const state = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    // KAN-65: trick stays visible until ADVANCE_AFTER_TRICK
    expect(state.trickCompleted).toBe(true);
    expect(state.currentTrick).toHaveLength(2); // NOT cleared yet
    expect(state.players[1].tricks).toBe(1);    // winner already credited
  });

  it('KAN-65: ADVANCE_AFTER_TRICK clears trick and advances play (credits trick to winner)', () => {
    const voidState: GameState = {
      ...twoPlayerPlaying,
      players: [
        makePlayer('player1', [c('hearts', 'ace'), c('hearts', '2')]),
        makePlayer('player2', [c('spades', 'ace'), c('spades', '2')]),
      ],
    };
    const afterP1 = gameReducer(voidState, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    const afterTrick = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    const state = gameReducer(afterTrick, { type: 'ADVANCE_AFTER_TRICK' });
    expect(state.currentTrick).toHaveLength(0); // cleared
    expect(state.trickCompleted).toBe(false);
    expect(state.currentPlayerIndex).toBe(1);   // winner leads next
  });

  it('transitions to scoring after ADVANCE_AFTER_TRICK when all hands empty', () => {
    const oneCardState: GameState = {
      ...twoPlayerPlaying,
      players: [
        makePlayer('player1', [c('hearts', 'ace')]),
        makePlayer('player2', [c('spades', 'ace')]),
      ],
    };
    const afterP1 = gameReducer(oneCardState, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    const afterTrick = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    // Still playing during reveal
    expect(afterTrick.phase).toBe('playing');
    // After advance
    const state = gameReducer(afterTrick, { type: 'ADVANCE_AFTER_TRICK' });
    expect(state.phase).toBe('scoring');
  });
});
