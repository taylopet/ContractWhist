// KAN-64: Persistent scoreboard — always visible during active play
// Shows each player's cumulative score, current bid, and tricks won.
import React from 'react';
import { Player } from '@/types/game';

interface ScoreboardProps {
  players: Player[];
  scores: Record<string, number>;
  currentPlayerIndex: number;
  round: number;
  totalRounds: number;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  players,
  scores,
  currentPlayerIndex,
  round,
  totalRounds,
}) => {
  if (players.length === 0) return null;

  return (
    <aside
      aria-label="Scoreboard"
      className="bg-slate-900/95 border-b border-slate-700 px-3 py-2"
    >
      {/* Round indicator */}
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-slate-500 font-medium uppercase tracking-wide">
          Round {round} / {totalRounds}
        </span>
        <div className="flex gap-0.5">
          {Array.from({ length: totalRounds }, (_, i) => (
            <div
              key={i}
              aria-hidden="true"
              className={[
                'h-1 rounded-full transition-colors',
                i < round - 1 ? 'w-2 bg-indigo-600' :
                i === round - 1 ? 'w-3 bg-indigo-400' :
                'w-2 bg-slate-700',
              ].join(' ')}
            />
          ))}
        </div>
      </div>

      {/* Player rows */}
      <div
        className="grid gap-x-2 gap-y-0"
        style={{ gridTemplateColumns: `repeat(${players.length}, minmax(0, 1fr))` }}
        role="table"
        aria-label="Player scores"
      >
        {players.map((player, i) => {
          const isActive = i === currentPlayerIndex;
          const totalScore = scores[player.id] ?? 0;

          return (
            <div
              key={player.id}
              role="row"
              className={[
                'flex flex-col items-center py-1 px-2 rounded-lg text-center',
                'transition-colors duration-150',
                isActive ? 'bg-slate-700/60 ring-1 ring-yellow-400/50' : '',
              ].join(' ')}
            >
              {/* Active dot */}
              <div className="h-1.5 mb-0.5">
                {isActive && (
                  <span className="block w-1.5 h-1.5 bg-yellow-400 rounded-full mx-auto" aria-label="Current turn" />
                )}
              </div>

              {/* Name */}
              <span className="text-xs font-semibold text-slate-200 truncate w-full" role="cell">
                {player.name}
              </span>

              {/* Bid / tricks */}
              <span className="text-xs text-slate-400 mt-0.5" role="cell">
                {player.bid !== null
                  ? `${player.tricks}/${player.bid}`
                  : '–/–'}
              </span>

              {/* Total score */}
              <span className="text-sm font-bold text-indigo-300 leading-none mt-0.5" role="cell">
                {totalScore}
              </span>
            </div>
          );
        })}
      </div>
    </aside>
  );
};

export default Scoreboard;
