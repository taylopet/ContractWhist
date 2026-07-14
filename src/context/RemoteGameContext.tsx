// KAN-69: RemoteGameContext — multi-device play via SSE + REST API
// KAN-72: SSE reconnection with exponential back-off; connectionStatus exposed
// Injects into the same GameContext so all components use useGame() unchanged.
'use client';

import { useEffect, useState, useCallback, ReactNode } from 'react';
import { GameState, Card, RoundConfig } from '@/types/game';
import { GameAction, initialState } from '@/lib/gameReducer';
import { GameContext, GameContextType } from './GameContext';
import { apiPath } from '@/lib/apiPath';

interface RemoteGameProviderProps {
  gameId: string;
  token: string;
  children: ReactNode;
}

export const RemoteGameProvider = ({ gameId, token, children }: RemoteGameProviderProps) => {
  const [state, setState] = useState<GameState>(initialState);
  const [connectionStatus, setConnectionStatus] =
    useState<'connecting' | 'connected' | 'reconnecting'>('connecting');

  // ── SSE subscription with exponential back-off reconnect ─────────────────────
  useEffect(() => {
    let retryDelay = 1000;
    let timeoutRef: ReturnType<typeof setTimeout> | null = null;
    let es: EventSource | null = null;
    let cancelled = false;

    const connect = () => {
      if (cancelled) return;
      es = new EventSource(apiPath(`/api/games/${gameId}/events?token=${encodeURIComponent(token)}`));

      es.onopen = () => {
        if (cancelled) return;
        setConnectionStatus('connected');
        retryDelay = 1000; // reset on successful connection
      };

      es.onmessage = (e) => {
        if (cancelled) return;
        try {
          setState(JSON.parse(e.data) as GameState);
        } catch (parseErr) {
          console.error(`[RemoteGame] SSE malformed message for game ${gameId}:`, parseErr, e.data?.slice(0, 200));
        }
      };

      es.onerror = () => {
        if (cancelled) return;
        es?.close();
        setConnectionStatus('reconnecting');
        console.warn(`[RemoteGame] SSE error for game ${gameId} — reconnecting in ${retryDelay}ms`);
        timeoutRef = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };
    };

    setConnectionStatus('connecting');
    connect();

    return () => {
      cancelled = true;
      if (timeoutRef) clearTimeout(timeoutRef);
      es?.close();
    };
  }, [gameId, token]);

  // ── Action dispatcher ─────────────────────────────────────────────────────────
  const dispatch = useCallback(async (action: GameAction) => {
    try {
      const res = await fetch(apiPath(`/api/games/${gameId}/action`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action }),
      });
      if (!res.ok) {
        console.error(`[RemoteGame] Action ${action.type} rejected for game ${gameId}: HTTP ${res.status}`);
      }
      // State arrives via SSE — no local setState needed
    } catch (err) {
      console.error(`[RemoteGame] Network error dispatching ${action.type} for game ${gameId}:`, err);
    }
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

  const addBot = useCallback(async () => {
    try {
      await fetch(apiPath(`/api/games/${gameId}/bot`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } catch (err) {
      console.error(`[RemoteGame] Failed to add bot for game ${gameId}:`, err);
    }
  }, [gameId, token]);

  const value: GameContextType = {
    state,
    setupGame, joinGame, startRound, placeBid, playCard,
    advanceTrick, endRound, resetGame, addBot,
    gameId,
    joinCode: state.joinCode ?? undefined,
    myPlayerId: state.myPlayerId ?? undefined,
    connectionStatus,
  };

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};
