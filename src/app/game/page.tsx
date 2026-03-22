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
