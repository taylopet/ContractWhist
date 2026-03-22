import { Card, Suit, Rank, Player, GameState } from '@/types/game';

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

export const isValidPlay = (card: Card, hand: Card[], currentTrick: Card[], trumpSuit: Suit | null): boolean => {
  if (currentTrick.length === 0) return true;
  
  const leadSuit = currentTrick[0].suit;
  const hasLeadSuit = hand.some(c => c.suit === leadSuit);
  
  if (hasLeadSuit) {
    return card.suit === leadSuit;
  }
  
  return true;
};

export const determineWinner = (trick: Card[], trumpSuit: Suit | null): number => {
  if (trick.length === 0) return -1;

  const leadSuit = trick[0].suit;
  let winningCardIndex = 0;
  let highestRank = getRankValue(trick[0].rank);

  for (let i = 1; i < trick.length; i++) {
    const card = trick[i];
    const cardRank = getRankValue(card.rank);

    if (card.suit === trumpSuit && trick[winningCardIndex].suit !== trumpSuit) {
      winningCardIndex = i;
      highestRank = cardRank;
    } else if (card.suit === trick[winningCardIndex].suit && cardRank > highestRank) {
      winningCardIndex = i;
      highestRank = cardRank;
    }
  }

  return winningCardIndex;
};

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

export const calculateScore = (bid: number, tricks: number): number => {
  if (bid === tricks) {
    return 10 + bid;
  }
  return Math.abs(bid - tricks) * -1;
};
