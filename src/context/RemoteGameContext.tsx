// KAN-69: RemoteGameContext — multi-device play via SSE + REST API
// Injects into the same GameContext so all components use useGame() unchanged.
'use client';

import { useEffect, useState, useCallback, ReactNode } from 'react';
import { GameState, Card, RoundConfig } from '@/types/game';
import { GameAction, initialState } from '@/lib/gameReducer';
import { GameContext, GameContextType } from './GameContext';

interface RemoteGameProviderProps {
  gameId: string;
  token: string;
  children: ReactNode;
}

export const RemoteGameProvider = ({ gameId, token, children }: RemoteGameProviderProps) => {
  const [state, setState] = useState<GameState>(initialState);

  // ── SSE subscription ─────────────────────────────────────────────────────────
  useEffect(() => {
    const url = `/api/games/${gameId}/events?token=${encodeURIComponent(token)}`;
    const es = new EventSource(url);

    es.onmessage = (e) => {
      try {
        setState(JSON.parse(e.data) as GameState);
      } catch { /* ignore malformed */ }
    };

    return () => es.close();
  }, [gameId, token]);

  // ── Action dispatcher ─────────────────────────────────────────────────────────
  const dispatch = useCallback(async (action: GameAction) => {
    await fetch(`/api/games/${gameId}/action`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, action }),
    });
    // State arrives via SSE — no local setState needed
  }, [gameId, token]);

  // ── GameContextType helpers ───────────────────────────────────────────────────
  const setupGame = (playerCount: number, playerName: string, roundSchedule?: RoundConfig[]) =>
    dispatch({ type: 'SETUP_GAME', payload: { playerCount, playerName, roundSchedule } });

  const joinGame = (name: string) =>
    dispatch({ type: 'JOIN_GAME', payload: { name } });

  const startRound = () => dispatch({ type: 'START_ROUND' });

  const placeBid = (playerId: string, bid: number) =>
    dispatch({ type: 'PLACE_BID', payload: { playerId, bid } });

  const playCard = (playerId: string, card: Card) =>
    dispatch({ type: 'PLAY_CARD', payload: { playerId, card } });

  // KAN-65: server auto-advances after trick reveal — client no-op
  const advanceTrick = () => {};

  const endRound = () => dispatch({ type: 'END_ROUND' });

  const resetGame = () => dispatch({ type: 'RESET_GAME' });

  const value: GameContextType = {
    state,
    setupGame, joinGame, startRound, placeBid, playCard,
    advanceTrick, endRound, resetGame,
    gameId,
    joinCode: state.joinCode ?? undefined,
    myPlayerId: state.myPlayerId ?? undefined,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
