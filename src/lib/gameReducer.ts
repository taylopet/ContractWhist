// ============================================================
// lib/gameReducer.ts — Pure game reducer (no React, importable server-side)
//
// Extracted from GameContext so the server-side gameStore can
// reuse the same logic without importing 'use client' modules.
//
// KAN-65: PLAY_CARD sets trickCompleted=true; ADVANCE_AFTER_TRICK clears it
// KAN-66: START_ROUND uses roundSchedule; handRevealed set per modifier
// KAN-69: initialState includes gameId / joinCode / myPlayerId fields
// ============================================================

import { GameState, Player, Card, RoundConfig, RoundResult } from '@/types/game';
import {
  createDeck,
  dealCards,
  isValidPlay,
  determineWinner,
  calculateScore,
  buildRoundSchedule,
  getCardsForRound,
} from './gameUtils';

export type GameAction =
  | { type: 'SETUP_GAME'; payload: { playerCount: number; playerName: string; roundSchedule?: RoundConfig[] } }
  | { type: 'JOIN_GAME'; payload: { name: string } }
  | { type: 'ADD_BOT'; payload: { name: string } }   // KAN-77: add AI player
  | { type: 'START_ROUND' }
  | { type: 'PLACE_BID'; payload: { playerId: string; bid: number } }
  | { type: 'PLAY_CARD'; payload: { playerId: string; card: Card } }
  | { type: 'ADVANCE_AFTER_TRICK' }   // KAN-65: dispatched after reveal delay
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' }
  // KAN-69: multi-device — set server-assigned identity fields
  | { type: 'SET_IDENTITY'; payload: { gameId: string; joinCode: string; myPlayerId: string } };

export const initialState: GameState = {
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
  trickCompleted: false,    // KAN-65
  trickWinnerIndex: 0,      // KAN-65
  roundSchedule: buildRoundSchedule(7), // KAN-66: default 7-card pyramid
  handRevealed: true,       // KAN-66: false only during blind/half-blind bidding
  roundHistory: [],         // KAN-75: completed round results for scoresheet
  gameId: null,             // KAN-69
  joinCode: null,           // KAN-69
  myPlayerId: null,         // KAN-69
};

export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {

    case 'SETUP_GAME': {
      const firstPlayer: Player = {
        id: 'player1',
        name: action.payload.playerName,
        hand: [],
        tricks: 0,
        bid: null,
      };
      const roundSchedule = action.payload.roundSchedule ?? buildRoundSchedule(7);
      return {
        ...initialState,
        players: [firstPlayer],
        maxPlayers: action.payload.playerCount,
        roundSchedule,
        phase: action.payload.playerCount === 1 ? 'bidding' : 'joining',
        // KAN-82: preserve gameId/joinCode when re-configuring an existing
        // server-side game (e.g. Play Again). gameStore.createGame() assigns
        // these itself for brand-new games, so this is a no-op there.
        gameId: state.gameId,
        joinCode: state.joinCode,
      };
    }

    case 'JOIN_GAME': {
      if (state.phase !== 'joining') return state;
      if (state.maxPlayers === null || state.players.length >= state.maxPlayers) return state;
      const newPlayer: Player = {
        id: `player${state.players.length + 1}`,
        name: action.payload.name,
        hand: [],
        tricks: 0,
        bid: null,
      };
      return {
        ...state,
        players: [...state.players, newPlayer],
        phase: 'joining',
      };
    }

    case 'ADD_BOT': {
      if (state.phase !== 'joining') return state;
      if (state.maxPlayers === null || state.players.length >= state.maxPlayers) return state;
      const botPlayer: Player = {
        id: `player${state.players.length + 1}`,
        name: action.payload.name,
        hand: [],
        tricks: 0,
        bid: null,
        isBot: true,
      };
      return {
        ...state,
        players: [...state.players, botPlayer],
        phase: 'joining',
      };
    }

    case 'START_ROUND': {
      // KAN-79: idempotency — only deal when we're in a valid pre-deal state
      const isInitialStart = state.phase === 'joining';
      const isNextRound = state.phase === 'bidding' && state.players.every(p => p.hand.length === 0);
      if (!isInitialStart && !isNextRound) return state;

      // KAN-66: use roundSchedule when available, else fall back to pyramid formula
      const scheduleIndex = state.round - 1;
      const roundConfig = state.roundSchedule?.[scheduleIndex];
      const cardsPerPlayer = roundConfig?.cardCount ?? getCardsForRound(state.round, state.players.length);
      const modifier = roundConfig?.modifier ?? 'normal';

      const deck = createDeck();
      const { updatedPlayers: playersWithCards, remainingDeck } = dealCards(
        deck, state.players, cardsPerPlayer
      );

      // No-Trumps = null trump; use pre-assigned suit if set, else top of remaining deck
      const trumpSuit = modifier === 'no-trumps'
        ? null
        : (roundConfig?.trumpSuit !== undefined ? roundConfig.trumpSuit : remainingDeck[0]?.suit ?? null);

      // KAN-66: hand is hidden during bidding for blind/half-blind
      const handRevealed = modifier !== 'blind' && modifier !== 'half-blind';

      // Deal/lead rotates each round so the same player doesn't always start
      const startingPlayerIndex = (state.round - 1) % state.players.length;

      return {
        ...state,
        players: playersWithCards.map(p => ({ ...p, tricks: 0, bid: null })),
        deck: remainingDeck,
        trumpSuit,
        currentTrick: [],
        currentPlayerIndex: startingPlayerIndex,
        trickLeaderIndex: startingPlayerIndex,
        trickCompleted: false,
        handRevealed,
        phase: 'bidding',
      };
    }

    case 'PLACE_BID': {
      if (state.phase !== 'bidding') return state;

      // KAN-71: last-bidder constraint — dealer cannot bid the "bust" value
      const othersHaveBid = state.players
        .filter(p => p.id !== action.payload.playerId)
        .every(p => p.bid !== null);
      if (othersHaveBid) {
        const cardsDealt = state.players[state.currentPlayerIndex].hand.length;
        const sumOtherBids = state.players
          .filter(p => p.id !== action.payload.playerId)
          .reduce((sum, p) => sum + (p.bid ?? 0), 0);
        const forbidden = cardsDealt - sumOtherBids;
        if (action.payload.bid === forbidden) return state; // reject bust bid
      }

      const updatedPlayers = state.players.map(p =>
        p.id === action.payload.playerId ? { ...p, bid: action.payload.bid } : p
      );
      const allBid = updatedPlayers.every(p => p.bid !== null);
      return {
        ...state,
        players: updatedPlayers,
        // KAN-66: reveal hand when bidding ends (for half-blind/blind rounds)
        handRevealed: allBid ? true : state.handRevealed,
        phase: allBid ? 'playing' : 'bidding',
        currentPlayerIndex: allBid ? 0 : (state.currentPlayerIndex + 1) % state.players.length,
      };
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state;
      if (state.trickCompleted) return state; // wait for ADVANCE_AFTER_TRICK

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.id !== action.payload.playerId) return state;
      if (!isValidPlay(action.payload.card, currentPlayer.hand, state.currentTrick, state.trumpSuit)) {
        return state;
      }

      const updatedPlayers = state.players.map(p =>
        p.id === action.payload.playerId
          ? { ...p, hand: p.hand.filter(c => !(c.suit === action.payload.card.suit && c.rank === action.payload.card.rank)) }
          : p
      );
      const updatedTrick = [...state.currentTrick, action.payload.card];

      if (updatedTrick.length === state.players.length) {
        // Trick complete — determine winner but DON'T clear yet (KAN-65: reveal delay)
        const trickWinnerOffset = determineWinner(updatedTrick, state.trumpSuit);
        const actualWinnerIndex = (state.trickLeaderIndex + trickWinnerOffset) % state.players.length;

        const playersWithTricks = updatedPlayers.map((p, i) =>
          i === actualWinnerIndex ? { ...p, tricks: p.tricks + 1 } : p
        );

        return {
          ...state,
          players: playersWithTricks,
          currentTrick: updatedTrick, // KAN-65: keep trick visible
          trickCompleted: true,       // KAN-65: signal UI to start reveal timer
          trickWinnerIndex: actualWinnerIndex,
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      };
    }

    case 'ADVANCE_AFTER_TRICK': {
      // KAN-65: called after reveal delay — clear trick and advance play
      if (!state.trickCompleted) return state;
      const allCardsPlayed = state.players.every(p => p.hand.length === 0);
      return {
        ...state,
        currentTrick: [],
        trickCompleted: false,
        currentPlayerIndex: state.trickWinnerIndex,
        trickLeaderIndex: state.trickWinnerIndex,
        phase: allCardsPlayed ? 'scoring' : 'playing',
      };
    }

    case 'END_ROUND': {
      if (state.phase !== 'scoring') return state; // KAN-79: guard against double-dispatch
      const updatedScores = { ...state.scores };
      state.players.forEach(p => {
        if (p.bid !== null) {
          updatedScores[p.id] = (updatedScores[p.id] ?? 0) + calculateScore(p.bid, p.tricks);
        }
      });

      // KAN-75: record this round's results for the scoresheet
      const roundResult: RoundResult = {
        roundIndex: state.round - 1,
        trumpSuit: state.trumpSuit,
        perPlayer: Object.fromEntries(
          state.players.map(p => [
            p.id,
            {
              bid: p.bid ?? 0,
              tricks: p.tricks,
              score: p.bid !== null ? calculateScore(p.bid, p.tricks) : 0,
            },
          ])
        ),
      };

      const nextRound = state.round + 1;
      // KAN-66: use schedule length if populated, else fall back to pyramid formula
      const scheduleLen = state.roundSchedule?.length ?? 0;
      const totalRounds = scheduleLen > 0
        ? scheduleLen
        : 2 * Math.floor(52 / state.players.length) - 1;

      return {
        ...state,
        scores: updatedScores,
        roundHistory: [...state.roundHistory, roundResult],
        round: nextRound,
        phase: nextRound > totalRounds ? 'finished' : 'bidding',
        players: state.players.map(p => ({ ...p, tricks: 0, bid: null, hand: [] })),
        currentTrick: [],
        currentPlayerIndex: 0,
        trickLeaderIndex: 0,
        trickCompleted: false,
      };
    }

    case 'RESET_GAME':
      return { ...initialState, gameId: state.gameId, joinCode: null, myPlayerId: null };

    case 'SET_IDENTITY':
      return {
        ...state,
        gameId: action.payload.gameId,
        joinCode: action.payload.joinCode,
        myPlayerId: action.payload.myPlayerId,
      };

    default:
      return state;
  }
};
