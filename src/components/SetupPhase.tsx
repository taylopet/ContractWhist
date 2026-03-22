// KAN-10/35/36: Setup screen — dark/light, ADA accessible (min 48px targets)
// KAN-42: collects first player name + total player count
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
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="setup-title"
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex justify-center gap-3 text-2xl mb-5" aria-hidden="true">
          <span className="text-red-500">♥</span>
          <span className="text-slate-300">♠</span>
          <span className="text-red-500">♦</span>
          <span className="text-slate-300">♣</span>
        </div>
        <h2 id="setup-title" className="text-2xl font-bold text-slate-50 text-center mb-1">
          New Game
        </h2>
        <p className="text-slate-400 text-sm text-center mb-8">Enter your name and choose player count</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Name input */}
          <div>
            <label htmlFor="player-name" className="block text-sm font-medium text-slate-300 mb-2">
              Your Name
            </label>
            <input
              id="player-name"
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className={[
                'w-full px-4 py-3 rounded-xl text-slate-50 placeholder-slate-500',
                'bg-slate-800 border border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors duration-150',
              ].join(' ')}
              placeholder="Enter your name"
              autoFocus
              autoComplete="off"
              data-testid="player-name-input"
            />
          </div>

          {/* Player count */}
          <div>
            <fieldset>
              <legend className="block text-sm font-medium text-slate-300 mb-3">
                Number of Players
              </legend>
              <div className="flex justify-center gap-4">
                {[2, 3, 4].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setPlayerCount(count)}
                    aria-pressed={playerCount === count}
                    data-testid={`player-count-${count}`}
                    className={[
                      // KAN-36: min 48px touch target
                      'w-16 h-16 rounded-xl font-bold text-2xl',
                      'transition-all duration-150',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                      playerCount === count
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700',
                    ].join(' ')}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          {/* Submit */}
          <button
            type="submit"
            data-testid="start-game-button"
            disabled={!playerName.trim()}
            className={[
              'w-full py-4 px-6 rounded-xl font-semibold text-lg',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              playerName.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            ].join(' ')}
          >
            Start Game
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPhase;
