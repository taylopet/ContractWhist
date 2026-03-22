// ============================================================
// lib/gameUtils.ts — Pure game logic functions (no React)
//
// All functions here are stateless and side-effect free.
// They are called from GameContext's reducer.
//
// KAN-38: fixed dealCards() — was using player.id.length instead of index
// KAN-44: added getCardsForRound() for pyramid card counts
// ============================================================

import { Card, Suit, Rank, Player } from '@/types/game';

// Creates a full 52-card deck, then shuffles it.
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

// Fisher-Yates shuffle — mutates a copy, returns shuffled deck.
export const shuffleDeck = (deck: Card[]): Card[] => {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

// KAN-38: fixed — use array index (not player.id.length) to slice deck
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

// KAN-44: pyramid card schedule — 1,2,...,max,...,2,1 across rounds
// For 4 players: max = 13, rounds 1-13; for 3 players: max = 17, etc.
export const getCardsForRound = (round: number, playerCount: number): number => {
  const maxCards = Math.floor(52 / playerCount);
  // Pyramid: go up to maxCards then back down to 1
  // Total rounds = 2 * maxCards - 1
  if (round <= maxCards) return round;
  return Math.max(1, 2 * maxCards - round);
};

// Exported for use in tests (KAN-52)
export const getRankValue = (rank: Rank): number => {
  const rankValues: Record<Rank, number> = {
    ace: 14, king: 13, queen: 12, jack: 11,
    '10': 10, '9': 9, '8': 8, '7': 7,
    '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
  };
  return rankValues[rank];
};

// Enforces follow-suit rule: if you have the lead suit, you must play it.
// If void in lead suit, any card is valid.
export const isValidPlay = (
  card: Card,
  hand: Card[],
  currentTrick: Card[],
  trumpSuit: Suit | null
): boolean => {
  if (currentTrick.length === 0) return true;

  const leadSuit = currentTrick[0].suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  return true;
};

// Returns the index within trick[] of the winning card.
// Trump beats non-trump; within same suit, higher rank wins.
// KAN-47: caller maps this index back to a player via trickLeaderIndex
export const determineWinner = (trick: Card[], trumpSuit: Suit | null): number => {
  if (trick.length === 0) return -1;

  let winningCardIndex = 0;
  let highestRank = getRankValue(trick[0].rank);

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const cardRank = getRankValue(card.rank);

    if (card.suit === trumpSuit && trick[winningCardIndex].suit !== trumpSuit) {
      // Trump beats non-trump
      winningCardIndex = i;
      highestRank = cardRank;
    } else if (card.suit === trick[winningCardIndex].suit && cardRank > highestRank) {
      // Higher card of same suit wins
      winningCardIndex = i;
      highestRank = cardRank;
    }
  }

  return winningCardIndex;
};

// Scoring: exact bid = 10 + bid; any miss = -(abs difference)
// e.g. bid 3 win 3 → +13; bid 3 win 1 → -2; bid 0 win 0 → +10
export const calculateScore = (bid: number, tricks: number): number => {
  if (bid === tricks) {
    return 10 + bid;
  }
  return -Math.abs(bid - tricks);
};
