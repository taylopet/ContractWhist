// ============================================================
// types/game.ts — Core domain types for Contract Whist
//
// KAN-47: added trickLeaderIndex
// KAN-41: Player.score removed — use GameState.scores
// KAN-65: trickCompleted + trickWinnerIndex for reveal delay
// KAN-66: RoundModifier, RoundConfig, roundSchedule, handRevealed
// KAN-69: gameId, joinCode, myPlayerId for multi-device play
// ============================================================

export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;       // "player1", "player2", etc. — assigned on join
  name: string;
  hand: Card[];     // empty for remote opponents (server hides their cards)
  tricks: number;   // tricks won this round; reset each round
  bid: number | null;
}

// KAN-66: per-round game modifier
export type RoundModifier = 'normal' | 'no-trumps' | 'half-blind' | 'blind';

export interface RoundConfig {
  cardCount: number;
  modifier: RoundModifier;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;   // whose turn it is
  trickLeaderIndex: number;     // KAN-47: who led the current trick
  trumpSuit: Suit | null;
  deck: Card[];
  currentTrick: Card[];
  round: number;                // 1-based; indexes into roundSchedule
  // phase flow: setup → joining → bidding → playing → scoring → (bidding | finished)
  phase: 'setup' | 'joining' | 'bidding' | 'playing' | 'scoring' | 'finished';
  scores: Record<string, number>;
  maxPlayers: number | null;

  // KAN-65: trick reveal — true while completed trick is displayed before clearing
  trickCompleted: boolean;
  trickWinnerIndex: number;     // valid while trickCompleted is true

  // KAN-66: round schedule set at game creation
  roundSchedule: RoundConfig[];
  handRevealed: boolean;        // false during bidding for half-blind/blind rounds

  // KAN-69: multi-device fields (null in local/hot-seat mode)
  gameId: string | null;
  joinCode: string | null;
  myPlayerId: string | null;    // identifies the local player's slot
}
