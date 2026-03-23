// ============================================================
// lib/gameUtils.ts — Pure game logic (no React, no side effects)
//
// KAN-38: dealCards() fixed — use index not player.id.length
// KAN-44: getCardsForRound() pyramid schedule
// KAN-66: buildRoundSchedule(), applyStandardModifiers()
//         determineWinner updated for 'no-trumps' rounds
// ============================================================

import { Card, Suit, Rank, Player, RoundConfig, RoundModifier } from '@/types/game';

// ── Deck ──────────────────────────────────────────────────────────────────────

export const createDeck = (): Card[] => {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const ranks: Rank[] = ['ace', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'jack', 'queen', 'king'];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push({ suit, rank });
    }
  }
  return shuffleDeck(deck);
};

export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// KAN-38: use array index, not player.id.length
export const dealCards = (
  deck: Card[],
  players: Player[],
  cardsPerPlayer: number
): { updatedPlayers: Player[]; remainingDeck: Card[] } => {
  const updatedPlayers = players.map((player, index) => ({
    ...player,
    hand: deck.slice(index * cardsPerPlayer, (index + 1) * cardsPerPlayer),
  }));
  return {
    updatedPlayers,
    remainingDeck: deck.slice(players.length * cardsPerPlayer),
  };
};

// KAN-44: pyramid card count for a given round index (1-based)
export const getCardsForRound = (round: number, playerCount: number): number => {
  const maxCards = Math.floor(52 / playerCount);
  if (round <= maxCards) return round;
  return Math.max(1, 2 * maxCards - round);
};

// ── KAN-66: Round schedule ────────────────────────────────────────────────────

/**
 * Build a pyramid schedule: peak → 1 → peak (e.g. 7,6,5,4,3,2,1,2,3,4,5,6,7).
 * All rounds default to 'normal' modifier; caller can apply modifiers on top.
 */
export const buildRoundSchedule = (peak: number): RoundConfig[] => {
  const down = Array.from({ length: peak }, (_, i) => peak - i);     // peak..1
  const up   = Array.from({ length: peak - 1 }, (_, i) => i + 2);   // 2..peak
  return [...down, ...up].map(cardCount => ({ cardCount, modifier: 'normal' as RoundModifier }));
};

/**
 * Apply the "Standard" modifier pattern to a schedule.
 * Pattern (mirrored): Normal, No-Trumps, Normal, Half-Blind, Normal, No-Trumps, Blind
 * For peak=7: rounds 0-12 → N, NT, N, HB, N, NT, B, NT, N, HB, N, NT, N
 */
export const applyStandardModifiers = (schedule: RoundConfig[]): RoundConfig[] => {
  const pattern: RoundModifier[] = ['normal', 'no-trumps', 'normal', 'half-blind', 'normal', 'no-trumps', 'blind'];
  // Build mirror pattern matching schedule length
  const half = Math.ceil(schedule.length / 2);
  const modifiers: RoundModifier[] = [];
  for (let i = 0; i < half; i++) {
    modifiers.push(pattern[i % pattern.length]);
  }
  // Mirror second half
  const second = [...modifiers].reverse().slice(schedule.length % 2 === 0 ? 0 : 1);
  const allModifiers = [...modifiers, ...second];

  return schedule.map((r, i) => ({ ...r, modifier: allModifiers[i] ?? 'normal' }));
};

// ── Rank ──────────────────────────────────────────────────────────────────────

export const getRankValue = (rank: Rank): number => {
  const rankValues: Record<Rank, number> = {
    ace: 14, king: 13, queen: 12, jack: 11,
    '10': 10, '9': 9, '8': 8, '7': 7,
    '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
  };
  return rankValues[rank];
};

// ── Game rules ────────────────────────────────────────────────────────────────

// Follow-suit: if you hold the lead suit you must play it.
// KAN-66: trumpSuit=null means no-trumps round; rule is the same (follow led suit).
export const isValidPlay = (
  card: Card,
  hand: Card[],
  currentTrick: Card[],
  trumpSuit: Suit | null
): boolean => {
  if (currentTrick.length === 0) return true;
  const leadSuit = currentTrick[0].suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  if (hasLeadSuit) return card.suit === leadSuit;
  return true;
};

/**
 * Returns the index within trick[] of the winning card.
 * KAN-66: trumpSuit=null (no-trumps) — highest card of led suit wins.
 * KAN-47: caller maps this index to a player via trickLeaderIndex.
 */
export const determineWinner = (trick: Card[], trumpSuit: Suit | null): number => {
  if (trick.length === 0) return -1;
  const ledSuit = trick[0].suit;
  let winningIdx = 0;
  let highestRank = getRankValue(trick[0].rank);

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const cardRank = getRankValue(card.rank);
    const winner = trick[winningIdx];

    if (trumpSuit !== null) {
      // Normal/half-blind/blind: trump beats non-trump
      if (card.suit === trumpSuit && winner.suit !== trumpSuit) {
        winningIdx = i; highestRank = cardRank;
      } else if (card.suit === winner.suit && cardRank > highestRank) {
        winningIdx = i; highestRank = cardRank;
      }
    } else {
      // No-trumps: only led suit can win; higher rank of led suit beats
      if (card.suit === ledSuit && winner.suit !== ledSuit) {
        winningIdx = i; highestRank = cardRank;
      } else if (card.suit === winner.suit && cardRank > highestRank) {
        winningIdx = i; highestRank = cardRank;
      }
    }
  }

  return winningIdx;
};

// Scoring: exact bid = 10 + bid; any miss = -(abs difference)
export const calculateScore = (bid: number, tricks: number): number => {
  if (bid === tricks) return 10 + bid;
  return -Math.abs(bid - tricks);
};
