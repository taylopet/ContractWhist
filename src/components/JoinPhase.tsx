// ============================================================
// components/JoinPhase.tsx — Hot-seat player join screen
//
// KAN-42: shown during 'joining' phase so additional players can
//         enter their names one at a time on the same device.
//         When the last player joins, onAllJoined() is called.
// ============================================================

'use client';

import React, { useState } from 'react';

interface JoinPhaseProps {
  nextPlayerNumber: number;
  totalPlayers: number;
  onJoin: (name: string) => void;
  onAllJoined: () => void;
  isLastPlayer: boolean;
}

const JoinPhase: React.FC<JoinPhaseProps> = ({
  nextPlayerNumber,
  totalPlayers,
  onJoin,
  onAllJoined,
  isLastPlayer,
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onJoin(name.trim());
      if (isLastPlayer) onAllJoined();
      setName('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-2 text-center">
          Player {nextPlayerNumber} of {totalPlayers}
        </h2>
        <p className="text-gray-500 text-center mb-6">Pass the device to the next player</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your name"
              required
              autoFocus
              data-testid="join-name-input"
            />
          </div>
          <button
            type="submit"
            data-testid="join-button"
            className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
          >
            {isLastPlayer ? 'Join & Start Game' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinPhase;
