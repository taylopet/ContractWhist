// KAN-61: component tests for GameBoard phase routing
// KAN-63: layout tests — hand + bidding both visible, no overlap
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameBoard from '@/components/GameBoard';
import { GameState } from '@/types/game';
import { buildRoundSchedule } from '@/lib/gameUtils';

jest.mock('@/context/GameContext', () => ({
  useGame: jest.fn(),
}));

import { useGame } from '@/context/GameContext';
const mockUseGame = useGame as jest.Mock;

const baseState: GameState = {
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
  roundSchedule: buildRoundSchedule(7),
  handRevealed: true,
  gameId: null,
  joinCode: null,
  myPlayerId: null,
};

const mockFns = {
  setupGame: jest.fn(),
  joinGame: jest.fn(),
  startRound: jest.fn(),
  placeBid: jest.fn(),
  playCard: jest.fn(),
  advanceTrick: jest.fn(),   // KAN-65
  endRound: jest.fn(),
  resetGame: jest.fn(),
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('GameBoard phase routing', () => {
  it('renders SetupPhase when phase is setup', () => {
    mockUseGame.mockReturnValue({ state: { ...baseState, phase: 'setup' }, ...mockFns });
    render(<GameBoard />);
    // SetupPhase step 1 shows the player-name-input (start-game-button is on step 2)
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
  });

  it('renders JoinPhase when phase is joining and not all players joined', () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'joining',
        maxPlayers: 3,
        players: [{ id: 'player1', name: 'Alice', hand: [], tricks: 0, bid: null }],
      },
      ...mockFns,
    });
    render(<GameBoard />);
    expect(screen.getByTestId('join-button')).toBeInTheDocument();
  });

  it('renders game-over overlay with Play Again when phase is finished', () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'finished',
        maxPlayers: 2,
        players: [
          { id: 'player1', name: 'Alice', hand: [], tricks: 0, bid: null },
          { id: 'player2', name: 'Bob', hand: [], tricks: 0, bid: null },
        ],
        scores: { player1: 25, player2: 18 },
      },
      ...mockFns,
    });
    render(<GameBoard />);
    expect(screen.getByTestId('play-again-button')).toBeInTheDocument();
    expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    expect(screen.getAllByText('25').length).toBeGreaterThan(0);
  });

  it('Play Again calls resetGame', async () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'finished',
        maxPlayers: 2,
        players: [{ id: 'player1', name: 'Alice', hand: [], tricks: 0, bid: null }],
        scores: { player1: 10 },
      },
      ...mockFns,
    });
    render(<GameBoard />);
    await userEvent.click(screen.getByTestId('play-again-button'));
    expect(mockFns.resetGame).toHaveBeenCalledTimes(1);
  });

  it('renders ScoringPhase when phase is scoring', () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'scoring',
        maxPlayers: 2,
        players: [
          { id: 'player1', name: 'Alice', hand: [], tricks: 2, bid: 2 },
          { id: 'player2', name: 'Bob', hand: [], tricks: 0, bid: 1 },
        ],
        scores: {},
      },
      ...mockFns,
    });
    render(<GameBoard />);
    expect(screen.getByTestId('next-round-button')).toBeInTheDocument();
  });
});

// KAN-63: layout tests — critical phase element visibility
describe('GameBoard layout — no overlap', () => {
  it('KAN-63: hand AND bid panel both in DOM during bidding (no overlap)', () => {
    // Player has cards, it is their turn to bid
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'bidding',
        maxPlayers: 2,
        currentPlayerIndex: 0,
        players: [
          {
            id: 'player1',
            name: 'Alice',
            hand: [{ suit: 'hearts', rank: 'ace' }, { suit: 'spades', rank: 'king' }],
            tricks: 0,
            bid: null,
          },
          { id: 'player2', name: 'Bob', hand: [], tricks: 0, bid: null },
        ],
        scores: {},
      },
      ...mockFns,
    });
    render(<GameBoard />);
    // KAN-68: both must be present simultaneously (not overlapping via fixed stacking)
    expect(screen.getByTestId('player-hand')).toBeInTheDocument();
    expect(screen.getByTestId('bidding-phase')).toBeInTheDocument();
  });

  it('KAN-63: bid panel absent during playing phase', () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'playing',
        maxPlayers: 2,
        currentPlayerIndex: 0,
        players: [
          {
            id: 'player1',
            name: 'Alice',
            hand: [{ suit: 'hearts', rank: 'ace' }],
            tricks: 0,
            bid: 1,
          },
          { id: 'player2', name: 'Bob', hand: [], tricks: 0, bid: 1 },
        ],
        scores: {},
      },
      ...mockFns,
    });
    render(<GameBoard />);
    expect(screen.getByTestId('player-hand')).toBeInTheDocument();
    expect(screen.queryByTestId('bidding-phase')).not.toBeInTheDocument();
  });

  it('KAN-63: scoring overlay present, no bidding panel during scoring', () => {
    mockUseGame.mockReturnValue({
      state: {
        ...baseState,
        phase: 'scoring',
        maxPlayers: 2,
        players: [
          { id: 'player1', name: 'Alice', hand: [], tricks: 1, bid: 1 },
          { id: 'player2', name: 'Bob', hand: [], tricks: 0, bid: 0 },
        ],
        scores: {},
      },
      ...mockFns,
    });
    render(<GameBoard />);
    expect(screen.getByTestId('next-round-button')).toBeInTheDocument();
    expect(screen.queryByTestId('bidding-phase')).not.toBeInTheDocument();
  });
});
