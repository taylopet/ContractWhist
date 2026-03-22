// ============================================================
// lib/gameUtils.ts — Pure game logic functions (no React)
//
// All functions here are stateless and side-effect free.
// They are called from GameContext's reducer.
//
// Known bugs / TODOs:
//   - dealCards() has a slicing bug: it uses player.id.length
//     (string length of the id, e.g. "player1".length = 7) as
//     the offset multiplier instead of the player's array index.
//     Cards are currently dealt incorrectly. Fix: use players.indexOf(player)
//     or refactor to deal sequentially.
//   - Real Contract Whist deals a different number of cards each
//     round (e.g. 1 card round 1, increasing to max then back down).
//     Currently cards-per-player is always floor(52/numPlayers).
//   - calculateScore uses a negative penalty for missing the bid.
//     Standard Contract Whist scores: hit = 10+bid, miss = -(diff).
//     The current formula returns 0 or negative which is correct,
//     but consider whether 0-bid contracts should score differently.
// ============================================================

import { Card, Suit, Rank, Player, GameState } from '@/types/game';

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

// BUG: uses player.id.length as offset multiplier instead of player index.
// e.g. "player1".length = 7, so player1 gets cards[7..14] not cards[0..7].
// This means the first ~7 cards of the deck are never dealt.
// Fix: replace player.id.length with the player's index in the array.
export const dealCards = (deck: Card[], players: Player[], cardsPerPlayer: number): { updatedPlayers: Player[], remainingDeck: Card[] } => {
  const updatedPlayers = players.map(player => ({
    ...player,
    hand: deck.slice(player.id.length * cardsPerPlayer, (player.id.length + 1) * cardsPerPlayer)
  }));

  return {
    updatedPlayers,
    remainingDeck: deck.slice(players.length * cardsPerPlayer)
  };
};

// Enforces follow-suit rule: if you have the lead suit, you must play it.
// If you have no lead suit cards, any card is valid (including trump).
// Note: does NOT enforce trump-suit restrictions — players can under-trump freely.
export const isValidPlay = (card: Card, hand: Card[], currentTrick: Card[], trumpSuit: Suit | null): boolean => {
  if (currentTrick.length === 0) return true; // leading the trick — any card valid

  const leadSuit = currentTrick[0].suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);

  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }

  return true;
};

// Returns the index within trick[] of the winning card.
// Trump beats non-trump; within the same suit, higher rank wins.
// Cards that neither match lead suit nor trump suit cannot win.
// Note: assumes trick[i] was played by players[currentTrickStartIndex + i],
// which is only valid if the trick start player is tracked separately.
export const determineWinner = (trick: Card[], trumpSuit: Suit | null): number => {
  if (trick.length === 0) return -1;

  const leadSuit = trick[0].suit;
  let winningCardIndex = 0;
  let highestRank = getRankValue(trick[0].rank);

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const cardRank = getRankValue(card.rank);

    // A trump card beats any non-trump card
    if (card.suit === trumpSuit && trick[winningCardIndex].suit !== trumpSuit) {
      winningCardIndex = i;
      highestRank = cardRank;
    } else if (card.suit === trick[winningCardIndex].suit && cardRank > highestRank) {
      // Same suit as current winner — higher rank wins
      winningCardIndex = i;
      highestRank = cardRank;
    }
    // Cards that don't match lead suit or trump are ignored
  }

  return winningCardIndex;
};

// Rank order: ace high (14), king (13) ... 2 (2).
const getRankValue = (rank: Rank): number => {
  const rankValues: Record<Rank, number> = {
    'ace': 14,
    'king': 13,
    'queen': 12,
    'jack': 11,
    '10': 10,
    '9': 9,
    '8': 8,
    '7': 7,
    '6': 6,
    '5': 5,
    '4': 4,
    '3': 3,
    '2': 2
  };
  return rankValues[rank];
};

// Scoring: exact bid = 10 + bid points; any miss = negative difference.
// e.g. bid 3, won 3 → +13; bid 3, won 1 → -2; bid 0, won 0 → +10.
export const calculateScore = (bid: number, tricks: number): number => {
  if (bid === tricks) {
    return 10 + bid;
  }
  return Math.abs(bid - tricks) * -1;
};
