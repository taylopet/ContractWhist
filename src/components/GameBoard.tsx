// KAN-10/35/36/63/64/65/68: GameBoard — flex layout, scoreboard, trick reveal delay
// KAN-68: PlayerHand and BiddingPhase in flow (no overlap)
// KAN-64: Scoreboard always visible
// KAN-65: trick reveal delay via useEffect → advanceTrick()
// KAN-36: aria-live region for screen reader announcements
'use client';

import React, { useEffect, useState } from 'react';
import { useGame } from '@/context/GameContext';
import ThemeToggle from './ThemeToggle';
import GameTable from './GameTable';
import PlayerHand from './PlayerHand';
import BiddingPhase from './BiddingPhase';
import SetupPhase from './SetupPhase';
import JoinPhase from './JoinPhase';
import LobbyPhase from './LobbyPhase';
import ScoringPhase from './ScoringPhase';
import RoundScoresheet from './RoundScoresheet';
import { Card as CardType, RoundConfig } from '@/types/game';
import { isValidPlay } from '@/lib/gameUtils';

const GameBoard = () => {
  const {
    state,
    setupGame, joinGame, startRound, placeBid, playCard,
    advanceTrick, endRound, resetGame, addBot,
    myPlayerId,
    connectionStatus,
  } = useGame();

  const [announcement, setAnnouncement] = useState('');

  // In multi-device mode, myPlayerId identifies the local player.
  // In local mode, show the current player's hand.
  const myPlayer = myPlayerId
    ? state.players.find(p => p.id === myPlayerId) ?? null
    : state.players[state.currentPlayerIndex] ?? null;

  const currentPlayer = state.players[state.currentPlayerIndex];

  // KAN-39: auto-deal when all players joined
  useEffect(() => {
    // KAN-79: non-host clients must not dispatch START_ROUND (filterState hides hands,
    // so players[0].hand.length is always 0 for them — would cause re-deal loop)
    if (myPlayerId && myPlayerId !== 'player1') return;
    if (
      state.phase === 'joining' &&
      state.maxPlayers !== null &&
      state.players.length === state.maxPlayers &&
      state.players[0]?.hand.length === 0
    ) {
      startRound();
    }
  }, [state.phase, state.players.length, state.maxPlayers]);

  // KAN-40: start next round after END_ROUND
  useEffect(() => {
    if (myPlayerId && myPlayerId !== 'player1') return; // KAN-79: host-only
    if (
      state.phase === 'bidding' &&
      state.players.length > 0 &&
      state.players[0]?.hand.length === 0
    ) {
      startRound();
    }
  }, [state.phase, state.round]);

  // KAN-65: trick reveal delay — wait 1.5s then advance
  useEffect(() => {
    if (!state.trickCompleted) return;
    const timer = setTimeout(() => advanceTrick(), 1500);
    return () => clearTimeout(timer);
  }, [state.trickCompleted]);

  // KAN-36: announcements
  useEffect(() => {
    if (state.phase === 'bidding' && currentPlayer) {
      setAnnouncement(`Round ${state.round}. ${currentPlayer.name}, place your bid.`);
    } else if (state.phase === 'playing' && state.trickCompleted) {
      const winner = state.players[state.trickWinnerIndex];
      setAnnouncement(`${winner?.name ?? 'Player'} wins the trick.`);
    } else if (state.phase === 'playing' && currentPlayer) {
      setAnnouncement(`${currentPlayer.name}'s turn to play.`);
    } else if (state.phase === 'scoring') {
      setAnnouncement(`Round ${state.round} complete.`);
    } else if (state.phase === 'finished') {
      setAnnouncement('Game over. Final scores shown.');
    }
  }, [state.phase, state.currentPlayerIndex, state.round, state.trickCompleted]);

  const handleCardPlay = (card: CardType) => {
    const player = myPlayer ?? currentPlayer;
    if (player) playCard(player.id, card);
  };

  const handleBidSubmit = (bid: number) => {
    const player = myPlayer ?? currentPlayer;
    if (player) placeBid(player.id, bid);
  };

  const canPlayCard = (card: CardType) => {
    const player = myPlayer ?? currentPlayer;
    if (!player || state.phase !== 'playing') return false;
    if (player.id !== currentPlayer?.id) return false; // not their turn
    return isValidPlay(card, player.hand, state.currentTrick, state.trumpSuit);
  };

  const isMyTurn = myPlayer?.id === currentPlayer?.id;

  const handleSetupComplete = (playerCount: number, playerName: string, roundSchedule: RoundConfig[]) => {
    setupGame(playerCount, playerName, roundSchedule);
  };

  // ── Phase routing ──────────────────────────────────────────────────────────

  if (state.phase === 'setup') {
    return <SetupPhase onSetupComplete={handleSetupComplete} />;
  }

  if (state.phase === 'joining' && state.maxPlayers !== null) {
    const allJoined = state.players.length === state.maxPlayers;
    if (!allJoined) {
      // KAN-72: remote game — show lobby with join code; each player on their own device
      if (state.gameId) {
        const isHost = myPlayerId === 'player1';
        return (
          <LobbyPhase
            joinCode={state.joinCode ?? state.gameId}
            players={state.players}
            maxPlayers={state.maxPlayers}
            isHost={isHost}
            onAddBot={addBot}
          />
        );
      }
      // Local fallback (not used in normal flow but kept for compatibility)
      const nextPlayerNumber = state.players.length + 1;
      return (
        <JoinPhase
          nextPlayerNumber={nextPlayerNumber}
          totalPlayers={state.maxPlayers}
          onJoin={joinGame}
          onAllJoined={startRound}
          isLastPlayer={nextPlayerNumber === state.maxPlayers}
        />
      );
    }
  }

  // ── Active game layout (flex column, no fixed positioned children) ──────────
  // KAN-68: hand is in normal flow, below game table, above bidding panel
  // KAN-64: scoreboard always visible

  const showBidPanel =
    state.phase === 'bidding' &&
    isMyTurn &&
    (myPlayer ?? currentPlayer)?.bid === null;

  // KAN-71: last-bidder constraint — forbidden bid for the dealer
  const forbiddenBid = (() => {
    if (!showBidPanel) return null;
    const biddingPlayer = myPlayer ?? currentPlayer;
    if (!biddingPlayer) return null;
    const allOthersHaveBid = state.players
      .filter(p => p.id !== biddingPlayer.id)
      .every(p => p.bid !== null);
    if (!allOthersHaveBid) return null;
    const cardsDealt = biddingPlayer.hand.length;
    const sumOtherBids = state.players
      .filter(p => p.id !== biddingPlayer.id)
      .reduce((sum, p) => sum + (p.bid ?? 0), 0);
    const forbidden = cardsDealt - sumOtherBids;
    return forbidden >= 0 && forbidden <= cardsDealt ? forbidden : null;
  })();

  return (
    <div className="flex flex-col h-dvh bg-slate-950 text-slate-50 overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-3 py-2 sm:px-4 sm:py-3 bg-slate-900 border-b border-slate-800 shrink-0" style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}>
        <div>
          <h1 className="text-sm font-semibold text-slate-300 tracking-wide">Contract Whist</h1>
          {state.joinCode && (
            <p className="text-xs text-indigo-400 font-mono font-bold tracking-widest">
              {state.joinCode}
            </p>
          )}
        </div>
        <ThemeToggle />
      </header>

      {/* KAN-72: reconnecting banner */}
      {connectionStatus === 'reconnecting' && (
        <div
          role="alert"
          className="bg-yellow-900/80 border-b border-yellow-700 px-4 py-1.5 text-center text-xs text-yellow-300 animate-pulse shrink-0"
        >
          Connection lost — reconnecting…
        </div>
      )}

      {/* KAN-36: aria-live announcement */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Status banner — plain-English game state for all players */}
      {(() => {
        let message = '';
        if (state.phase === 'bidding' && currentPlayer) {
          message = `Waiting for ${currentPlayer.name} to bid`;
        } else if (state.phase === 'playing' && state.trickCompleted) {
          const winner = state.players[state.trickWinnerIndex];
          message = `${winner?.name ?? 'Player'} wins the trick!`;
        } else if (state.phase === 'playing' && currentPlayer) {
          message = `Waiting for ${currentPlayer.name} to play a card`;
        }
        if (!message) return null;
        return (
          <div className="shrink-0 bg-emerald-800/60 border-b border-emerald-700/50 px-4 py-1.5 text-center text-sm font-medium text-emerald-100">
            {message}
          </div>
        );
      })()}

      {/* KAN-75: Main area — game table left, scoresheet right */}
      <div className="flex-1 flex flex-row min-h-0 overflow-hidden">
        {/* Game table */}
        <div className="flex-1 overflow-hidden p-3 min-h-0">
          <GameTable
            players={state.players}
            currentTrick={state.currentTrick}
            currentPlayerIndex={state.currentPlayerIndex}
            trumpSuit={state.trumpSuit}
            scores={state.scores}
            trickCompleted={state.trickCompleted}
            trickWinnerIndex={state.trickWinnerIndex}
          />
        </div>

        {/* KAN-75: Round scoresheet panel */}
        {state.players.length > 0 && state.roundSchedule.length > 0 && (
          <div className="w-32 sm:w-44 shrink-0 overflow-hidden flex flex-col">
            <RoundScoresheet
              players={state.players}
              roundSchedule={state.roundSchedule}
              roundHistory={state.roundHistory}
              currentRound={state.round}
              currentTrumpSuit={state.trumpSuit}
              phase={state.phase}
            />
          </div>
        )}
      </div>

      {/* KAN-68/70: bottom section — hand + optional bid panel, in-flow; pb for iOS home bar */}
      <div className="shrink-0 pb-[env(safe-area-inset-bottom)]">
        {myPlayer && myPlayer.hand.length > 0 && (
          <PlayerHand
            cards={myPlayer.hand}
            onCardPlay={handleCardPlay}
            isCurrentPlayer={isMyTurn}
            canPlayCard={canPlayCard}
            handRevealed={state.handRevealed}
          />
        )}

        {/* KAN-68: BiddingPhase rendered BELOW the hand, not overlapping */}
        {showBidPanel && (
          <BiddingPhase
            currentPlayer={myPlayer ?? currentPlayer!}
            maxBid={(myPlayer ?? currentPlayer)!.hand.length}
            onBidSubmit={handleBidSubmit}
            forbiddenBid={forbiddenBid}
          />
        )}
      </div>

      {/* Scoring overlay */}
      {state.phase === 'scoring' && (
        <ScoringPhase
          players={state.players}
          scores={state.scores}
          round={state.round}
          onNextRound={endRound}
          showNextRound={!myPlayerId || myPlayerId === 'player1'}
        />
      )}

      {/* Game-over overlay */}
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
                .map(([pid, score], i) => {
                  const player = state.players.find(p => p.id === pid);
                  return (
                    <div key={pid} role="listitem" className={[
                      'flex items-center justify-between p-3 rounded-xl',
                      i === 0 ? 'bg-yellow-900/30 border border-yellow-600/50' : 'bg-slate-800 border border-slate-700',
                    ].join(' ')}>
                      <div className="flex items-center gap-2">
                        {i === 0 && <span aria-hidden="true">🏆</span>}
                        <span className="font-semibold text-slate-100">{player?.name}</span>
                      </div>
                      <span className={`text-xl font-bold ${i === 0 ? 'text-yellow-300' : 'text-slate-300'}`}>
                        {score}
                      </span>
                    </div>
                  );
                })}
            </div>
            <button
              onClick={resetGame}
              data-testid="play-again-button"
              className="w-full h-14 rounded-xl font-semibold text-lg text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
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
