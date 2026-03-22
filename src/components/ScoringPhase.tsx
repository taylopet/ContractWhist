// ============================================================
// components/ScoringPhase.tsx — End-of-round scoring screen
//
// KAN-40: shown when phase === 'scoring'. Displays each player's
//         bid vs tricks won and the round score. "Next Round"
//         button triggers END_ROUND to advance the game.
// ============================================================

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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h2 className="text-2xl font-bold mb-1 text-center">Round {round} Complete</h2>
        <p className="text-gray-500 text-center mb-6">Bid vs tricks won</p>

        <div className="space-y-3 mb-6">
          {players.map(player => {
            const roundScore = player.bid !== null
              ? calculateScore(player.bid, player.tricks)
              : 0;
            const totalScore = scores[player.id] ?? 0;
            const hit = player.bid === player.tricks;

            return (
              <div
                key={player.id}
                data-testid={`scoring-row-${player.id}`}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  hit ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                }`}
              >
                <span className="font-semibold">{player.name}</span>
                <span className="text-sm text-gray-600">
                  Bid {player.bid} / Won {player.tricks}
                </span>
                <span className={`font-bold ${roundScore >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {roundScore > 0 ? `+${roundScore}` : roundScore}
                </span>
                <span className="text-sm text-gray-500">Total: {totalScore}</span>
              </div>
            );
          })}
        </div>

        <button
          onClick={onNextRound}
          data-testid="next-round-button"
          className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
        >
          Next Round
        </button>
      </div>
    </div>
  );
};

export default ScoringPhase;
