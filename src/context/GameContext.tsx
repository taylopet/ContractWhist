'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, Card, Suit } from '@/types/game';
import { createDeck, dealCards, isValidPlay, determineWinner, calculateScore } from '@/lib/gameUtils';

interface GameContextType {
  state: GameState;
  setupGame: (playerCount: number, playerName: string) => void;
  joinGame: (playerName: string) => void;
  placeBid: (playerId: string, bid: number) => void;
  playCard: (playerId: string, card: Card) => void;
}

const initialState: GameState = {
  players: [],
  currentPlayerIndex: 0,
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
  | { type: 'PLACE_BID'; payload: { playerId: string; bid: number } }
  | { type: 'PLAY_CARD'; payload: { playerId: string; card: Card } }
  | { type: 'START_ROUND' }
  | { type: 'END_TRICK' }
  | { type: 'END_ROUND' };

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SETUP_GAME':
      const setupDeck = createDeck();
      const firstPlayer: Player = {
        id: 'player1',
        name: action.payload.playerName,
        hand: [],
        tricks: 0,
        bid: null,
        score: 0,
      };
      return {
        ...state,
        players: [firstPlayer],
        deck: setupDeck,
        maxPlayers: action.payload.playerCount,
        phase: 'bidding',
      };

    case 'JOIN_GAME':
      if (state.maxPlayers === null) {
        throw new Error('Game not set up');
      }
      if (state.players.length >= state.maxPlayers) {
        throw new Error('Game is full');
      }
      const newPlayer: Player = {
        id: `player${state.players.length + 1}`,
        name: action.payload.name,
        hand: [],
        tricks: 0,
        bid: null,
        score: 0,
      };
      
      if (state.players.length === 0) {
        const deck = createDeck();
        return {
          ...state,
          players: [newPlayer],
          deck,
        };
      }
      
      return {
        ...state,
        players: [...state.players, newPlayer],
      };

    case 'PLACE_BID':
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
        currentPlayerIndex: allBidsPlaced ? 0 : (state.currentPlayerIndex + 1) % state.players.length,
      };

    case 'PLAY_CARD':
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
                c => c.suit !== action.payload.card.suit || c.rank !== action.payload.card.rank
              ),
            }
          : player
      );

      const updatedTrick = [...state.currentTrick, action.payload.card];
      
      if (updatedTrick.length === state.players.length) {
        const winnerIndex = determineWinner(updatedTrick, state.trumpSuit);
        const updatedPlayersWithTricks = updatedPlayers.map((player, index) =>
          index === winnerIndex
            ? { ...player, tricks: player.tricks + 1 }
            : player
        );

        const allCardsPlayed = updatedPlayersWithTricks.every(p => p.hand.length === 0);
        
        return {
          ...state,
          players: updatedPlayersWithTricks,
          currentTrick: [],
          currentPlayerIndex: winnerIndex,
          phase: allCardsPlayed ? 'scoring' : 'playing',
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      };

    case 'START_ROUND':
      const deck = createDeck();
      const cardsPerPlayer = Math.floor(52 / state.players.length);
      const { updatedPlayers: playersWithCards, remainingDeck } = dealCards(
        deck,
        state.players,
        cardsPerPlayer
      );

      return {
        ...state,
        players: playersWithCards.map(p => ({ ...p, tricks: 0, bid: null })),
        deck: remainingDeck,
        trumpSuit: remainingDeck[0]?.suit || null,
        currentTrick: [],
        currentPlayerIndex: 0,
        phase: 'bidding',
      };

    case 'END_ROUND':
      const updatedScores = { ...state.scores };
      state.players.forEach(player => {
        if (player.bid !== null) {
          const roundScore = calculateScore(player.bid, player.tricks);
          updatedScores[player.id] = (updatedScores[player.id] || 0) + roundScore;
        }
      });

      return {
        ...state,
        scores: updatedScores,
        round: state.round + 1,
        phase: state.round >= 13 ? 'finished' : 'bidding',
      };

    default:
      return state;
  }
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  const setupGame = (playerCount: number, playerName: string) => {
    dispatch({ type: 'SETUP_GAME', payload: { playerCount, playerName } });
  };

  const joinGame = (playerName: string) => {
    dispatch({ type: 'JOIN_GAME', payload: { name: playerName } });
  };

  const placeBid = (playerId: string, bid: number) => {
    dispatch({ type: 'PLACE_BID', payload: { playerId, bid } });
  };

  const playCard = (playerId: string, card: Card) => {
    dispatch({ type: 'PLAY_CARD', payload: { playerId, card } });
  };

  return (
    <GameContext.Provider value={{ state, setupGame, joinGame, placeBid, playCard }}>
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
