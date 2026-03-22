import React from 'react';
import { Card as CardType } from '@/types/game';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  onCardPlay: (card: CardType) => void;
  isCurrentPlayer: boolean;
  canPlayCard: (card: CardType) => boolean;
}

const PlayerHand: React.FC<PlayerHandProps> = ({
  cards,
  onCardPlay,
  isCurrentPlayer,
  canPlayCard,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-100 to-transparent">
      <div className="flex justify-center gap-2 overflow-x-auto pb-4">
        {cards.map((card, index) => (
          <div
            key={`${card.suit}-${card.rank}`}
            className="transform hover:-translate-y-4 transition-transform duration-200"
            style={{
              marginLeft: index > 0 ? '-2rem' : '0',
              zIndex: index,
            }}
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
