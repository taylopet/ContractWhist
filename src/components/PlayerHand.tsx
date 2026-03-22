// KAN-10/35/46: Player's hand — sorted by suit/rank, dark/light, ADA accessible
import React from 'react';
import { Card as CardType, Rank } from '@/types/game';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  onCardPlay: (card: CardType) => void;
  isCurrentPlayer: boolean;
  canPlayCard: (card: CardType) => boolean;
}

// KAN-46: alternating colour suit order — spades, hearts, diamonds, clubs
const SUIT_ORDER: Record<string, number> = {
  spades: 0, hearts: 1, diamonds: 2, clubs: 3,
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

  if (sortedCards.length === 0) return null;

  return (
    <section
      aria-label="Your hand"
      className="fixed bottom-0 left-0 right-0 z-10 pb-4 pt-2 pointer-events-none"
    >
      {/* Gradient fade behind the cards */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent pointer-events-none" />

      <div
        className="relative flex justify-center items-end pointer-events-auto"
        style={{ paddingBottom: '0.5rem' }}
      >
        {sortedCards.map((card, index) => {
          const playable = isCurrentPlayer && canPlayCard(card);
          const overlap = Math.min(48, Math.max(16, 280 / sortedCards.length));
          return (
            <div
              key={`${card.suit}-${card.rank}`}
              className="transition-transform duration-150 hover:-translate-y-3"
              style={{
                marginLeft: index > 0 ? `-${overlap}px` : '0',
                zIndex: index,
              }}
            >
              <Card
                card={card}
                onClick={playable ? () => onCardPlay(card) : undefined}
                disabled={!playable}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PlayerHand;
