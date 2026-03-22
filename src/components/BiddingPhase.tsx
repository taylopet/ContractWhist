// ============================================================
// components/BiddingPhase.tsx — Bid selection UI
//
// Shown as a fixed bottom panel when it's the current player's
// turn to bid. Displays numbered buttons 0..maxBid, then a
// Submit button.
//
// Props:
//   currentPlayer — the player whose turn it is to bid
//   maxBid        — highest allowed bid (typically hand size)
//   onBidSubmit   — callback with the selected bid value
//
// Layout:
//   Buttons are in a 7-column grid. For large hands (e.g. 13 cards
//   in a 4-player game) the 14 buttons (0–13) will wrap to 2 rows.
//   This works fine but may want redesign for larger bid ranges.
//
// Known gaps / TODOs:
//   - No "you cannot bid X" restriction (e.g. in some variants the
//     dealer cannot bid a number that makes total bids equal tricks).
//   - No visual indication of what other players have bid.
//   - BiddingPhase overlaps PlayerHand (both fixed to bottom). If
//     the bid panel is added before hand cards render, layout may
//     jump. Consider a consistent bottom panel container.
// ============================================================

'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';

interface BiddingPhaseProps {
  currentPlayer: Player;
  maxBid: number;
  onBidSubmit: (bid: number) => void;
}

const BiddingPhase: React.FC<BiddingPhaseProps> = ({
  currentPlayer,
  maxBid,
  onBidSubmit,
}) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  const handleBidSubmit = () => {
    if (selectedBid !== null) {
      onBidSubmit(selectedBid);
    }
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-4 w-96">
      <h3 className="text-lg font-semibold mb-4 text-center">
        {currentPlayer.name}'s Bid
      </h3>
      {/* Bid buttons 0 to maxBid — 7 columns, wraps for large hands */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {Array.from({ length: maxBid + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => setSelectedBid(i)}
            className={`
              p-2 rounded-full w-10 h-10
              ${selectedBid === i
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 hover:bg-gray-200'
              }
            `}
          >
            {i}
          </button>
        ))}
      </div>
      <button
        onClick={handleBidSubmit}
        disabled={selectedBid === null}
        className={`
          w-full py-2 px-4 rounded-lg font-semibold
          ${selectedBid !== null
            ? 'bg-blue-600 text-white hover:bg-blue-700'
            : 'bg-gray-300 cursor-not-allowed'
          }
        `}
      >
        Submit Bid
      </button>
    </div>
  );
};

export default BiddingPhase;
