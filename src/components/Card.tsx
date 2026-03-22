// KAN-10/35: Playing card — clean modern design, ADA accessible, rank abbreviations
import React from 'react';
import { Card as CardType } from '@/types/game';

interface CardProps {
  card: CardType;
  onClick?: () => void;
  disabled?: boolean;
  selected?: boolean;
}

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

// KAN-10: abbreviated ranks for authentic card look (ACE → A, KING → K, etc.)
const RANK_LABEL: Record<string, string> = {
  ace: 'A', king: 'K', queen: 'Q', jack: 'J',
  '10': '10', '9': '9', '8': '8', '7': '7',
  '6': '6', '5': '5', '4': '4', '3': '3', '2': '2',
};

const Card: React.FC<CardProps> = ({ card, onClick, disabled = false, selected = false }) => {
  const symbol = SUIT_SYMBOL[card.suit] ?? '';
  const label = RANK_LABEL[card.rank] ?? card.rank;
  const isRed = card.suit === 'hearts' || card.suit === 'diamonds';
  const colorClass = isRed ? 'text-red-600' : 'text-slate-900';

  const ariaLabel = `${label} of ${card.suit}${disabled ? ', not playable' : ''}`;

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={selected}
      className={[
        // Base card styles
        'relative bg-white rounded-lg border select-none',
        'w-20 h-28 sm:w-24 sm:h-36',
        // Shadow and border
        selected
          ? 'border-indigo-500 shadow-[0_0_0_2px_theme(colors.indigo.500)]'
          : 'border-slate-200 shadow-[var(--shadow-card)]',
        // Hover / active states
        disabled
          ? 'opacity-40 cursor-not-allowed'
          : 'cursor-pointer hover:-translate-y-1 hover:shadow-lg active:translate-y-0 transition-transform duration-150',
        // Focus ring (KAN-36: ADA)
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2',
        selected && !disabled ? '-translate-y-2' : '',
      ].join(' ')}
    >
      {/* Top-left: rank + suit */}
      <div className={`absolute top-1.5 left-2 flex flex-col items-center leading-none ${colorClass}`}>
        <span className="text-base font-bold">{label}</span>
        <span className="text-sm">{symbol}</span>
      </div>

      {/* Centre: large suit symbol */}
      <div className={`flex items-center justify-center h-full text-3xl sm:text-4xl ${colorClass}`} aria-hidden="true">
        {symbol}
      </div>

      {/* Bottom-right: rank + suit, rotated 180° */}
      <div className={`absolute bottom-1.5 right-2 flex flex-col items-center leading-none rotate-180 ${colorClass}`} aria-hidden="true">
        <span className="text-base font-bold">{label}</span>
        <span className="text-sm">{symbol}</span>
      </div>
    </button>
  );
};

export default Card;
