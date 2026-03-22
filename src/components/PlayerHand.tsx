// ============================================================
// components/PlayerHand.tsx — Current player's hand of cards
//
// Fixed to the bottom of the screen. Cards overlap horizontally
// (each card offset -2rem left from previous) to fit large hands.
// Hovering a card lifts it up (-translate-y-4) for visual selection.
//
// Props:
//   cards           — the cards to display
//   onCardPlay      — called when a card is clicked (only if allowed)
//   isCurrentPlayer — if false, all cards are disabled
//   canPlayCard     — per-card callback; returns false if follow-suit
//                     rule prevents playing this card
//
// Stacking / z-index:
//   Cards are stacked with z-index = array index, so later cards in
//   the hand render on top. The order cards appear depends on Player.hand
//   order which is set by dealCards() — currently no sorting is applied.
//
// Known gaps / TODOs:
//   - Cards are not sorted by suit/rank. Players may want automatic
//     sorting (e.g. by suit then rank) for easier hand reading.
//   - The -2rem overlap is fixed regardless of hand size; for 13 cards
//     in a 4-player game the hand may extend off-screen on small displays.
//   - No visual indicator for which cards are playable vs greyed out
//     beyond the Card component's disabled opacity.
//   - BiddingPhase renders on top of this component when it's bidding
//     phase — they share the bottom of screen fixed position.
// ============================================================

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
              marginLeft: index > 0 ? '-2rem' : '0', // overlap cards for fan effect
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
