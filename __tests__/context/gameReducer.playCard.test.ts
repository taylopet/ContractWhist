// KAN-56: tests for gameReducer — PLAY_CARD action
import { gameReducer } from '@/context/GameContext';
import { GameState, Card, Player } from '@/types/game';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

const makePlayer = (id: string, hand: Card[], bid = 0, tricks = 0): Player => ({
  id,
  name: id,
  hand,
  tricks,
  bid,
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
    // player1 has hearts, trick led with hearts — can't play spades
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

  it('credits trick to winner when trick complete (KAN-47)', () => {
    // player2 has only spades (void in hearts) so can trump the lead
    const voidInHeartsState: GameState = {
      ...twoPlayerPlaying,
      players: [
        makePlayer('player1', [c('hearts', 'ace'), c('hearts', '2')]),
        makePlayer('player2', [c('spades', 'ace'), c('spades', '2')]), // void in hearts
      ],
    };
    const afterP1 = gameReducer(voidInHeartsState, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player1', card: c('hearts', 'ace') },
    });
    // player2 is void in hearts — spades ace is valid
    const state = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    expect(state.currentTrick).toHaveLength(0); // trick cleared
    expect(state.players[1].tricks).toBe(1);    // player2 won (trump)
    expect(state.currentPlayerIndex).toBe(1);   // winner leads next
  });

  it('transitions to scoring when all hands empty', () => {
    // Deal exactly 1 card each
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
    const state = gameReducer(afterP1, {
      type: 'PLAY_CARD',
      payload: { playerId: 'player2', card: c('spades', 'ace') },
    });
    expect(state.phase).toBe('scoring');
  });
});
