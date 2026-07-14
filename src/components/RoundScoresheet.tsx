// KAN-75: Full round-by-round scoresheet panel shown on the right of the game board.
// Shows all rounds (past, current, future) with card count, trump, and per-player bid/score.
'use client';

import React from 'react';
import { Player, RoundConfig, RoundResult, Suit } from '@/types/game';

interface RoundScoresheetProps {
  players: Player[];
  roundSchedule: RoundConfig[];
  roundHistory: RoundResult[];
  currentRound: number;       // 1-based
  currentTrumpSuit: Suit | null;
  phase: string;
}

const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
};

const SUIT_COLOR: Record<Suit, string> = {
  spades: 'text-slate-200',
  clubs: 'text-slate-200',
  hearts: 'text-red-400',
  diamonds: 'text-red-400',
};

function TrumpBadge({ suit, modifier }: { suit: Suit | null | undefined; modifier?: string }) {
  if (suit) {
    return (
      <span className={`font-bold ${SUIT_COLOR[suit]}`}>{SUIT_SYMBOL[suit]}</span>
    );
  }
  if (modifier === 'no-trumps') return <span className="text-blue-400 text-[10px] font-bold">NT</span>;
  if (modifier === 'blind') return <span className="text-purple-400 text-[10px] font-bold">B</span>;
  if (modifier === 'half-blind') return <span className="text-violet-400 text-[10px] font-bold">HB</span>;
  return <span className="text-slate-500 text-[10px]">?</span>;
}

const RoundScoresheet: React.FC<RoundScoresheetProps> = ({
  players,
  roundSchedule,
  roundHistory: roundHistoryProp,
  currentRound,
  currentTrumpSuit,
  phase,
}) => {
  const roundHistory = roundHistoryProp ?? [];
  if (players.length === 0) return null;

  return (
    <aside
      aria-label="Round Scoresheet"
      className="flex flex-col h-full bg-slate-900 border-l border-slate-700"
    >
      {/* Player name headers */}
      <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-1 pt-1.5 pb-1">
        <div className="grid gap-0" style={{ gridTemplateColumns: `28px 16px repeat(${players.length}, minmax(0, 1fr))` }}>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide text-center leading-none pt-0.5">Rnd</div>
          <div className="text-[9px] text-slate-500 uppercase tracking-wide text-center leading-none pt-0.5">T</div>
          {players.map(p => (
            <div key={p.id} className="text-[10px] font-semibold text-slate-200 text-center truncate px-0.5 leading-tight">
              {p.name}
            </div>
          ))}
        </div>
      </div>

      {/* Round rows — scrollable */}
      <div className="flex-1 overflow-y-auto">
        {roundSchedule.map((config, idx) => {
          const roundNum = idx + 1;
          const isCompleted = roundNum < currentRound;
          const isCurrent = roundNum === currentRound;
          const history = roundHistory.find(r => r.roundIndex === idx);

          // Determine trump to display
          const displayTrump = isCompleted
            ? history?.trumpSuit ?? null
            : isCurrent
              ? currentTrumpSuit
              : null;

          const rowBg = isCurrent
            ? 'bg-emerald-900/30 border-b border-emerald-800/40'
            : isCompleted
              ? 'border-b border-slate-800/60'
              : 'border-b border-slate-800/30 opacity-50';

          return (
            <div
              key={idx}
              className={`px-1 py-0.5 ${rowBg}`}
              aria-label={`Round ${roundNum}`}
            >
              <div
                className="grid gap-0 items-center"
                style={{ gridTemplateColumns: `28px 16px repeat(${players.length}, minmax(0, 1fr))` }}
              >
                {/* Round number + card count */}
                <div className="text-center">
                  <div className="text-[10px] font-semibold text-slate-300 leading-none">{roundNum}</div>
                  <div className="text-[9px] text-slate-500 leading-none">{config.cardCount}c</div>
                </div>

                {/* Trump */}
                <div className="text-center text-xs">
                  <TrumpBadge suit={displayTrump ?? undefined} modifier={isCurrent || isCompleted ? undefined : config.modifier} />
                </div>

                {/* Per-player bid + score */}
                {players.map(p => {
                  if (isCompleted && history) {
                    const result = history.perPlayer[p.id];
                    const hit = result && result.bid === result.tricks;
                    return (
                      <div key={p.id} className="text-center px-0.5">
                        <div className="text-[9px] text-slate-400 leading-none">{result?.bid ?? '-'}</div>
                        <div className={`text-[10px] font-semibold leading-none ${hit ? 'text-emerald-400' : 'text-amber-400'}`}>
                          {result != null ? (result.score > 0 ? `+${result.score}` : result.score) : '-'}
                        </div>
                      </div>
                    );
                  }
                  if (isCurrent) {
                    const bid = p.bid;
                    const inScoring = phase === 'scoring';
                    const score = inScoring && bid !== null
                      ? (bid === p.tricks ? 10 + bid : p.tricks)
                      : null;
                    return (
                      <div key={p.id} className="text-center px-0.5">
                        <div className="text-[9px] text-slate-400 leading-none">
                          {bid !== null ? bid : <span className="text-slate-600">—</span>}
                        </div>
                        <div className={`text-[10px] font-semibold leading-none ${
                          score !== null
                            ? (bid === p.tricks ? 'text-emerald-400' : 'text-amber-400')
                            : 'text-slate-600'
                        }`}>
                          {score !== null ? (score > 0 ? `+${score}` : score) : '—'}
                        </div>
                      </div>
                    );
                  }
                  // Future round
                  return (
                    <div key={p.id} className="text-center px-0.5">
                      <div className="text-[9px] text-slate-600 leading-none">—</div>
                      <div className="text-[9px] text-slate-700 leading-none">—</div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Running totals footer */}
      <div className="shrink-0 bg-slate-800 border-t border-slate-700 px-1 py-1">
        <div
          className="grid gap-0 items-center"
          style={{ gridTemplateColumns: `28px 16px repeat(${players.length}, minmax(0, 1fr))` }}
        >
          <div className="col-span-2 text-[9px] text-slate-500 uppercase tracking-wide text-center leading-none">
            Total
          </div>
          {players.map(p => {
            const total = roundHistory.reduce((sum, r) => sum + (r.perPlayer[p.id]?.score ?? 0), 0);
            return (
              <div key={p.id} className="text-center">
                <span className="text-xs font-bold text-indigo-300">{total}</span>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
};

export default RoundScoresheet;
