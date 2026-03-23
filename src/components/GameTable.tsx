// KAN-10/35/41/65: Game table — trick winner highlight, dark/light
// KAN-41: scores from GameState.scores
// KAN-65: trickCompleted + trickWinnerIndex for winner highlight
import React from 'react';
import { Card as CardType, Player } from '@/types/game';
import Card from './Card';

interface GameTableProps {
  players: Player[];
  currentTrick: CardType[];
  currentPlayerIndex: number;
  trumpSuit: string | null;
  scores: Record<string, number>;
  trickCompleted?: boolean;     // KAN-65
  trickWinnerIndex?: number;    // KAN-65
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
  trickCompleted = false,
  trickWinnerIndex = -1,
}) => {
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
    <div className="relative w-full h-full game-felt rounded-2xl overflow-hidden min-h-[12rem]">

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
          <div
            className={[
              'flex flex-wrap justify-center gap-2 max-w-xs transition-all duration-300',
              trickCompleted ? 'scale-105 opacity-100' : '',
            ].join(' ')}
            aria-label="Cards played this trick"
          >
            {/* KAN-65: winner badge shown while trick is displayed */}
            {trickCompleted && trickWinnerIndex >= 0 && (
              <div className="w-full text-center mb-1">
                <span className="text-xs font-semibold text-yellow-300 bg-yellow-900/50 px-3 py-1 rounded-full">
                  {players[trickWinnerIndex]?.name ?? 'Player'} wins!
                </span>
              </div>
            )}
            {currentTrick.map((card, i) => (
              <Card key={`trick-${card.suit}-${card.rank}-${i}`} card={card} disabled />
            ))}
          </div>
        )}
      </div>

      {/* Player info badges */}
      {players.map((player, index) => {
        const isActive = index === currentPlayerIndex;
        const isWinner = trickCompleted && index === trickWinnerIndex;
        return (
          <div
            key={player.id}
            data-testid={`player-info-${player.id}`}
            className={['absolute z-10', getPositionClasses(index)].join(' ')}
          >
            <div className={[
              'rounded-xl px-3 py-2 text-center min-w-[5rem]',
              'bg-slate-900/80 backdrop-blur border transition-all duration-300',
              isWinner  ? 'border-yellow-400 shadow-[0_0_12px_theme(colors.yellow.400/40)]' :
              isActive  ? 'border-yellow-400 shadow-[0_0_0_2px_theme(colors.yellow.400/40)]' :
                          'border-slate-700',
            ].join(' ')}>
              {isActive && !isWinner && (
                <span className="block w-2 h-2 bg-yellow-400 rounded-full mx-auto mb-1" aria-label="Active player" />
              )}
              {isWinner && (
                <span className="block text-sm mb-0.5" aria-hidden="true">🏆</span>
              )}
              <p className="font-semibold text-slate-100 text-sm truncate max-w-[6rem]">{player.name}</p>
              <p className="text-slate-400 text-xs mt-0.5">
                {player.bid !== null ? `${player.tricks}/${player.bid}` : 'Bidding…'}
              </p>
              <p className="text-indigo-400 text-xs font-semibold mt-0.5">{scores[player.id] ?? 0} pts</p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameTable;
