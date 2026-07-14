// KAN-10/35/46/68: Player hand — in-flow layout (no fixed positioning)
// KAN-68: no longer fixed bottom — parent GameBoard controls layout
// KAN-66: handRevealed=false hides card faces (blind/half-blind rounds)
import React from 'react';
import { Card as CardType, Rank } from '@/types/game';
import Card from './Card';

interface PlayerHandProps {
  cards: CardType[];
  onCardPlay: (card: CardType) => void;
  isCurrentPlayer: boolean;
  canPlayCard: (card: CardType) => boolean;
  handRevealed?: boolean; // KAN-66: false = blind round (cards face-down)
}

// KAN-46: alternating colour suit order
const SUIT_ORDER: Record<string, number> = { spades: 0, hearts: 1, diamonds: 2, clubs: 3 };
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
  handRevealed = true,
}) => {
  const sortedCards = [...cards].sort((a, b) => {
    const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
    if (suitDiff !== 0) return suitDiff;
    return RANK_VALUES[b.rank] - RANK_VALUES[a.rank];
  });

  if (sortedCards.length === 0) return null;

  return (
    <section
      aria-label={`Your hand — ${sortedCards.length} card${sortedCards.length !== 1 ? 's' : ''}`}
      className="w-full bg-slate-950 border-t border-slate-800 py-2 px-2 sm:py-3 sm:px-3"
      data-testid="player-hand"
    >
      {/* KAN-71: no overlap — flex-wrap so all cards are fully readable */}
      <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
        {sortedCards.map((card) => {
          const playable = isCurrentPlayer && handRevealed && canPlayCard(card);
          return (
            <div
              key={`${card.suit}-${card.rank}`}
              className="transition-transform duration-150 hover:-translate-y-1"
            >
              {handRevealed ? (
                <Card
                  card={card}
                  onClick={playable ? () => onCardPlay(card) : undefined}
                  disabled={!playable}
                />
              ) : (
                // KAN-66: blind/half-blind — show card back
                <div
                  className="w-14 h-20 sm:w-20 sm:h-28 rounded-lg bg-indigo-900 border border-indigo-700 shadow-md flex items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="text-indigo-400 text-3xl">🂠</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default PlayerHand;
