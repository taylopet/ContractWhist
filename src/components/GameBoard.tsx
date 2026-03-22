// KAN-10/35/36: GameBoard — header with ThemeToggle, aria-live announcer, phase routing
// KAN-39: useEffect triggers startRound() when all players joined
// KAN-40: ScoringPhase rendered for 'scoring' phase
// KAN-41: passes scores to GameTable
// KAN-42: JoinPhase rendered for 'joining' phase
// KAN-45: Play Again button on finished overlay calls resetGame()
'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import ThemeToggle from './ThemeToggle';
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

  // KAN-36: aria-live announcement text for screen readers
  const [announcement, setAnnouncement] = useState('');

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

  // KAN-36: announce phase transitions to screen readers
  useEffect(() => {
    if (state.phase === 'bidding' && currentPlayer) {
      setAnnouncement(`Round ${state.round}. ${currentPlayer.name}, place your bid.`);
    } else if (state.phase === 'playing' && currentPlayer) {
      setAnnouncement(`${currentPlayer.name}'s turn to play a card.`);
    } else if (state.phase === 'scoring') {
      setAnnouncement(`Round ${state.round} complete. Review scores.`);
    } else if (state.phase === 'finished') {
      setAnnouncement('Game over. Final scores displayed.');
    }
  }, [state.phase, state.currentPlayerIndex, state.round]);

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

  // ── Phase routing ──

  if (state.phase === 'setup') {
    return <SetupPhase onSetupComplete={setupGame} />;
  }

  // KAN-42: hot-seat join flow
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
    <div className="flex flex-col min-h-dvh bg-slate-950 text-slate-50">
      {/* KAN-35: header bar with round info + theme toggle */}
      <header className="flex items-center justify-between px-4 py-3 bg-slate-900 border-b border-slate-800 shrink-0">
        <div>
          <h1 className="text-sm font-semibold text-slate-300 tracking-wide">Contract Whist</h1>
          {state.phase !== 'setup' && state.phase !== 'joining' && (
            <p className="text-xs text-slate-500">Round {state.round}</p>
          )}
        </div>

        {/* Trump indicator in header (small) */}
        {state.trumpSuit && (
          <div className="flex items-center gap-1 text-sm">
            <span className="text-slate-400 text-xs">Trump</span>
            <span className={
              state.trumpSuit === 'hearts' || state.trumpSuit === 'diamonds'
                ? 'text-red-400 text-lg font-bold'
                : 'text-slate-200 text-lg font-bold'
            }>
              {state.trumpSuit === 'hearts' ? '♥' : state.trumpSuit === 'diamonds' ? '♦' : state.trumpSuit === 'clubs' ? '♣' : '♠'}
            </span>
          </div>
        )}

        {/* KAN-37: theme toggle */}
        <ThemeToggle />
      </header>

      {/* KAN-36: aria-live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      {/* Game table */}
      <div className="flex-1 p-3 pb-36">
        <GameTable
          players={state.players}
          currentTrick={state.currentTrick}
          currentPlayerIndex={state.currentPlayerIndex}
          trumpSuit={state.trumpSuit}
          scores={state.scores}
        />
      </div>

      {/* Player hand */}
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

      {/* KAN-45: game-over overlay */}
      {state.phase === 'finished' && (
        <div
          className="fixed inset-0 bg-slate-950/85 flex items-center justify-center p-4 z-30"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gameover-title"
        >
          <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-md">
            <h2 id="gameover-title" className="text-3xl font-bold text-slate-50 text-center mb-1">
              Game Over
            </h2>
            <p className="text-slate-400 text-sm text-center mb-6">Final scores</p>

            <div className="space-y-3 mb-6" role="list">
              {Object.entries(state.scores)
                .sort(([, a], [, b]) => b - a)
                .map(([playerId, score], i) => {
                  const player = state.players.find(p => p.id === playerId);
                  const isWinner = i === 0;
                  return (
                    <div
                      key={playerId}
                      role="listitem"
                      className={[
                        'flex items-center justify-between p-3 rounded-xl',
                        isWinner
                          ? 'bg-yellow-900/30 border border-yellow-600/50'
                          : 'bg-slate-800 border border-slate-700',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2">
                        {isWinner && <span aria-hidden="true">🏆</span>}
                        <span className="font-semibold text-slate-100">{player?.name}</span>
                      </div>
                      <span className={`text-xl font-bold ${isWinner ? 'text-yellow-300' : 'text-slate-300'}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={resetGame}
              data-testid="play-again-button"
              className={[
                'w-full h-14 rounded-xl font-semibold text-lg text-white',
                'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
                'transition-colors duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
              ].join(' ')}
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
