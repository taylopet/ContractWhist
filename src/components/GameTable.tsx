// KAN-10/35/41: Game table — dark/light, player positions, trump indicator
// KAN-41: displays scores from GameState.scores (not Player.score)
import React from 'react';
import { Card as CardType, Player } from '@/types/game';
import Card from './Card';

interface GameTableProps {
  players: Player[];
  currentTrick: CardType[];
  currentPlayerIndex: number;
  trumpSuit: string | null;
  scores: Record<string, number>; // KAN-41
}

const SUIT_SYMBOL: Record<string, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

const GameTable: React.FC<GameTableProps> = ({
  players,
  currentTrick,
  currentPlayerIndex,
  trumpSuit,
  scores,
}) => {
  // Player 0 = bottom (local player), 1 = left, 2 = top, 3 = right
  const getPositionClasses = (index: number) => {
    switch (index % 4) {
      case 0: return 'bottom-3 left-1/2 -translate-x-1/2';
      case 1: return 'left-3 top-1/2 -translate-y-1/2';
      case 2: return 'top-3 left-1/2 -translate-x-1/2';
      case 3: return 'right-3 top-1/2 -translate-y-1/2';
      default: return '';
    }
  };

  const trumpIsRed = trumpSuit === 'hearts' || trumpSuit === 'diamonds';

  return (
    <div className="relative w-full h-[calc(100dvh-12rem)] game-felt rounded-2xl mx-auto overflow-hidden">

      {/* Trump suit badge */}
      {trumpSuit && (
        <div
          aria-label={`Trump suit: ${trumpSuit}`}
          className="absolute top-3 right-3 z-10 bg-slate-900/80 backdrop-blur border border-slate-600 rounded-xl px-3 py-2 flex flex-col items-center"
        >
          <span className="text-slate-400 text-xs font-medium uppercase tracking-wide">Trump</span>
          <span className={`text-2xl font-bold leading-none mt-0.5 ${trumpIsRed ? 'text-red-400' : 'text-slate-200'}`}>
            {SUIT_SYMBOL[trumpSuit]}
          </span>
        </div>
      )}

      {/* Current trick — centred */}
      <div className="absolute inset-0 flex items-center justify-center">
        {currentTrick.length === 0 ? (
          <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-emerald-600/40 opacity-50" aria-hidden="true" />
        ) : (
          <div className="flex flex-wrap justify-center gap-2 max-w-xs" aria-label="Cards played this trick">
            {currentTrick.map((card, i) => (
              <Card key={`trick-${card.suit}-${card.rank}-${i}`} card={card} disabled />
            ))}
          </div>
        )}
      </div>

      {/* Player info boxes */}
      {players.map((player, index) => {
        const isActive = index === currentPlayerIndex;
        return (
          <div
            key={player.id}
            data-testid={`player-info-${player.id}`}
            className={[
              'absolute z-10',
              getPositionClasses(index),
            ].join(' ')}
          >
            <div
              className={[
                'rounded-xl px-3 py-2 text-center min-w-[6rem]',
                'bg-slate-900/80 backdrop-blur border',
                isActive
                  ? 'border-yellow-400 shadow-[0_0_0_2px_theme(colors.yellow.400/40)]'
                  : 'border-slate-700',
              ].join(' ')}
            >
              {/* Active turn indicator */}
              {isActive && (
                <span className="block w-2 h-2 bg-yellow-400 rounded-full mx-auto mb-1" aria-label="Active player" />
              )}
              <p className="font-semibold text-slate-100 text-sm truncate max-w-[8rem]">{player.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {player.bid !== null ? `Bid ${player.bid} · ${player.tricks} won` : 'Bidding…'}
              </p>
              {/* KAN-41: score from GameState.scores */}
              <p className="text-indigo-400 text-xs font-semibold mt-0.5">
                {scores[player.id] ?? 0} pts
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameTable;
