'use client';

import React from 'react';
import { useGame } from '@/context/GameContext';
import GameTable from './GameTable';
import PlayerHand from './PlayerHand';
import BiddingPhase from './BiddingPhase';
import SetupPhase from './SetupPhase';
import { Card as CardType } from '@/types/game';
import { isValidPlay } from '@/lib/gameUtils';

const GameBoard = () => {
  const { state, setupGame, placeBid, playCard } = useGame();
  const currentPlayer = state.players[state.currentPlayerIndex];

  const handleCardPlay = (card: CardType) => {
    if (currentPlayer) {
      playCard(currentPlayer.id, card);
    }
  };

  const handleBidSubmit = (bid: number) => {
    if (currentPlayer) {
      placeBid(currentPlayer.id, bid);
    }
  };

  const canPlayCard = (card: CardType) => {
    if (!currentPlayer || state.phase !== 'playing') return false;
    return isValidPlay(card, currentPlayer.hand, state.currentTrick, state.trumpSuit);
  };

  if (state.phase === 'setup') {
    return <SetupPhase onSetupComplete={setupGame} />;
  }

  if (state.players.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <h1 className="text-2xl font-bold text-center mb-6">Contract Whist</h1>
          <p className="text-gray-600 text-center mb-4">Waiting for players to join...</p>
          <p className="text-sm text-gray-500 text-center">
            {state.maxPlayers && `Waiting for ${state.maxPlayers - state.players.length} more players...`}
          </p>
          <div className="animate-pulse flex justify-center mt-4">
            <div className="h-2 w-24 bg-gray-300 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-gray-100">
      <GameTable
        players={state.players}
        currentTrick={state.currentTrick}
        currentPlayerIndex={state.currentPlayerIndex}
        trumpSuit={state.trumpSuit}
      />
      
      {currentPlayer && (
        <>
          <PlayerHand
            cards={currentPlayer.hand}
            onCardPlay={handleCardPlay}
            isCurrentPlayer={true}
            canPlayCard={canPlayCard}
          />
          
          {state.phase === 'bidding' && currentPlayer.bid === null && (
            <BiddingPhase
              currentPlayer={currentPlayer}
              maxBid={currentPlayer.hand.length}
              onBidSubmit={handleBidSubmit}
            />
          )}
        </>
      )}

      {state.phase === 'finished' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold mb-4">Game Over!</h2>
            <div className="space-y-2">
              {Object.entries(state.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([playerId, score]) => {
                  const player = state.players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} className="flex justify-between">
                      <span className="font-medium">{player?.name}</span>
                      <span className="text-lg">{score}</span>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
