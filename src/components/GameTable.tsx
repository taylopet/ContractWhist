// ============================================================
// components/GameTable.tsx — Visual game table with player positions
//
// Renders the green felt playing surface. Shows:
//   - Trump suit indicator (top-right corner)
//   - Cards played in the current trick (centre)
//   - Player info boxes (name, bid, tricks, score) around the table
//
// Player positioning:
//   getPlayerPosition() assigns positions: bottom, left, top, right
//   based on player array index. This works for 2–4 players:
//     1 player  → bottom only
//     2 players → bottom + left (top/right unused)
//     3 players → bottom, left, top
//     4 players → bottom, left, top, right
//   NOTE: position[0] is always 'bottom', so player at index 0 is
//   always shown at the bottom. This should be the local human player.
//
// Current trick layout:
//   Cards are arranged in a 2-column CSS grid that is rotated -45°,
//   with each card counter-rotated +45° to stay upright. This creates
//   a diamond-like arrangement. Works visually for up to 4 cards.
//
// Known gaps / TODOs:
//   - Player.score shown here is never updated (see types/game.ts note).
//     Should display GameState.scores[player.id] instead.
//   - The trick layout doesn't indicate which player played which card.
//   - No animation when a trick is won/cleared.
//   - For 2-3 player games some position slots are unused, leaving
//     the table looking sparse.
// ============================================================

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
  // Maps player array index to a table edge position.
  // Player 0 is always 'bottom' (the local player's perspective).
  const getPlayerPosition = (playerIndex: number) => {
    const positions = ['bottom', 'left', 'top', 'right'];
    const numPlayers = players.length;
    const adjustedIndex = (playerIndex + numPlayers) % numPlayers;
    return positions[adjustedIndex];
  };

  return (
    <div className="relative w-full h-[calc(100vh-12rem)] bg-green-800 rounded-3xl shadow-inner p-8">
      {/* Trump suit indicator — top-right corner */}
      {trumpSuit && (
        <div className="absolute top-4 right-4 bg-white rounded-lg p-3 shadow-md">
          <p className="text-sm font-semibold">Trump Suit:</p>
          <p className={`text-2xl ${trumpSuit === 'hearts' || trumpSuit === 'diamonds' ? 'text-red-600' : 'text-black'}`}>
            {trumpSuit === 'hearts' ? '♥' : trumpSuit === 'diamonds' ? '♦' : trumpSuit === 'clubs' ? '♣' : '♠'}
          </p>
        </div>
      )}

      {/* Current trick — centred, diamond layout via -45°/+45° rotation */}
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

      {/* Player info boxes — positioned at table edges */}
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
              {/* TODO: replace player.score with scores[player.id] from context */}
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
