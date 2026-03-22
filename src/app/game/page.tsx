// KAN-10/35: Game route — wraps GameProvider, renders main content target
'use client';

import React from 'react';
import { GameProvider } from '@/context/GameContext';
import GameBoard from '@/components/GameBoard';

export default function GamePage() {
  return (
    <GameProvider>
      <main id="main-content" className="min-h-dvh bg-slate-950 dark:bg-slate-950">
        <GameBoard />
      </main>
    </GameProvider>
  );
}
