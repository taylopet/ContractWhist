// ============================================================
// context/GameContext.tsx — Client-side game state (local hot-seat mode)
//
// Wraps gameReducer in React useReducer + context.
// For multi-device play, RemoteGameContext provides the same
// interface via API + SSE.
//
// KAN-65: advanceTrick() added for trick reveal delay
// KAN-66: configureGame() sets custom round schedule
// ============================================================

'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Card, RoundConfig } from '@/types/game';
import { gameReducer, initialState, GameAction } from '@/lib/gameReducer';

export { gameReducer } from '@/lib/gameReducer'; // re-export for tests

export interface GameContextType {
  state: GameState;
  setupGame: (playerCount: number, playerName: string, roundSchedule?: RoundConfig[]) => void;
  joinGame: (playerName: string) => void;
  startRound: () => void;
  placeBid: (playerId: string, bid: number) => void;
  playCard: (playerId: string, card: Card) => void;
  advanceTrick: () => void;        // KAN-65: clear trick after reveal
  endRound: () => void;
  resetGame: () => void;
  // Multi-device extras (undefined in local mode)
  gameId?: string;
  joinCode?: string;
  myPlayerId?: string;
}

export const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setupGame = (playerCount: number, playerName: string, roundSchedule?: RoundConfig[]) =>
    dispatch({ type: 'SETUP_GAME', payload: { playerCount, playerName, roundSchedule } });

  const joinGame = (name: string) =>
    dispatch({ type: 'JOIN_GAME', payload: { name } });

  const startRound = () => dispatch({ type: 'START_ROUND' });

  const placeBid = (playerId: string, bid: number) =>
    dispatch({ type: 'PLACE_BID', payload: { playerId, bid } });

  const playCard = (playerId: string, card: Card) =>
    dispatch({ type: 'PLAY_CARD', payload: { playerId, card } });

  const advanceTrick = () => dispatch({ type: 'ADVANCE_AFTER_TRICK' }); // KAN-65

  const endRound = () => dispatch({ type: 'END_ROUND' });

  const resetGame = () => dispatch({ type: 'RESET_GAME' });

  return (
    <GameContext.Provider
      value={{ state, setupGame, joinGame, startRound, placeBid, playCard, advanceTrick, endRound, resetGame }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) throw new Error('useGame must be used within a GameProvider or RemoteGameProvider');
  return context;
};
