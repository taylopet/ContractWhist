// KAN-54: tests for gameReducer — SETUP_GAME and JOIN_GAME actions
import { gameReducer } from '@/context/GameContext';
import { GameState } from '@/types/game';

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  trickLeaderIndex: 0,
  trumpSuit: null,
  deck: [],
  currentTrick: [],
  round: 1,
  phase: 'setup',
  scores: {},
  maxPlayers: null,
  trickCompleted: false,
  trickWinnerIndex: 0,
  roundSchedule: [],
  handRevealed: true,
  gameId: null,
  joinCode: null,
  myPlayerId: null,
};

describe('SETUP_GAME', () => {
  const state = gameReducer(initialState, {
    type: 'SETUP_GAME',
    payload: { playerCount: 3, playerName: 'Alice' },
  });

  it('creates first player with correct name and id', () => {
    expect(state.players).toHaveLength(1);
    expect(state.players[0].name).toBe('Alice');
    expect(state.players[0].id).toBe('player1');
  });

  it('sets maxPlayers', () => {
    expect(state.maxPlayers).toBe(3);
  });

  it('phase is joining for multi-player game', () => {
    expect(state.phase).toBe('joining');
  });

  it('player hand is empty (cards not dealt until START_ROUND)', () => {
    expect(state.players[0].hand).toHaveLength(0);
  });

  it('player bid is null', () => {
    expect(state.players[0].bid).toBeNull();
  });
});

describe('JOIN_GAME', () => {
  const setupState = gameReducer(initialState, {
    type: 'SETUP_GAME',
    payload: { playerCount: 3, playerName: 'Alice' },
  });

  it('adds player with sequential id', () => {
    const state = gameReducer(setupState, {
      type: 'JOIN_GAME',
      payload: { name: 'Bob' },
    });
    expect(state.players).toHaveLength(2);
    expect(state.players[1].id).toBe('player2');
    expect(state.players[1].name).toBe('Bob');
  });

  it('no-op if phase is not joining', () => {
    const playingState = { ...setupState, phase: 'playing' as const };
    const result = gameReducer(playingState, {
      type: 'JOIN_GAME',
      payload: { name: 'Bob' },
    });
    expect(result.players).toHaveLength(1);
  });

  it('no-op if game is full', () => {
    let state = setupState;
    state = gameReducer(state, { type: 'JOIN_GAME', payload: { name: 'Bob' } });
    state = gameReducer(state, { type: 'JOIN_GAME', payload: { name: 'Carol' } });
    // Try to add a 4th to a 3-player game
    const result = gameReducer(state, { type: 'JOIN_GAME', payload: { name: 'Dave' } });
    expect(result.players).toHaveLength(3);
  });

  it('does not alter existing players', () => {
    const state = gameReducer(setupState, {
      type: 'JOIN_GAME',
      payload: { name: 'Bob' },
    });
    expect(state.players[0].name).toBe('Alice');
  });
});
