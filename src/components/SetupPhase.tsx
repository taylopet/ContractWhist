// KAN-10/35/36/42/66: Setup screen — name, player count, round schedule config
'use client';

import React, { useState } from 'react';
import { RoundConfig, RoundModifier, Suit } from '@/types/game';
import { buildRoundSchedule, applyStandardModifiers, assignTrumpSuits } from '@/lib/gameUtils';

interface SetupPhaseProps {
  onSetupComplete: (playerCount: number, playerName: string, roundSchedule: RoundConfig[]) => void;
  onCancel?: () => void; // KAN-72: optional back-to-home escape
}

type Preset = 'normal' | 'standard' | 'custom';
type Shape = 'down' | 'down-up';
type Step = 'players' | 'rounds';

const MODIFIER_LABEL: Record<RoundModifier, string> = {
  'normal':     'Normal',
  'no-trumps':  'No Trumps',
  'half-blind': 'Half Blind',
  'blind':      'Blind',
};

const MODIFIER_SHORT: Record<RoundModifier, string> = {
  'normal': 'N', 'no-trumps': 'NT', 'half-blind': 'HB', 'blind': 'B',
};

const SUIT_ICON: Record<Suit, string> = {
  hearts: '♥', diamonds: '♦', clubs: '♣', spades: '♠',
};

const SUIT_COLOR: Record<Suit, string> = {
  hearts: 'text-red-400', diamonds: 'text-red-400',
  clubs: 'text-slate-300', spades: 'text-slate-300',
};

function roundCount(peak: number, shape: Shape) {
  return shape === 'down' ? peak : 2 * peak - 1;
}

function rebuild(peak: number, shape: Shape, preset: Preset): RoundConfig[] {
  const base = buildRoundSchedule(peak, shape);
  const withMods = preset === 'standard' ? applyStandardModifiers(base) : base;
  return assignTrumpSuits(withMods);
}

const SetupPhase: React.FC<SetupPhaseProps> = ({ onSetupComplete, onCancel }) => {
  // Step 1
  const [step, setStep] = useState<Step>('players');
  const [playerCount, setPlayerCount] = useState(2);
  const [playerName, setPlayerName] = useState('');

  // Step 2 — KAN-66
  const [peak, setPeak] = useState(7);
  const [shape, setShape] = useState<Shape>('down-up');
  const [preset, setPreset] = useState<Preset>('standard');
  const [schedule, setSchedule] = useState<RoundConfig[]>(() =>
    rebuild(7, 'down-up', 'standard')
  );

  const maxPeak = Math.floor(52 / playerCount);

  const handlePeakChange = (newPeak: number) => {
    if (newPeak < 3 || newPeak > maxPeak) return;
    setPeak(newPeak);
    setSchedule(rebuild(newPeak, shape, preset));
  };

  const handleShapeChange = (newShape: Shape) => {
    setShape(newShape);
    setSchedule(rebuild(peak, newShape, preset));
  };

  const handlePresetChange = (p: Preset) => {
    setPreset(p);
    setSchedule(rebuild(peak, shape, p));
  };

  const handleModifierChange = (index: number, modifier: RoundModifier) => {
    setSchedule(prev => assignTrumpSuits(prev.map((r, i) => i === index ? { ...r, modifier } : r)));
  };

  const handleStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim()) return;
    // clamp peak if player count changed
    const clampedPeak = Math.min(peak, Math.floor(52 / playerCount));
    if (clampedPeak !== peak) {
      setPeak(clampedPeak);
      setSchedule(rebuild(clampedPeak, shape, preset));
    }
    setStep('rounds');
  };

  const handleSubmit = () => {
    onSetupComplete(playerCount, playerName.trim(), schedule);
  };

  // ── Step 1: name + player count ─────────────────────────────────────────────
  if (step === 'players') {
    return (
      <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="setup-title"
          className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 w-full max-w-md"
        >
          <div className="flex justify-center gap-3 text-2xl mb-5" aria-hidden="true">
            <span className="text-red-500">♥</span>
            <span className="text-slate-300">♠</span>
            <span className="text-red-500">♦</span>
            <span className="text-slate-300">♣</span>
          </div>
          <h2 id="setup-title" className="text-2xl font-bold text-slate-50 text-center mb-1">
            New Game
          </h2>
          <p className="text-slate-400 text-sm text-center mb-8">Step 1 of 2 — Players</p>

          <form onSubmit={handleStep1} className="space-y-6">
            <div>
              <label htmlFor="player-name" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                id="player-name"
                type="text"
                value={playerName}
                onChange={e => setPlayerName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl text-slate-50 placeholder-slate-500 bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors"
                placeholder="Enter your name"
                autoFocus
                autoComplete="off"
                data-testid="player-name-input"
              />
            </div>

            <div>
              <fieldset>
                <legend className="block text-sm font-medium text-slate-300 mb-3">
                  Number of Players
                </legend>
                <div className="flex justify-center gap-4">
                  {[2, 3, 4].map(count => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setPlayerCount(count)}
                      aria-pressed={playerCount === count}
                      data-testid={`player-count-${count}`}
                      className={[
                        'w-16 h-16 rounded-xl font-bold text-2xl transition-all duration-150',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                        playerCount === count
                          ? 'bg-blue-600 text-white shadow-lg scale-105'
                          : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700',
                      ].join(' ')}
                    >
                      {count}
                    </button>
                  ))}
                </div>
              </fieldset>
            </div>

            <button
              type="submit"
              disabled={!playerName.trim()}
              className={[
                'w-full py-4 px-6 rounded-xl font-semibold text-lg transition-all duration-150',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                playerName.trim()
                  ? 'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed',
              ].join(' ')}
            >
              Next: Game Type →
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                ← Back
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── Step 2: round schedule (KAN-66) ─────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950/90 flex items-center justify-center p-4 overflow-y-auto">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rounds-title"
        className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-6 w-full max-w-lg my-4"
      >
        <h2 id="rounds-title" className="text-2xl font-bold text-slate-50 text-center mb-1">
          Game Type
        </h2>
        <p className="text-slate-400 text-sm text-center mb-6">Step 2 of 2 — Round schedule</p>

        {/* Peak cards — up/down stepper */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-300 mb-2">Peak cards per round</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => handlePeakChange(peak - 1)}
              disabled={peak <= 3}
              aria-label="Decrease peak cards"
              className="w-11 h-11 rounded-xl font-bold text-xl bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              −
            </button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-bold text-slate-50">{peak}</span>
              <span className="text-slate-400 text-sm ml-2">cards</span>
              <p className="text-xs text-slate-500 mt-0.5">{roundCount(peak, shape)} rounds</p>
            </div>
            <button
              type="button"
              onClick={() => handlePeakChange(peak + 1)}
              disabled={peak >= maxPeak}
              aria-label="Increase peak cards"
              className="w-11 h-11 rounded-xl font-bold text-xl bg-slate-800 border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              +
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1.5 text-center">max {maxPeak} for {playerCount} players</p>
        </div>

        {/* Schedule shape */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-300 mb-2">Schedule shape</p>
          <div className="flex gap-2">
            {([['down', '↓ Down only'], ['down-up', '↓↑ Down & up']] as [Shape, string][]).map(([s, label]) => (
              <button
                key={s}
                type="button"
                onClick={() => handleShapeChange(s)}
                aria-pressed={shape === s}
                className={[
                  'flex-1 py-2.5 rounded-xl text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                  shape === s
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Preset */}
        <div className="mb-5">
          <p className="text-sm font-medium text-slate-300 mb-2">Round modifiers</p>
          <div className="flex gap-2">
            {(['normal', 'standard', 'custom'] as Preset[]).map(p => (
              <button
                key={p}
                type="button"
                onClick={() => handlePresetChange(p)}
                aria-pressed={preset === p}
                className={[
                  'flex-1 py-2 rounded-xl text-sm font-medium transition-all duration-150',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                  preset === p
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-slate-300 border border-slate-600 hover:bg-slate-700',
                ].join(' ')}
              >
                {p === 'normal' ? 'All Normal' : p === 'standard' ? 'Standard Mix' : 'Custom'}
              </button>
            ))}
          </div>
          {preset !== 'normal' && (
            <p className="text-xs text-slate-500 mt-2">
              {preset === 'standard'
                ? 'N = Normal · NT = No Trumps · HB = Half Blind · B = Blind'
                : 'Click each round to set its modifier'}
            </p>
          )}
        </div>

        {/* Round list — compact grid with suit icon */}
        <div className="mb-6 overflow-y-auto max-h-56">
          <div className="grid grid-cols-[1.25rem_1.5rem_1fr_auto] gap-x-2 gap-y-1 text-xs text-slate-500 mb-1 px-1">
            <span></span><span>#</span><span>Cards</span><span>Type</span>
          </div>
          {schedule.map((r, i) => (
            <div key={i} className="grid grid-cols-[1.25rem_1.5rem_1fr_auto] gap-x-2 gap-y-0 items-center py-1 px-1 rounded-lg hover:bg-slate-800/50">
              {/* Trump suit icon */}
              <span className={`text-sm leading-none ${
                r.trumpSuit ? SUIT_COLOR[r.trumpSuit] : 'text-blue-400'
              }`} aria-hidden="true">
                {r.trumpSuit ? SUIT_ICON[r.trumpSuit] : '—'}
              </span>
              <span className="text-xs text-slate-500 text-right">{i + 1}</span>
              <div className="flex gap-0.5 overflow-hidden">
                {Array.from({ length: r.cardCount }, (_, ci) => (
                  <div key={ci} className="w-2 h-4 bg-slate-600 rounded-sm shrink-0" aria-hidden="true" />
                ))}
              </div>
              {preset === 'custom' ? (
                <select
                  value={r.modifier}
                  onChange={e => handleModifierChange(i, e.target.value as RoundModifier)}
                  aria-label={`Round ${i + 1} modifier`}
                  className="bg-slate-800 border border-slate-600 text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {(Object.keys(MODIFIER_LABEL) as RoundModifier[]).map(m => (
                    <option key={m} value={m}>{MODIFIER_LABEL[m]}</option>
                  ))}
                </select>
              ) : (
                <span className={[
                  'text-xs font-semibold px-2 py-0.5 rounded-full',
                  r.modifier === 'normal' ? 'text-slate-400 bg-slate-800' :
                  r.modifier === 'no-trumps' ? 'text-blue-300 bg-blue-900/40' :
                  r.modifier === 'half-blind' ? 'text-yellow-300 bg-yellow-900/40' :
                  'text-red-300 bg-red-900/40',
                ].join(' ')}>
                  {MODIFIER_SHORT[r.modifier]}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStep('players')}
            className="flex-1 py-3 rounded-xl font-medium text-slate-300 bg-slate-800 border border-slate-600 hover:bg-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            data-testid="start-game-button"
            className="flex-1 py-3 rounded-xl font-semibold text-lg text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
          >
            Start Game
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupPhase;
