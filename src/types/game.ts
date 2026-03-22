// ============================================================
// types/game.ts — Core domain types for Contract Whist
//
// Architecture note:
//   All game state flows from these types. GameState is the
//   single source of truth held in GameContext via useReducer.
//
// Known gaps / TODOs:
//   - Player.score is never updated (only GameState.scores is
//     updated in END_ROUND). Either remove Player.score or wire
//     it up in the reducer.
//   - currentTrick holds Card[] but doesn't track which player
//     played which card, so determining the trick winner relies
//     on play order matching currentTrick index — this breaks
//     if we ever need to display "who played what".
//   - GameState has no concept of dealer or lead player for a
//     round; needed for proper Contract Whist rotation.
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';

export interface Card {
  suit: Suit;
  rank: Rank;
}

// Player.score mirrors GameState.scores[player.id] but is never
// synced — use GameState.scores as the authoritative score store.
export interface Player {
  id: string;       // format: "player1", "player2", etc. — assigned sequentially on join
  name: string;
  hand: Card[];
  tricks: number;   // tricks won in the current round; reset to 0 each round
  bid: number | null; // null means this player hasn't bid yet this round
  score: number;    // WARNING: not updated by reducer — see GameState.scores instead
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number; // index into players[] for whose turn it is
  trumpSuit: Suit | null;     // set from top of remaining deck after deal in START_ROUND
  deck: Card[];               // remaining undealt cards (used only as trump source post-deal)
  currentTrick: Card[];       // cards played so far in the current trick, in play order
  round: number;              // starts at 1; game ends after round 13 (see END_ROUND)
  // phase flow: setup → bidding → playing → scoring → (bidding | finished)
  phase: 'setup' | 'bidding' | 'playing' | 'scoring' | 'finished';
  scores: Record<string, number>; // keyed by player.id; cumulative across rounds
  maxPlayers: number | null;  // set during SETUP_GAME; 2, 3, or 4
}
