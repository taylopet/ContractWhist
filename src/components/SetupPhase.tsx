// ============================================================
// components/SetupPhase.tsx — Game setup modal
//
// Full-screen modal shown when game phase is 'setup' (initial state).
// Collects the first player's name and total player count (2, 3, or 4),
// then calls onSetupComplete to dispatch SETUP_GAME.
//
// After setup:
//   - GameState.players has one entry (the player who set up the game)
//   - GameState.phase becomes 'bidding'
//   - Cards are NOT yet dealt (hands are empty until START_ROUND fires)
//
// Known gaps / TODOs:
//   - Only 2/3/4 players supported (hardcoded button options).
//     Real Contract Whist can support up to 7 players.
//   - After setup, there's no flow for additional players to join
//     (JOIN_GAME action exists but no UI was built for it).
//   - No input validation beyond requiring a non-empty name.
//   - The modal background is bg-black/50. If rendered on the green
//     table it will overlay it — currently setup always shows first
//     before the table renders, so this is fine.
// ============================================================

'use client';

import React, { useState } from 'react';

interface SetupPhaseProps {
  onSetupComplete: (playerCount: number, playerName: string) => void;
}

const SetupPhase: React.FC<SetupPhaseProps> = ({ onSetupComplete }) => {
  const [playerCount, setPlayerCount] = useState<number>(2);
  const [playerName, setPlayerName] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (playerName.trim()) {
      onSetupComplete(playerCount, playerName.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-6 text-center">Game Setup</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter your name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Number of Players
            </label>
            {/* Supports 2, 3, or 4 players only */}
            <div className="flex justify-center gap-4">
              {[2, 3, 4].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setPlayerCount(count)}
                  className={`
                    w-16 h-16 rounded-lg font-bold text-xl
                    ${playerCount === count
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }
                  `}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
          >
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPhase;
