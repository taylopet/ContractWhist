// ============================================================
// components/GameBoard.tsx — Top-level game UI orchestrator
//
// KAN-39: useEffect triggers startRound() when all players joined
// KAN-40: ScoringPhase rendered for 'scoring' phase
// KAN-41: passes scores to GameTable
// KAN-42: JoinPhase rendered for 'joining' phase
// KAN-45: Play Again button on finished overlay calls resetGame()
// ============================================================

'use client';

import React, { useEffect } from 'react';
import { useGame } from '@/context/GameContext';
import GameTable from './GameTable';
import PlayerHand from './PlayerHand';
import BiddingPhase from './BiddingPhase';
import SetupPhase from './SetupPhase';
import JoinPhase from './JoinPhase';
import ScoringPhase from './ScoringPhase';
import { Card as CardType } from '@/types/game';
import { isValidPlay } from '@/lib/gameUtils';

const GameBoard = () => {
  const {
    state,
    setupGame,
    joinGame,
    startRound,
    placeBid,
    playCard,
    endRound,
    resetGame,
  } = useGame();

  const currentPlayer = state.players[state.currentPlayerIndex];

  // KAN-39: auto-deal when all players have joined (hands still empty)
  useEffect(() => {
    if (
      state.phase === 'joining' &&
      state.maxPlayers !== null &&
      state.players.length === state.maxPlayers &&
      state.players[0]?.hand.length === 0
    ) {
      startRound();
    }
  }, [state.phase, state.players.length, state.maxPlayers]);

  // KAN-40: also start next round after END_ROUND resets to bidding with empty hands
  useEffect(() => {
    if (
      state.phase === 'bidding' &&
      state.players.length > 0 &&
      state.players[0]?.hand.length === 0
    ) {
      startRound();
    }
  }, [state.phase, state.round]);

  const handleCardPlay = (card: CardType) => {
    if (currentPlayer) playCard(currentPlayer.id, card);
  };

  const handleBidSubmit = (bid: number) => {
    if (currentPlayer) placeBid(currentPlayer.id, bid);
  };

  const canPlayCard = (card: CardType) => {
    if (!currentPlayer || state.phase !== 'playing') return false;
    return isValidPlay(card, currentPlayer.hand, state.currentTrick, state.trumpSuit);
  };

  // --- Phase rendering ---

  if (state.phase === 'setup') {
    return <SetupPhase onSetupComplete={setupGame} />;
  }

  // KAN-42: hot-seat join flow — show name entry for each remaining player
  if (state.phase === 'joining' && state.maxPlayers !== null) {
    const allJoined = state.players.length === state.maxPlayers;
    if (!allJoined) {
      const nextPlayerNumber = state.players.length + 1;
      const isLastPlayer = nextPlayerNumber === state.maxPlayers;
      return (
        <JoinPhase
          nextPlayerNumber={nextPlayerNumber}
          totalPlayers={state.maxPlayers}
          onJoin={joinGame}
          onAllJoined={startRound}
          isLastPlayer={isLastPlayer}
        />
      );
    }
  }

  return (
    <div className="relative min-h-screen bg-gray-100">
      <GameTable
        players={state.players}
        currentTrick={state.currentTrick}
        currentPlayerIndex={state.currentPlayerIndex}
        trumpSuit={state.trumpSuit}
        scores={state.scores} // KAN-41
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

      {/* KAN-40: scoring overlay */}
      {state.phase === 'scoring' && (
        <ScoringPhase
          players={state.players}
          scores={state.scores}
          round={state.round}
          onNextRound={endRound}
        />
      )}

      {/* KAN-45: game-over overlay with Play Again */}
      {state.phase === 'finished' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-lg shadow-xl max-w-sm w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">Game Over!</h2>
            <div className="space-y-2 mb-6">
              {Object.entries(state.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([playerId, score]) => {
                  const player = state.players.find(p => p.id === playerId);
                  return (
                    <div key={playerId} className="flex justify-between">
                      <span className="font-medium">{player?.name}</span>
                      <span className="text-lg font-bold">{score}</span>
                    </div>
                  );
                })}
            </div>
            {/* KAN-45: reset state and return to setup */}
            <button
              onClick={resetGame}
              data-testid="play-again-button"
              className="w-full bg-blue-600 text-white py-3 rounded-full font-semibold hover:bg-blue-700 transition-colors"
            >
              Play Again
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameBoard;
