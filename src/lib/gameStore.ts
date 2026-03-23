// ============================================================
// lib/gameStore.ts — Server-side authoritative game state
//
// KAN-69: in-memory singleton; persists for Node.js process lifetime.
// Uses globalThis to survive Next.js HMR reloads in development.
//
// Responsibilities:
//   - Create / track games by gameId
//   - Assign player tokens for reconnection
//   - Run gameReducer on server (authoritative state)
//   - Filter hands before sending to clients (each player sees only their own)
//   - Pub/sub for SSE: notify subscribers on every state change
// ============================================================

import { GameState, Card, RoundConfig } from '@/types/game';
import { gameReducer, GameAction, initialState } from './gameReducer';
import { buildRoundSchedule } from './gameUtils';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PlayerToken {
  playerId: string;
  token: string;
}

interface GameEntry {
  state: GameState;
  tokens: Map<string, string>; // token → playerId
  createdAt: number;
}

type Subscriber = (state: GameState) => void;

// ── Join-code generation ──────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const generateCode = (len = 6) =>
  Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const generateToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// ── Store class ───────────────────────────────────────────────────────────────

class GameStore {
  private games = new Map<string, GameEntry>();
  private subscribers = new Map<string, Set<Subscriber>>();

  // ── Create ──────────────────────────────────────────────────────────────────

  createGame(
    hostName: string,
    playerCount: number,
    roundSchedule?: RoundConfig[]
  ): { gameId: string; joinCode: string; token: string } {
    const joinCode = generateCode();
    const gameId = joinCode; // use same value for simplicity

    const schedule = roundSchedule ?? buildRoundSchedule(7);
    const action: GameAction = {
      type: 'SETUP_GAME',
      payload: { playerCount, playerName: hostName, roundSchedule: schedule },
    };
    let state = gameReducer(initialState, action);
    state = { ...state, gameId, joinCode, myPlayerId: 'player1' };

    const token = generateToken();
    const entry: GameEntry = {
      state,
      tokens: new Map([[token, 'player1']]),
      createdAt: Date.now(),
    };

    this.games.set(gameId, entry);
    return { gameId, joinCode, token };
  }

  // ── Join ────────────────────────────────────────────────────────────────────

  joinGame(joinCode: string, playerName: string): { gameId: string; token: string } | null {
    const gameId = joinCode.toUpperCase();
    const entry = this.games.get(gameId);
    if (!entry) return null;
    if (entry.state.phase !== 'joining') return null;
    if (entry.state.maxPlayers !== null && entry.state.players.length >= entry.state.maxPlayers) return null;

    const newAction: GameAction = { type: 'JOIN_GAME', payload: { name: playerName } };
    const newState = gameReducer(entry.state, newAction);
    const playerId = newState.players[newState.players.length - 1].id;

    const token = generateToken();
    entry.tokens.set(token, playerId);
    entry.state = newState;

    this.notify(gameId);
    return { gameId, token };
  }

  // ── Dispatch ─────────────────────────────────────────────────────────────────

  dispatch(gameId: string, token: string, action: GameAction): boolean {
    const entry = this.games.get(gameId);
    if (!entry) return false;

    // Verify token is known for this game
    const playerId = entry.tokens.get(token);
    if (!playerId) return false;

    // Inject playerId into actions that need it (security: client can't spoof)
    let safeAction = action;
    if (action.type === 'PLAY_CARD' || action.type === 'PLACE_BID') {
      safeAction = { ...action, payload: { ...action.payload, playerId } } as GameAction;
    }

    const newState = gameReducer(entry.state, safeAction);

    // If trickCompleted just became true, schedule auto-advance after 1.5s
    if (!entry.state.trickCompleted && newState.trickCompleted) {
      setTimeout(() => {
        this.dispatch(gameId, token, { type: 'ADVANCE_AFTER_TRICK' });
      }, 1500);
    }

    entry.state = newState;
    this.notify(gameId);
    return true;
  }

  // ── Read state (player-filtered) ─────────────────────────────────────────────

  getPlayerState(gameId: string, token: string): GameState | null {
    const entry = this.games.get(gameId);
    if (!entry) return null;
    const myPlayerId = entry.tokens.get(token) ?? null;
    return this.filterState(entry.state, myPlayerId);
  }

  getGameState(gameId: string): GameState | null {
    return this.games.get(gameId)?.state ?? null;
  }

  getPlayerIdByToken(gameId: string, token: string): string | null {
    return this.games.get(gameId)?.tokens.get(token) ?? null;
  }

  isValidToken(gameId: string, token: string): boolean {
    return this.games.get(gameId)?.tokens.has(token) ?? false;
  }

  getLobbyInfo(gameId: string): { playerCount: number; maxPlayers: number | null; phase: string } | null {
    const entry = this.games.get(gameId);
    if (!entry) return null;
    return {
      playerCount: entry.state.players.length,
      maxPlayers: entry.state.maxPlayers,
      phase: entry.state.phase,
    };
  }

  // ── Pub/sub for SSE ──────────────────────────────────────────────────────────

  subscribe(gameId: string, token: string, cb: (state: GameState) => void): () => void {
    let set = this.subscribers.get(gameId);
    if (!set) { set = new Set(); this.subscribers.set(gameId, set); }

    // Wrap callback to inject player-filtered state
    const wrapper: Subscriber = (fullState: GameState) => {
      const myPlayerId = this.games.get(gameId)?.tokens.get(token) ?? null;
      cb(this.filterState(fullState, myPlayerId));
    };
    set.add(wrapper);
    return () => set?.delete(wrapper);
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────────

  cleanupOldGames(maxAgeMs = 4 * 60 * 60 * 1000) {
    const now = Date.now();
    for (const [id, entry] of this.games) {
      if (now - entry.createdAt > maxAgeMs) {
        this.games.delete(id);
        this.subscribers.delete(id);
      }
    }
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private notify(gameId: string) {
    const entry = this.games.get(gameId);
    if (!entry) return;
    const set = this.subscribers.get(gameId);
    if (set) set.forEach(cb => cb(entry.state));
  }

  /** Hide other players' hands; set myPlayerId on state */
  private filterState(state: GameState, myPlayerId: string | null): GameState {
    return {
      ...state,
      myPlayerId,
      players: state.players.map(p =>
        p.id === myPlayerId ? p : { ...p, hand: [] }
      ),
    };
  }
}

// ── Singleton (survives HMR in development) ───────────────────────────────────

declare global {
  var _cwGameStore: GameStore | undefined;
}
if (!globalThis._cwGameStore) {
  globalThis._cwGameStore = new GameStore();
  // Clean up stale games every hour
  setInterval(() => globalThis._cwGameStore?.cleanupOldGames(), 60 * 60 * 1000);
}

export const gameStore = globalThis._cwGameStore;
