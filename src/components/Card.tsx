// ============================================================
// components/Card.tsx — Visual playing card
//
// Renders a single card as a button. Shows rank and suit symbol
// in top-left and (rotated 180°) bottom-right corners, with a
// large suit symbol in the centre — standard playing card layout.
//
// Props:
//   card     — the card to display
//   onClick  — called when card is clicked (omit for non-interactive)
//   disabled — greys out card and disables click (used in trick
//              display and when it's not the player's turn)
//
// Styling:
//   Red suits (hearts/diamonds) render in red; black suits in black.
//   Disabled cards are 50% opacity with not-allowed cursor.
//   Hovering a non-disabled card scales it up slightly (scale-105).
//
// Known gaps / TODOs:
//   - Rank display uses toUpperCase() so "ace" → "ACE", "10" → "10".
//     Consider abbreviating: A, K, Q, J, 10, 9... for a more
//     traditional card face look.
//   - No back-of-card rendering (needed if opponents' hands are shown).
//   - Card size is fixed (w-24 h-36). May need responsive sizing for
//     mobile or when many cards are in hand.
// ============================================================

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
      {/* Top-left corner: rank + suit */}
      <div className="absolute top-2 left-2 flex flex-col items-center">
        <span className={`text-lg font-bold ${suitColor}`}>
          {card.rank.toUpperCase()}
        </span>
        <span className={`text-2xl ${suitColor}`}>
          {getSuitSymbol(card.suit)}
        </span>
      </div>
      {/* Centre: large suit symbol */}
      <div className={`text-4xl ${suitColor}`}>
        {getSuitSymbol(card.suit)}
      </div>
      {/* Bottom-right corner: rank + suit, rotated 180° */}
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
