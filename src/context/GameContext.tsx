// ============================================================
// context/GameContext.tsx — Global game state via useReducer
//
// KAN-38: dealCards() fix applied (via gameUtils)
// KAN-39: startRound() exposed; START_ROUND wired up
// KAN-40: endRound() exposed; END_ROUND wired up
// KAN-43: removed unused END_TRICK action type
// KAN-44: getCardsForRound() used in START_ROUND
// KAN-45: resetGame() / RESET_GAME added
// KAN-47: trickLeaderIndex tracks who led the trick for correct winner mapping
// KAN-42: 'joining' phase added for hot-seat multi-player flow
//
// Phase flow:
//   setup → joining → bidding → playing → scoring → (bidding | finished)
//   (joining phase collects additional player names before dealing)
// ============================================================

'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, Card } from '@/types/game';
import {
  createDeck,
  dealCards,
  isValidPlay,
  determineWinner,
  calculateScore,
  getCardsForRound,
} from '@/lib/gameUtils';

interface GameContextType {
  state: GameState;
  setupGame: (playerCount: number, playerName: string) => void;
  joinGame: (playerName: string) => void;
  startRound: () => void;   // KAN-39: deal cards and begin a round
  placeBid: (playerId: string, bid: number) => void;
  playCard: (playerId: string, card: Card) => void;
  endRound: () => void;     // KAN-40: score the round and advance
  resetGame: () => void;    // KAN-45: reset to initial state
}

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  trickLeaderIndex: 0,      // KAN-47
  trumpSuit: null,
  deck: [],
  currentTrick: [],
  round: 1,
  phase: 'setup',
  scores: {},
  maxPlayers: null,
};

type GameAction =
  | { type: 'SETUP_GAME'; payload: { playerCount: number; playerName: string } }
  | { type: 'JOIN_GAME'; payload: { name: string } }
  | { type: 'START_ROUND' }
  | { type: 'PLACE_BID'; payload: { playerId: string; bid: number } }
  | { type: 'PLAY_CARD'; payload: { playerId: string; card: Card } }
  | { type: 'END_ROUND' }
  | { type: 'RESET_GAME' };   // KAN-45

// Exported for direct testing (KAN-54, KAN-55, KAN-56)
export const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {

    case 'SETUP_GAME': {
      // Creates first player, sets maxPlayers, moves to 'joining' phase
      // KAN-42: if maxPlayers > 1, go to 'joining' so others can enter names
      const firstPlayer: Player = {
        id: 'player1',
        name: action.payload.playerName,
        hand: [],
        tricks: 0,
        bid: null,
      };
      return {
        ...initialState,
        players: [firstPlayer],
        maxPlayers: action.payload.playerCount,
        // KAN-42: single player goes straight to dealing; multi waits in joining
        phase: action.payload.playerCount === 1 ? 'bidding' : 'joining',
      };
    }

    case 'JOIN_GAME': {
      // KAN-42: adds player during 'joining' phase
      if (state.phase !== 'joining') return state;
      if (state.maxPlayers === null || state.players.length >= state.maxPlayers) return state;

      const newPlayer: Player = {
        id: `player${state.players.length + 1}`,
        name: action.payload.name,
        hand: [],
        tricks: 0,
        bid: null,
      };
      const updatedPlayers = [...state.players, newPlayer];
      const allJoined = updatedPlayers.length === state.maxPlayers;

      return {
        ...state,
        players: updatedPlayers,
        // KAN-42: when all players joined, stay in joining — GameBoard triggers START_ROUND
        phase: allJoined ? 'joining' : 'joining',
      };
    }

    case 'START_ROUND': {
      // KAN-39: deal cards and set trump; resets tricks/bids for all players
      // KAN-44: use pyramid card count for the current round
      const deck = createDeck();
      const cardsPerPlayer = getCardsForRound(state.round, state.players.length);
      const { updatedPlayers: playersWithCards, remainingDeck } = dealCards(
        deck,
        state.players,
        cardsPerPlayer
      );

      return {
        ...state,
        players: playersWithCards.map(p => ({ ...p, tricks: 0, bid: null })),
        deck: remainingDeck,
        trumpSuit: remainingDeck[0]?.suit ?? null, // top of remaining deck = trump
        currentTrick: [],
        currentPlayerIndex: 0,
        trickLeaderIndex: 0,  // KAN-47
        phase: 'bidding',
      };
    }

    case 'PLACE_BID': {
      if (state.phase !== 'bidding') return state;

      const updatedPlayersWithBid = state.players.map(player =>
        player.id === action.payload.playerId
          ? { ...player, bid: action.payload.bid }
          : player
      );
      const allBidsPlaced = updatedPlayersWithBid.every(p => p.bid !== null);

      return {
        ...state,
        players: updatedPlayersWithBid,
        phase: allBidsPlaced ? 'playing' : 'bidding',
        currentPlayerIndex: allBidsPlaced
          ? 0
          : (state.currentPlayerIndex + 1) % state.players.length,
      };
    }

    case 'PLAY_CARD': {
      if (state.phase !== 'playing') return state;

      const currentPlayer = state.players[state.currentPlayerIndex];
      if (currentPlayer.id !== action.payload.playerId) return state;

      if (!isValidPlay(
        action.payload.card,
        currentPlayer.hand,
        state.currentTrick,
        state.trumpSuit
      )) {
        return state;
      }

      const updatedPlayers = state.players.map(player =>
        player.id === action.payload.playerId
          ? {
              ...player,
              hand: player.hand.filter(
                c => !(c.suit === action.payload.card.suit && c.rank === action.payload.card.rank)
              ),
            }
          : player
      );

      const updatedTrick = [...state.currentTrick, action.payload.card];

      if (updatedTrick.length === state.players.length) {
        // Trick complete — determine winner
        const trickWinnerOffset = determineWinner(updatedTrick, state.trumpSuit);
        // KAN-47: map offset back to absolute player index via trickLeaderIndex
        const actualWinnerIndex =
          (state.trickLeaderIndex + trickWinnerOffset) % state.players.length;

        const updatedPlayersWithTricks = updatedPlayers.map((player, index) =>
          index === actualWinnerIndex
            ? { ...player, tricks: player.tricks + 1 }
            : player
        );

        const allCardsPlayed = updatedPlayersWithTricks.every(p => p.hand.length === 0);

        return {
          ...state,
          players: updatedPlayersWithTricks,
          currentTrick: [],
          currentPlayerIndex: actualWinnerIndex,
          trickLeaderIndex: actualWinnerIndex, // KAN-47: winner leads next trick
          phase: allCardsPlayed ? 'scoring' : 'playing',
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      };
    }

    case 'END_ROUND': {
      // KAN-40: accumulate scores and advance to next round or finish
      const updatedScores = { ...state.scores };
      state.players.forEach(player => {
        if (player.bid !== null) {
          const roundScore = calculateScore(player.bid, player.tricks);
          updatedScores[player.id] = (updatedScores[player.id] ?? 0) + roundScore;
        }
      });

      const nextRound = state.round + 1;
      const totalRounds = 2 * Math.floor(52 / state.players.length) - 1; // KAN-44: pyramid length

      return {
        ...state,
        scores: updatedScores,
        round: nextRound,
        phase: nextRound > totalRounds ? 'finished' : 'bidding',
        players: state.players.map(p => ({ ...p, tricks: 0, bid: null })),
        currentTrick: [],
        currentPlayerIndex: 0,
        trickLeaderIndex: 0,
      };
    }

    case 'RESET_GAME': // KAN-45
      return initialState;

    default:
      return state;
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setupGame = (playerCount: number, playerName: string) =>
    dispatch({ type: 'SETUP_GAME', payload: { playerCount, playerName } });

  const joinGame = (playerName: string) =>
    dispatch({ type: 'JOIN_GAME', payload: { name: playerName } });

  const startRound = () => dispatch({ type: 'START_ROUND' }); // KAN-39

  const placeBid = (playerId: string, bid: number) =>
    dispatch({ type: 'PLACE_BID', payload: { playerId, bid } });

  const playCard = (playerId: string, card: Card) =>
    dispatch({ type: 'PLAY_CARD', payload: { playerId, card } });

  const endRound = () => dispatch({ type: 'END_ROUND' }); // KAN-40

  const resetGame = () => dispatch({ type: 'RESET_GAME' }); // KAN-45

  return (
    <GameContext.Provider
      value={{ state, setupGame, joinGame, startRound, placeBid, playCard, endRound, resetGame }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
