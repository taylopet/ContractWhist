// KAN-69: /game — local hot-seat game (single device, no server required)
// For multi-device, host uses this page then shares the join code.
// The SetupPhase now routes through the GameBoard for configuration.
'use client';

import React from 'react';
import { GameProvider } from '@/context/GameContext';
import GameBoard from '@/components/GameBoard';

export default function GamePage() {
  return (
    <GameProvider>
      <main id="main-content" className="min-h-dvh bg-slate-950">
        <GameBoard />
      </main>
    </GameProvider>
  );
}
