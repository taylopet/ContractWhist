import React from 'react';
import { Card as CardType } from '@/types/game';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
}

const Card: React.FC<CardProps> = ({ card, onClick, disabled }) => {
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case 'hearts': return '♥';
      case 'diamonds': return '♦';
      case 'clubs': return '♣';
      case 'spades': return '♠';
      default: return '';
    }
  };

  const suitColor = card.suit === 'hearts' || card.suit === 'diamonds' ? 'text-red-600' : 'text-black';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative w-24 h-36 bg-white rounded-lg shadow-md border-2 border-gray-300
        hover:shadow-lg transition-shadow duration-200
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}
        flex flex-col items-center justify-center
      `}
    >
      <div className="absolute top-2 left-2 flex flex-col items-center">
        <span className={`text-lg font-bold ${suitColor}`}>
          {card.rank.toUpperCase()}
        </span>
        <span className={`text-2xl ${suitColor}`}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
      <div className={`text-4xl ${suitColor}`}>
        {getSuitSymbol(card.suit)}
      </div>
      <div className="absolute bottom-2 right-2 flex flex-col items-center rotate-180">
        <span className={`text-lg font-bold ${suitColor}`}>
          {card.rank.toUpperCase()}
        </span>
        <span className={`text-2xl ${suitColor}`}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
    </button>
  );
};

export default Card;
