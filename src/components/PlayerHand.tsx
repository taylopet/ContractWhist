// ============================================================
// components/PlayerHand.tsx — Current player's hand of cards
//
// KAN-46: cards sorted by suit (spades→hearts→diamonds→clubs)
//         then by rank descending (Ace high) before rendering
// ============================================================

import React from 'react';
import { Card as CardType, Rank } from '@/types/game';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  onCardPlay: (card: CardType) => void;
  isCurrentPlayer: boolean;
  canPlayCard: (card: CardType) => boolean;
}

// KAN-46: sort order — alternating colours: spades, hearts, diamonds, clubs
const SUIT_ORDER: Record<string, number> = {
  spades: 0,
  hearts: 1,
  diamonds: 2,
  clubs: 3,
};

const RANK_VALUES: Record<Rank, number> = {
  ace: 14, king: 13, queen: 12, jack: 11,
  '10': 10, '9': 9, '8': 8, '7': 7,
  '6': 6, '5': 5, '4': 4, '3': 3, '2': 2,
};

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  onCardPlay,
  isCurrentPlayer,
  canPlayCard,
}) => {
  // KAN-46: sort by suit then rank descending
  const sortedCards = [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });

  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-100 to-transparent">
      <div className="flex justify-center gap-2 overflow-x-auto pb-4">
        {sortedCards.map((card, index) => (
          <div
            key={`${card.suit}-${card.rank}`}
            className="transform hover:-translate-y-4 transition-transform duration-200"
            style={{ marginLeft: index > 0 ? '-2rem' : '0', zIndex: index }}
          >
            <Card
              card={card}
              onClick={() => onCardPlay(card)}
              disabled={!isCurrentPlayer || !canPlayCard(card)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlayerHand;
