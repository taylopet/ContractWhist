// ============================================================
// lib/gameStore.ts — Server-side authoritative game state
//
// KAN-69: in-memory singleton; persists for Node.js process lifetime.
// KAN-76: Redis write-through via ioredis; lazy-loads games on demand
//         so state survives App Service restarts.
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
import { log } from './logger';

const RANK_ORDER: Record<string, number> = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'jack': 11, 'queen': 12, 'king': 13, 'ace': 14,
};
const rankValue = (rank: string) => RANK_ORDER[rank] ?? 0;
const sortByRank = (cards: Card[]) => [...cards].sort((a, b) => rankValue(a.rank) - rankValue(b.rank));

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

// Serialisable form stored in Redis (Map → plain object)
interface SerializedEntry {
  state: GameState;
  tokens: Record<string, string>;
  createdAt: number;
}

type Subscriber = (state: GameState) => void;

const GAME_TTL_SECONDS = 4 * 60 * 60; // 4 hours
const redisKey = (gameId: string) => `cw:game:${gameId}`;

// ── Join-code generation ──────────────────────────────────────────────────────

const CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // no 0/O, 1/I/L
const generateCode = (len = 6) =>
  Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');

const generateToken = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

// ── Store class ───────────────────────────────────────────────────────────────

export class GameStore {
  private games = new Map<string, GameEntry>();
  private subscribers = new Map<string, Set<Subscriber>>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private redis: any = null;

  constructor() {
    if (process.env.REDIS_URL) {
      // Dynamic require avoids ioredis being bundled for edge/browser targets
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Redis = require('ioredis');
      this.redis = new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 3 });
      this.redis.on('error', (err: Error) =>
        log.error('redis.connection_error', err, {})
      );
    }
  }

  // ── Redis helpers ────────────────────────────────────────────────────────────

  /** Load game from in-memory cache; fall back to Redis on miss. */
  private async loadGame(gameId: string): Promise<GameEntry | undefined> {
    if (this.games.has(gameId)) return this.games.get(gameId)!;
    if (!this.redis) return undefined;
    try {
      const data: string | null = await this.redis.get(redisKey(gameId));
      if (!data) return undefined;
      const s: SerializedEntry = JSON.parse(data);
      const entry: GameEntry = {
        state: s.state,
        tokens: new Map(Object.entries(s.tokens)),
        createdAt: s.createdAt,
      };
      this.games.set(gameId, entry);
      return entry;
    } catch (err) {
      log.error('redis.load_error', err as Error, { gameId });
      return undefined;
    }
  }

  /** Persist game to Redis (fire-and-forget). */
  private persist(gameId: string, entry: GameEntry): void {
    if (!this.redis) return;
    const s: SerializedEntry = {
      state: entry.state,
      tokens: Object.fromEntries(entry.tokens),
      createdAt: entry.createdAt,
    };
    this.redis
      .setex(redisKey(gameId), GAME_TTL_SECONDS, JSON.stringify(s))
      .catch((err: Error) => log.error('redis.persist_error', err, { gameId }));
  }

  // ── Create ──────────────────────────────────────────────────────────────────

  async createGame(
    hostName: string,
    playerCount: number,
    roundSchedule?: RoundConfig[]
  ): Promise<{ gameId: string; joinCode: string; token: string }> {
    const joinCode = generateCode();
    const gameId = joinCode;

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
    this.persist(gameId, entry);
    log.info('game.created', { gameId, detail: { hostName, playerCount, joinCode, roundCount: schedule.length } });
    return { gameId, joinCode, token };
  }

  // ── Join ────────────────────────────────────────────────────────────────────

  async joinGame(joinCode: string, playerName: string): Promise<{ gameId: string; token: string } | null> {
    const gameId = joinCode.toUpperCase();
    const entry = await this.loadGame(gameId);
    if (!entry) {
      log.warn('game.join_rejected', { gameId, detail: { reason: 'game_not_found', playerName } });
      return null;
    }
    if (entry.state.phase !== 'joining') {
      log.warn('game.join_rejected', { gameId, detail: { reason: 'wrong_phase', phase: entry.state.phase, playerName } });
      return null;
    }
    if (entry.state.maxPlayers !== null && entry.state.players.length >= entry.state.maxPlayers) {
      log.warn('game.join_rejected', { gameId, detail: { reason: 'game_full', playerCount: entry.state.players.length, maxPlayers: entry.state.maxPlayers, playerName } });
      return null;
    }

    const newAction: GameAction = { type: 'JOIN_GAME', payload: { name: playerName } };
    const newState = gameReducer(entry.state, newAction);
    const playerId = newState.players[newState.players.length - 1].id;

    const token = generateToken();
    entry.tokens.set(token, playerId);
    entry.state = newState;

    this.persist(gameId, entry);
    log.info('game.player_joined', { gameId, playerId, detail: { playerName, totalJoined: newState.players.length, maxPlayers: newState.maxPlayers } });
    this.notify(gameId);
    return { gameId, token };
  }

  // ── Dispatch ─────────────────────────────────────────────────────────────────

  async dispatch(gameId: string, token: string, action: GameAction): Promise<boolean> {
    const entry = await this.loadGame(gameId);
    if (!entry) {
      log.warn('action.rejected', { gameId, action: action.type, detail: { reason: 'game_not_found' } });
      return false;
    }

    const playerId = entry.tokens.get(token);
    if (!playerId) {
      log.warn('action.rejected', { gameId, action: action.type, detail: { reason: 'invalid_token' } });
      return false;
    }

    const phaseBefore = entry.state.phase;

    let safeAction = action;
    if (action.type === 'PLAY_CARD' || action.type === 'PLACE_BID') {
      safeAction = { ...action, payload: { ...action.payload, playerId } } as GameAction;
    }

    const newState = gameReducer(entry.state, safeAction);
    const phaseAfter = newState.phase;

    if (!entry.state.trickCompleted && newState.trickCompleted) {
      log.info('action.trick_advance_scheduled', { gameId, playerId, action: action.type, detail: { delayMs: 1500 } });
      setTimeout(() => {
        this.dispatch(gameId, token, { type: 'ADVANCE_AFTER_TRICK' });
      }, 1500);
    }

    entry.state = newState;
    this.persist(gameId, entry);
    log.info('action.dispatched', { gameId, playerId, action: action.type, phaseBefore, phaseAfter });
    this.notify(gameId);
    this.checkBotTurn(gameId);
    return true;
  }

  // ── Bot players ───────────────────────────────────────────────────────────────

  async addBot(gameId: string, hostToken: string): Promise<boolean> {
    const entry = await this.loadGame(gameId);
    if (!entry) return false;
    const hostPlayerId = entry.tokens.get(hostToken);
    if (hostPlayerId !== 'player1') return false;
    if (entry.state.phase !== 'joining') return false;
    if (entry.state.maxPlayers !== null && entry.state.players.length >= entry.state.maxPlayers) return false;

    const botNumber = entry.state.players.filter(p => p.isBot).length + 1;
    const newState = gameReducer(entry.state, { type: 'ADD_BOT', payload: { name: `Bot ${botNumber}` } });
    const botPlayerId = newState.players[newState.players.length - 1].id;
    const botToken = generateToken();
    entry.tokens.set(botToken, botPlayerId);
    entry.state = newState;
    this.persist(gameId, entry);
    log.info('game.bot_added', { gameId, detail: { botPlayerId, botNumber } });
    this.notify(gameId);
    return true;
  }

  private checkBotTurn(gameId: string): void {
    const entry = this.games.get(gameId);
    if (!entry) return;
    const { state } = entry;
    if (state.phase !== 'bidding' && state.phase !== 'playing') return;
    if (state.trickCompleted) return;
    const current = state.players[state.currentPlayerIndex];
    if (!current?.isBot) return;
    setTimeout(() => this.executeBotTurn(gameId, current.id), 600);
  }

  private executeBotTurn(gameId: string, botPlayerId: string): void {
    const entry = this.games.get(gameId);
    if (!entry) return;
    const { state } = entry;
    const botToken = [...entry.tokens.entries()].find(([, pid]) => pid === botPlayerId)?.[0];
    if (!botToken) return;
    // Re-confirm it is still this bot's turn (state may have changed)
    const current = state.players[state.currentPlayerIndex];
    if (current?.id !== botPlayerId) return;

    if (state.phase === 'bidding') {
      const bid = this.botBid(state, botPlayerId);
      this.dispatch(gameId, botToken, { type: 'PLACE_BID', payload: { playerId: botPlayerId, bid } });
    } else if (state.phase === 'playing' && !state.trickCompleted) {
      const card = this.botCard(state, botPlayerId);
      if (card) {
        this.dispatch(gameId, botToken, { type: 'PLAY_CARD', payload: { playerId: botPlayerId, card } });
      }
    }
  }

  private botBid(state: GameState, botPlayerId: string): number {
    const player = state.players.find(p => p.id === botPlayerId);
    if (!player) return 0;
    const cards = player.hand.length;
    const numPlayers = state.players.length;
    let bid = Math.max(0, Math.floor(cards / numPlayers));
    // Last-bidder constraint: cannot make total equal cards
    const othersHaveBid = state.players.filter(p => p.id !== botPlayerId).every(p => p.bid !== null);
    if (othersHaveBid) {
      const sumOthers = state.players.filter(p => p.id !== botPlayerId).reduce((s, p) => s + (p.bid ?? 0), 0);
      const forbidden = cards - sumOthers;
      if (bid === forbidden) bid = Math.max(0, bid - 1);
    }
    return bid;
  }

  private botCard(state: GameState, botPlayerId: string): Card | null {
    const player = state.players.find(p => p.id === botPlayerId);
    if (!player || player.hand.length === 0) return null;
    if (state.currentTrick.length > 0) {
      const leadSuit = state.currentTrick[0].suit;
      const suitCards = player.hand.filter(c => c.suit === leadSuit);
      if (suitCards.length > 0) return sortByRank(suitCards)[0];
    }
    return sortByRank(player.hand)[0];
  }

  // ── Read state (player-filtered) ─────────────────────────────────────────────

  async getPlayerState(gameId: string, token: string): Promise<GameState | null> {
    const entry = await this.loadGame(gameId);
    if (!entry) return null;
    const myPlayerId = entry.tokens.get(token) ?? null;
    return this.filterState(entry.state, myPlayerId);
  }

  async getGameState(gameId: string): Promise<GameState | null> {
    const entry = await this.loadGame(gameId);
    return entry?.state ?? null;
  }

  async getPlayerIdByToken(gameId: string, token: string): Promise<string | null> {
    const entry = await this.loadGame(gameId);
    return entry?.tokens.get(token) ?? null;
  }

  async isValidToken(gameId: string, token: string): Promise<boolean> {
    const entry = await this.loadGame(gameId);
    return entry?.tokens.has(token) ?? false;
  }

  async getLobbyInfo(gameId: string): Promise<{ playerCount: number; maxPlayers: number | null; phase: string } | null> {
    const entry = await this.loadGame(gameId);
    if (!entry) return null;
    return {
      playerCount: entry.state.players.length,
      maxPlayers: entry.state.maxPlayers,
      phase: entry.state.phase,
    };
  }

  // ── Pub/sub for SSE (in-process; clients reconnect after restart) ─────────────

  subscribe(gameId: string, token: string, cb: (state: GameState) => void): () => void {
    let set = this.subscribers.get(gameId);
    if (!set) { set = new Set(); this.subscribers.set(gameId, set); }

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
    let removed = 0;
    for (const [id, entry] of this.games) {
      if (now - entry.createdAt > maxAgeMs) {
        this.games.delete(id);
        this.subscribers.delete(id);
        this.redis?.del(redisKey(id)).catch(() => {});
        removed++;
      }
    }
    if (removed > 0) {
      log.info('game.cleanup', { detail: { removedCount: removed, maxAgeMs } });
    }
  }

  getActiveGamesSummary() {
    return Array.from(this.games.entries()).map(([gameId, entry]) => ({
      gameId,
      phase: entry.state.phase,
      playerCount: entry.state.players.length,
      maxPlayers: entry.state.maxPlayers,
      round: entry.state.round,
      createdAt: new Date(entry.createdAt).toISOString(),
    }));
  }

  // ── Private ──────────────────────────────────────────────────────────────────

  private notify(gameId: string) {
    const entry = this.games.get(gameId);
    if (!entry) return;
    const set = this.subscribers.get(gameId);
    if (set) set.forEach(cb => cb(entry.state));
  }

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
  var _cwGameStore: GameStore | undefined; // eslint-disable-line no-var
}
if (!globalThis._cwGameStore) {
  globalThis._cwGameStore = new GameStore();
  setInterval(() => globalThis._cwGameStore?.cleanupOldGames(), 60 * 60 * 1000);
}

export const gameStore = globalThis._cwGameStore;
