// ============================================================
// context/GameContext.tsx — Global game state via useReducer
//
// Architecture:
//   Single React context holds the entire GameState. All state
//   mutations go through gameReducer (pure function). Components
//   read state and dispatch actions via the useGame() hook.
//
// Action flow:
//   1. SETUP_GAME    → sets maxPlayers + first player, phase → 'bidding'
//                      NOTE: does not deal cards — START_ROUND should be
//                      dispatched after all players join, but currently
//                      isn't wired up in any component.
//   2. JOIN_GAME     → adds additional players up to maxPlayers.
//                      Not currently exposed in any UI component.
//   3. START_ROUND   → deals cards, sets trump, resets tricks/bids,
//                      phase → 'bidding'. Defined but never dispatched.
//   4. PLACE_BID     → records bid for a player; when all bids placed,
//                      phase → 'playing'.
//   5. PLAY_CARD     → removes card from hand, adds to trick; on trick
//                      complete, credits winner and either continues
//                      playing or transitions to 'scoring'.
//   6. END_ROUND     → calculates scores, increments round, phase →
//                      'bidding' or 'finished' (after round 13).
//
// Known gaps / TODOs:
//   - START_ROUND and END_ROUND are never dispatched from any component.
//     The game can reach 'scoring' phase but has no UI to trigger END_ROUND.
//   - END_TRICK action type is declared but has no case in the reducer.
//   - JOIN_GAME is exposed in context but no UI uses it — the game is
//     currently single-device (hot-seat) only.
//   - SETUP_GAME transitions to 'bidding' immediately without dealing cards.
//     Players will have empty hands until START_ROUND is dispatched.
//   - Player.score field is never updated; use GameState.scores for scores.
//   - winnerIndex from determineWinner() is an index into currentTrick[],
//     which maps to players[] only if play started from currentPlayerIndex.
//     This is assumed but not explicitly tracked — could break if lead
//     player tracking is added.
// ============================================================

'use client';

import { createContext, useContext, useReducer, ReactNode } from 'react';
import { GameState, Player, Card, Suit } from '@/types/game';
import { createDeck, dealCards, isValidPlay, determineWinner, calculateScore } from '@/lib/gameUtils';

// Public API exposed to components via useGame()
interface GameContextType {
  state: GameState;
  setupGame: (playerCount: number, playerName: string) => void;
  joinGame: (playerName: string) => void;   // TODO: not used by any UI yet
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
  | { type: 'START_ROUND' }   // deals cards + sets trump; must be dispatched to start play
  | { type: 'END_TRICK' }     // declared but NOT handled in reducer — currently a no-op
  | { type: 'END_ROUND' };    // scores the round; dispatched externally (no UI trigger yet)

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'SETUP_GAME':
      // Creates first player and shuffled deck. Does NOT deal cards.
      // Phase jumps to 'bidding' but hands are empty until START_ROUND fires.
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
      // Adds a player up to maxPlayers. Not triggered by any current UI.
      // Player ids are sequential: "player1", "player2", etc.
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

      // Once all players have bid, advance to playing phase starting at player 0.
      // TODO: should start with the player to dealer's left, not always player 0.
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

      // Remove played card from player's hand (matched by suit+rank)
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

      // Trick is complete when all players have played
      if (updatedTrick.length === state.players.length) {
        // winnerIndex is relative to updatedTrick[0], which was played by
        // whoever led the trick. We assume the trick leader is tracked via
        // currentPlayerIndex wrapping — this mapping may need revision if
        // a separate trickLeaderIndex is introduced.
        const winnerIndex = determineWinner(updatedTrick, state.trumpSuit);
        const updatedPlayersWithTricks = updatedPlayers.map((player, index) =>
          index === winnerIndex
            ? { ...player, tricks: player.tricks + 1 }
            : player
        );

        const allCardsPlayed = updatedPlayersWithTricks.every(p => p.hand.length === 0);

        // Trick winner leads next trick (currentPlayerIndex = winnerIndex)
        return {
          ...state,
          players: updatedPlayersWithTricks,
          currentTrick: [],
          currentPlayerIndex: winnerIndex,
          phase: allCardsPlayed ? 'scoring' : 'playing',
          // TODO: when phase becomes 'scoring', no component currently
          // dispatches END_ROUND to finalise scores and advance the round.
        };
      }

      return {
        ...state,
        players: updatedPlayers,
        currentTrick: updatedTrick,
        currentPlayerIndex: (state.currentPlayerIndex + 1) % state.players.length,
      };

    case 'START_ROUND':
      // Deals cards and sets trump from the top of the remaining deck.
      // cardsPerPlayer = floor(52/numPlayers) — same every round.
      // Real Contract Whist varies cards per round (e.g. 1,2,...,max,...,2,1).
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
        trumpSuit: remainingDeck[0]?.suit || null, // top of remaining deck determines trump
        currentTrick: [],
        currentPlayerIndex: 0,
        phase: 'bidding',
      };

    case 'END_ROUND':
      // Accumulates scores in GameState.scores (not Player.score).
      // Game ends after round 13; otherwise loops back to bidding.
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

// Must be used inside <GameProvider>. Throws if used outside.
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
