// KAN-10/35/36/68: Bid selection — in-flow layout (no fixed positioning)
// KAN-68: no longer fixed — rendered inside GameBoard's bottom section
'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';

interface BiddingPhaseProps {
  currentPlayer: Player;
  maxBid: number;
  onBidSubmit: (bid: number) => void;
  forbiddenBid?: number | null; // KAN-71: last-bidder constraint
}

const BiddingPhase: React.FC<BiddingPhaseProps> = ({ currentPlayer, maxBid, onBidSubmit, forbiddenBid = null }) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  return (
    <div
      role="group"
      aria-labelledby="bid-title"
      className="bg-slate-900 border-t border-slate-700 px-3 pt-2 pb-3 sm:px-4 sm:pt-3 sm:pb-4"
      data-testid="bidding-phase"
    >
      <h3 id="bid-title" className="text-xs font-semibold text-slate-400 text-center mb-2 sm:text-sm sm:mb-3">
        <span className="text-slate-300">{currentPlayer.name}</span>
        <span className="text-slate-500"> — place your bid</span>
      </h3>

      {/* Bid buttons — min 48px touch targets (KAN-36) */}
      <div
        className="flex flex-wrap justify-center gap-1.5 mb-2 sm:gap-2 sm:mb-3"
        role="group"
        aria-label="Select bid amount"
      >
        {Array.from({ length: maxBid + 1 }, (_, i) => {
          const isForbidden = forbiddenBid !== null && i === forbiddenBid;
          return (
            <button
              key={i}
              onClick={() => !isForbidden && setSelectedBid(i)}
              disabled={isForbidden}
              aria-pressed={selectedBid === i}
              aria-label={isForbidden ? `Bid ${i} — not allowed (bust)` : `Bid ${i}`}
              className={[
                'h-10 w-10 sm:h-12 sm:w-12 rounded-xl font-bold text-base sm:text-lg transition-all duration-100',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                isForbidden
                  ? 'bg-slate-800 text-slate-600 border border-slate-700 cursor-not-allowed line-through opacity-50'
                  : selectedBid === i
                    ? 'bg-indigo-600 text-white scale-105 shadow-lg'
                    : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:text-slate-100',
              ].join(' ')}
            >
              {i}
            </button>
          );
        })}
      </div>

      <button
        onClick={() => selectedBid !== null && onBidSubmit(selectedBid)}
        disabled={selectedBid === null}
        aria-disabled={selectedBid === null}
        data-testid="bid-submit-button"
        className={[
          'w-full h-11 sm:h-12 rounded-xl font-semibold text-sm sm:text-base transition-all duration-150',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          selectedBid !== null
            ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
            : 'bg-slate-800 text-slate-600 cursor-not-allowed',
        ].join(' ')}
      >
        {selectedBid !== null ? `Bid ${selectedBid}` : 'Select a bid'}
      </button>
    </div>
  );
};

export default BiddingPhase;
