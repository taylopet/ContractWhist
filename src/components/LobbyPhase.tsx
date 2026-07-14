// KAN-72: LobbyPhase — waiting room shown while players join a remote game.
// Displays the join code prominently so the host can share it.
'use client';

import React, { useState } from 'react';
import { Player } from '@/types/game';

interface LobbyPhaseProps {
  joinCode: string;
  players: Player[];
  maxPlayers: number;
}

const LobbyPhase: React.FC<LobbyPhaseProps> = ({ joinCode, players, maxPlayers }) => {
  const [copied, setCopied] = useState(false);
  const waiting = maxPlayers - players.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available — silently ignore
    }
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950 flex flex-col items-center justify-center p-6"
      data-testid="lobby-phase"
    >
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">
        <div className="flex justify-center gap-3 text-2xl mb-5" aria-hidden="true">
          <span className="text-red-500">♥</span>
          <span className="text-slate-300">♠</span>
          <span className="text-red-500">♦</span>
          <span className="text-slate-300">♣</span>
        </div>

        <h2 className="text-xl font-bold text-slate-50 mb-1">Waiting for players</h2>
        <p className="text-slate-400 text-sm mb-6">
          Share this code — others join from the home page
        </p>

        {/* Join code — big and easy to copy */}
        <button
          onClick={handleCopy}
          aria-label={copied ? 'Copied!' : 'Copy join code'}
          data-testid="lobby-join-code"
          className="w-full mb-6 px-4 py-4 rounded-xl bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors group"
        >
          <span className="block text-3xl font-mono font-bold tracking-[0.3em] text-indigo-300">
            {joinCode}
          </span>
          <span className="block text-xs text-slate-500 mt-1 group-hover:text-slate-300 transition-colors">
            {copied ? 'Copied!' : 'Tap to copy'}
          </span>
        </button>

        {/* Player list */}
        <div className="space-y-2 mb-4" role="list" aria-label="Players joined">
          {players.map((p, i) => (
            <div
              key={p.id}
              role="listitem"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/60"
            >
              <span className="w-6 h-6 rounded-full bg-indigo-700 text-white text-xs flex items-center justify-center font-bold shrink-0">
                {i + 1}
              </span>
              <span className="text-slate-200 font-medium text-sm">{p.name}</span>
              {i === 0 && (
                <span className="ml-auto text-xs text-indigo-400 font-semibold">host</span>
              )}
            </div>
          ))}
          {Array.from({ length: waiting }, (_, i) => (
            <div
              key={`waiting-${i}`}
              role="listitem"
              className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/30 border border-dashed border-slate-700"
            >
              <span className="w-6 h-6 rounded-full border-2 border-dashed border-slate-600 text-slate-600 text-xs flex items-center justify-center shrink-0">
                {players.length + i + 1}
              </span>
              <span className="text-slate-600 text-sm italic">waiting…</span>
            </div>
          ))}
        </div>

        <p className="text-slate-500 text-xs animate-pulse">
          {waiting === 1 ? '1 more player needed' : `${waiting} more players needed`}
        </p>
      </div>
    </div>
  );
};

export default LobbyPhase;
