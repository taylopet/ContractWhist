// KAN-69: /game/[id] — multi-device game page, uses RemoteGameProvider + SSE
'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { RemoteGameProvider } from '@/context/RemoteGameContext';
import GameBoard from '@/components/GameBoard';

interface GamePageProps {
  params: Promise<{ id: string }>;
}

export default function RemoteGamePage({ params }: GamePageProps) {
  const searchParams = useSearchParams();
  const [gameId, setGameId] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    params.then(({ id }) => {
      const resolvedGameId = id.toUpperCase();
      // Token comes from URL param (join flow) or sessionStorage (reconnect)
      const urlToken = searchParams.get('token');
      const storedToken = sessionStorage.getItem(`cw-token-${resolvedGameId}`);
      const resolvedToken = urlToken ?? storedToken;

      if (!resolvedToken) {
        setError('No session token — please join via the home page.');
        return;
      }

      // Persist token for reconnection
      sessionStorage.setItem(`cw-token-${resolvedGameId}`, resolvedToken);
      setGameId(resolvedGameId);
      setToken(resolvedToken);
    });
  }, []);

  if (error) {
    return (
      <main className="min-h-dvh bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 border border-red-800 rounded-2xl p-8 max-w-sm text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <a
            href="/"
            className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors"
          >
            Back to Home
          </a>
        </div>
      </main>
    );
  }

  if (!gameId || !token) {
    return (
      <main className="min-h-dvh bg-slate-950 flex items-center justify-center">
        <div className="text-slate-400 text-sm animate-pulse">Connecting…</div>
      </main>
    );
  }

  return (
    <RemoteGameProvider gameId={gameId} token={token}>
      <main id="main-content" className="min-h-dvh bg-slate-950">
        <GameBoard />
      </main>
    </RemoteGameProvider>
  );
}
