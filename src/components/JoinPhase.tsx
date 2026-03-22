// KAN-10/35/36/42: Hot-seat join screen — dark/light, ADA accessible
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
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-title"
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md"
      >
        {/* Progress indicator */}
        <div className="flex justify-center gap-2 mb-6">
          {Array.from({ length: totalPlayers }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={[
                'w-3 h-3 rounded-full transition-colors',
                i < nextPlayerNumber - 1
                  ? 'bg-indigo-500'
                  : i === nextPlayerNumber - 1
                  ? 'bg-indigo-400 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900'
                  : 'bg-slate-700',
              ].join(' ')}
            />
          ))}
        </div>

        <h2 id="join-title" className="text-2xl font-bold text-slate-50 text-center mb-1">
          Player {nextPlayerNumber} of {totalPlayers}
        </h2>
        <p className="text-slate-400 text-sm text-center mb-8">
          Pass the device to the next player
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="join-name" className="block text-sm font-medium text-slate-300 mb-2">
              Your Name
            </label>
            <input
              id="join-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={[
                'w-full px-4 py-3 rounded-xl text-slate-50 placeholder-slate-500',
                'bg-slate-800 border border-slate-600',
                'focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent',
                'transition-colors duration-150',
              ].join(' ')}
              placeholder="Enter your name"
              autoFocus
              autoComplete="off"
              data-testid="join-name-input"
            />
          </div>

          <button
            type="submit"
            data-testid="join-button"
            disabled={!name.trim()}
            className={[
              'w-full py-4 px-6 rounded-xl font-semibold text-lg',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              name.trim()
                ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed',
            ].join(' ')}
          >
            {isLastPlayer ? 'Join & Start Game' : 'Join Game'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default JoinPhase;
