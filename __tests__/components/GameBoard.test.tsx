// KAN-61: component tests for GameBoard phase routing
// Mocks useGame() to inject controlled state
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import GameBoard from '@/components/GameBoard';
import { GameState } from '@/types/game';

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
};

const mockFns = {
  setupGame: jest.fn(),
  joinGame: jest.fn(),
  startRound: jest.fn(),
  placeBid: jest.fn(),
  playCard: jest.fn(),
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
    expect(screen.getByTestId('start-game-button')).toBeInTheDocument();
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
        players: [
          { id: 'player1', name: 'Alice', hand: [], tricks: 0, bid: null },
        ],
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
