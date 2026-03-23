// KAN-69: Landing page — create game or join with code
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [mode, setMode] = useState<'home' | 'join'>('home');
  const [joinCode, setJoinCode] = useState('');
  const [joinName, setJoinName] = useState('');
  const [joinError, setJoinError] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleNewGame = () => {
    // KAN-69: go to /game — the local GameProvider handles setup from there
    router.push('/game');
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim() || !joinName.trim()) return;
    setIsJoining(true);
    setJoinError('');

    try {
      const res = await fetch(`/api/games/${joinCode.trim().toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerName: joinName.trim() }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        setJoinError(error ?? 'Could not join game');
        return;
      }

      const { gameId, token } = await res.json() as { gameId: string; token: string };
      // Store token in sessionStorage for reconnection
      sessionStorage.setItem(`cw-token-${gameId}`, token);
      router.push(`/game/${gameId}?token=${encodeURIComponent(token)}`);
    } catch {
      setJoinError('Network error — is the host running the server?');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main id="main-content" className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">

        <div className="flex justify-center gap-3 text-3xl mb-6" aria-hidden="true">
          <span className="text-red-500">♥</span>
          <span className="text-slate-200">♠</span>
          <span className="text-red-500">♦</span>
          <span className="text-slate-200">♣</span>
        </div>

        <h1 className="text-4xl font-bold text-slate-50 mb-3 tracking-tight">Contract Whist</h1>
        <p className="text-slate-400 text-sm mb-8 leading-relaxed">
          Classic trick-taking · 2–4 players · Each on their own device
        </p>

        {mode === 'home' ? (
          <div className="space-y-3">
            <button
              onClick={handleNewGame}
              className="block w-full py-4 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              New Game
            </button>
            <button
              onClick={() => setMode('join')}
              className="block w-full py-4 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            >
              Join Game
            </button>
          </div>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4 text-left">
            <div>
              <label htmlFor="join-code" className="block text-sm font-medium text-slate-300 mb-2">
                Join Code
              </label>
              <input
                id="join-code"
                type="text"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="e.g. WOLF42"
                maxLength={6}
                autoFocus
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl text-slate-50 placeholder-slate-500 bg-slate-800 border border-slate-600 font-mono text-xl tracking-widest text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="join-name" className="block text-sm font-medium text-slate-300 mb-2">
                Your Name
              </label>
              <input
                id="join-name"
                type="text"
                value={joinName}
                onChange={e => setJoinName(e.target.value)}
                placeholder="Enter your name"
                autoComplete="off"
                className="w-full px-4 py-3 rounded-xl text-slate-50 placeholder-slate-500 bg-slate-800 border border-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            {joinError && (
              <p className="text-sm text-red-400 text-center" role="alert">{joinError}</p>
            )}

            <button
              type="submit"
              disabled={!joinCode.trim() || !joinName.trim() || isJoining}
              className={[
                'w-full py-4 rounded-xl font-semibold text-lg transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
                joinCode.trim() && joinName.trim() && !isJoining
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed',
              ].join(' ')}
            >
              {isJoining ? 'Joining…' : 'Join Game'}
            </button>

            <button
              type="button"
              onClick={() => { setMode('home'); setJoinError(''); }}
              className="w-full py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
            >
              ← Back
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-slate-600 text-sm">
        Hot-seat or multi-device · 2–4 players
      </p>
    </main>
  );
}
