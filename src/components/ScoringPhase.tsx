// KAN-10/35/40: End-of-round scoring overlay — dark/light, ADA accessible
// KAN-40: shown when phase === 'scoring'
import React from 'react';
import { Player } from '@/types/game';
import { calculateScore } from '@/lib/gameUtils';

interface ScoringPhaseProps {
  players: Player[];
  scores: Record<string, number>;
  round: number;
  onNextRound: () => void;
}

const ScoringPhase: React.FC<ScoringPhaseProps> = ({
  players,
  scores,
  round,
  onNextRound,
}) => {
  return (
    <div
      className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-30"
      role="dialog"
      aria-modal="true"
      aria-labelledby="scoring-title"
    >
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
        <h2 id="scoring-title" className="text-2xl font-bold text-slate-50 text-center mb-1">
          Round {round} Complete
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">Bid vs tricks won</p>

        <div className="space-y-3 mb-6" role="list">
          {players.map(player => {
            const roundScore = player.bid !== null
              ? calculateScore(player.bid, player.tricks)
              : 0;
            const totalScore = scores[player.id] ?? 0;
            const hit = player.bid === player.tricks;

            return (
              <div
                key={player.id}
                role="listitem"
                data-testid={`scoring-row-${player.id}`}
                className={[
                  'flex items-center justify-between gap-2 p-3 rounded-xl text-sm',
                  hit
                    ? 'bg-emerald-900/40 border border-emerald-700/60'
                    : 'bg-red-900/30 border border-red-800/50',
                ].join(' ')}
              >
                <span className="font-semibold text-slate-100 flex-1 truncate">{player.name}</span>
                <span className="text-slate-400 shrink-0">
                  {player.bid} bid / {player.tricks} won
                </span>
                <span
                  className={`font-bold w-10 text-right shrink-0 ${roundScore >= 0 ? 'text-emerald-400' : 'text-red-400'}`}
                  aria-label={`${roundScore >= 0 ? '+' : ''}${roundScore} this round`}
                >
                  {roundScore > 0 ? `+${roundScore}` : roundScore}
                </span>
                <span className="text-slate-400 text-xs shrink-0">
                  {totalScore} total
                </span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onNextRound}
          data-testid="next-round-button"
          className={[
            'w-full h-14 rounded-xl font-semibold text-lg text-white',
            'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          ].join(' ')}
        >
          Next Round
        </button>
      </div>
    </div>
  );
};

export default ScoringPhase;
