// ============================================================
// types/game.ts — Core domain types for Contract Whist
//
// Architecture note:
//   All game state flows from these types. GameState is the
//   single source of truth held in GameContext via useReducer.
//
// KAN-47: added trickLeaderIndex to correctly map trick winner
// KAN-41: Player.score removed — use GameState.scores instead
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;       // format: "player1", "player2", etc. — assigned sequentially on join
  name: string;
  hand: Card[];
  tricks: number;   // tricks won in the current round; reset to 0 each round
  bid: number | null; // null means this player hasn't bid yet this round
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;   // index into players[] for whose turn it is
  trickLeaderIndex: number;     // KAN-47: index of player who led the current trick
  trumpSuit: Suit | null;       // set from top of remaining deck after deal in START_ROUND
  deck: Card[];                 // remaining undealt cards (used only as trump source post-deal)
  currentTrick: Card[];         // cards played so far in the current trick, in play order
  round: number;                // starts at 1; game ends after all pyramid rounds
  // phase flow: setup → joining → bidding → playing → scoring → (bidding | finished)
  phase: 'setup' | 'joining' | 'bidding' | 'playing' | 'scoring' | 'finished';
  scores: Record<string, number>; // keyed by player.id; cumulative across rounds
  maxPlayers: number | null;    // set during SETUP_GAME; 2, 3, or 4
}
