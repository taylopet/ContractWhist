// KAN-10/35/36: Bid selection panel — dark/light, ADA accessible (min 48px targets)
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
    if (selectedBid !== null) onBidSubmit(selectedBid);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bid-title"
      className="fixed bottom-0 left-0 right-0 z-20 safe-area-bottom"
    >
      <div className="mx-auto max-w-lg bg-slate-900 border-t border-slate-700 rounded-t-2xl shadow-2xl px-6 pt-5 pb-6">
        <h3 id="bid-title" className="text-base font-semibold text-slate-200 text-center mb-4">
          <span className="text-slate-400">Your bid, </span>
          <span className="text-white">{currentPlayer.name}</span>
        </h3>

        {/* KAN-36: min 48px touch targets for bid buttons */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-5"
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
                // KAN-36: min 48px (h-12 w-12 = 48px)
                'h-12 w-12 rounded-xl font-bold text-lg',
                'transition-all duration-100',
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
          onClick={handleBidSubmit}
          disabled={selectedBid === null}
          aria-disabled={selectedBid === null}
          data-testid="bid-submit-button"
          className={[
            'w-full h-14 rounded-xl font-semibold text-lg',
            'transition-all duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
            selectedBid !== null
              ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
              : 'bg-slate-800 text-slate-600 cursor-not-allowed',
          ].join(' ')}
        >
          {selectedBid !== null ? `Bid ${selectedBid}` : 'Select a bid'}
        </button>
      </div>
    </div>
  );
};

export default BiddingPhase;
