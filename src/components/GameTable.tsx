import React from 'react';
import { Card as CardType, Player } from '@/types/game';
import Card from './Card';

interface GameTableProps {
  players: Player[];
  currentTrick: CardType[];
  currentPlayerIndex: number;
  trumpSuit: string | null;
}

const GameTable: React.FC<GameTableProps> = ({
  players,
  currentTrick,
  currentPlayerIndex,
  trumpSuit,
}) => {
  const getPlayerPosition = (playerIndex: number) => {
    const positions = ['bottom', 'left', 'top', 'right'];
    const numPlayers = players.length;
    const adjustedIndex = (playerIndex + numPlayers) % numPlayers;
    return positions[adjustedIndex];
  };

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] bg-green-800 rounded-3xl shadow-inner p-8">
      {/* Trump suit indicator */}
      {trumpSuit && (
        <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-md">
          <p className="text-sm font-semibold">Trump Suit:</p>
          <p className={`text-2xl ${trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
            {trumpSuit === 'hearts' ? '♥' : trumpSuit === 'diamonds' ? '♦' : trumpSuit === 'clubs' ? '♣' : '♠'}
          </p>
        </div>
      )}

      {/* Current trick */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="grid grid-cols-2 gap-4 transform -rotate-45">
          {currentTrick.map((card, index) => (
            <div
              key={`${card.suit}-${card.rank}`}
              className="transform rotate-45"
              style={{
                gridColumn: index % 2 + 1,
                gridRow: Math.floor(index / 2) + 1,
              }}
            >
              <Card card={card} disabled={true} />
            </div>
          ))}
        </div>
      </div>

      {/* Player info boxes */}
      {players.map((player, index) => {
        const position = getPlayerPosition(index);
        const isCurrentPlayer = index === currentPlayerIndex;

        return (
          <div
            key={player.id}
            className={`
              absolute p-4 bg-white rounded-lg shadow-md
              ${position === 'top' ? 'top-4 left-1/2 -translate-x-1/2' : ''}
              ${position === 'bottom' ? 'bottom-4 left-1/2 -translate-x-1/2' : ''}
              ${position === 'left' ? 'left-4 top-1/2 -translate-y-1/2' : ''}
              ${position === 'right' ? 'right-4 top-1/2 -translate-y-1/2' : ''}
              ${isCurrentPlayer ? 'ring-2 ring-yellow-400' : ''}
            `}
          >
            <div className="text-center">
              <p className="font-semibold">{player.name}</p>
              <p className="text-sm text-gray-600">
                {player.bid !== null ? `Bid: ${player.bid}` : 'Bidding...'}
              </p>
              <p className="text-sm text-gray-600">
                Tricks: {player.tricks}
              </p>
              <p className="text-sm font-medium">
                Score: {player.score}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default GameTable;
