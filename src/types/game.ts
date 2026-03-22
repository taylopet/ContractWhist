export type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type Rank = 'ace' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'jack' | 'queen' | 'king';

export interface Card {
  suit: Suit;
  rank: Rank;
}

export interface Player {
  id: string;
  name: string;
  hand: Card[];
  tricks: number;
  bid: number | null;
  score: number;
}

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  trumpSuit: Suit | null;
  deck: Card[];
  currentTrick: Card[];
  round: number;
  phase: 'setup' | 'bidding' | 'playing' | 'scoring' | 'finished';
  scores: Record<string, number>;
  maxPlayers: number | null;
}
