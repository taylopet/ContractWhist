// ============================================================
// app/game/page.tsx — Game route (/game)
//
// Entry point for the game UI. Wraps everything in GameProvider
// so all child components can access game state via useGame().
//
// Component tree:
//   GamePage
//   └── GameProvider      (context + reducer — game state lives here)
//       └── GameBoard     (orchestrates phase-based rendering)
//           ├── SetupPhase        (phase: 'setup')
//           ├── GameTable         (all active phases)
//           ├── PlayerHand        (all active phases)
//           ├── BiddingPhase      (phase: 'bidding', current player only)
//           └── [finished overlay] (phase: 'finished')
// ============================================================

'use client';

import React from 'react';
import { GameProvider } from '@/context/GameContext';
import GameBoard from '@/components/GameBoard';

export default function GamePage() {
  return (
    <GameProvider>
      <main className="min-h-screen bg-gray-100">
        <GameBoard />
      </main>
    </GameProvider>
  );
}
