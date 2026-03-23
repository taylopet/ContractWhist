// KAN-10/35/36/68: Bid selection — in-flow layout (no fixed positioning)
// KAN-68: no longer fixed — rendered inside GameBoard's bottom section
'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';

interface BiddingPhaseProps {
  currentPlayer: Player;
  maxBid: number;
  onBidSubmit: (bid: number) => void;
}

const BiddingPhase: React.FC<BiddingPhaseProps> = ({ currentPlayer, maxBid, onBidSubmit }) => {
  const [selectedBid, setSelectedBid] = useState<number | null>(null);

  return (
    <div
      role="group"
      aria-labelledby="bid-title"
      className="bg-slate-900 border-t border-slate-700 px-4 pt-3 pb-4"
      data-testid="bidding-phase"
    >
      <h3 id="bid-title" className="text-sm font-semibold text-slate-400 text-center mb-3">
        <span className="text-slate-300">{currentPlayer.name}</span>
        <span className="text-slate-500"> — place your bid</span>
      </h3>

      {/* Bid buttons — min 48px touch targets (KAN-36) */}
      <div
        className="flex flex-wrap justify-center gap-2 mb-3"
        role="group"
        aria-label="Select bid amount"
      >
        {Array.from({ length: maxBid + 1 }, (_, i) => (
          <button
            key={i}
            onClick={() => setSelectedBid(i)}
            aria-pressed={selectedBid === i}
            aria-label={`Bid ${i}`}
            className={[
              'h-12 w-12 rounded-xl font-bold text-lg transition-all duration-100',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              selectedBid === i
                ? 'bg-indigo-600 text-white scale-105 shadow-lg'
                : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700 hover:text-slate-100',
            ].join(' ')}
          >
            {i}
          </button>
        ))}
      </div>

      <button
        onClick={() => selectedBid !== null && onBidSubmit(selectedBid)}
        disabled={selectedBid === null}
        aria-disabled={selectedBid === null}
        data-testid="bid-submit-button"
        className={[
          'w-full h-12 rounded-xl font-semibold text-base transition-all duration-150',
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
