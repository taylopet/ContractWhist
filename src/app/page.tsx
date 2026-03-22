// KAN-10/35: Landing page — dark/light aware, ADA accessible
import Link from 'next/link';

export default function Home() {
  return (
    <main
      id="main-content"
      className="min-h-dvh bg-slate-950 dark:bg-slate-950 flex flex-col items-center justify-center p-6"
    >
      {/* Hero card */}
      <div className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-8 text-center">
        {/* Suit symbols */}
        <div className="flex justify-center gap-3 text-3xl mb-6" aria-hidden="true">
          <span className="text-red-500">♥</span>
          <span className="text-slate-200">♠</span>
          <span className="text-red-500">♦</span>
          <span className="text-slate-200">♣</span>
        </div>

        <h1 className="text-4xl font-bold text-slate-50 mb-3 tracking-tight">
          Contract Whist
        </h1>
        <p className="text-slate-400 text-base mb-8 leading-relaxed">
          A classic trick-taking card game of bidding and strategy for 2–4 players
        </p>

        <Link
          href="/game"
          className={[
            'block w-full py-4 px-6 rounded-xl',
            'bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700',
            'text-white font-semibold text-lg',
            'transition-colors duration-150',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900',
          ].join(' ')}
        >
          Start Game
        </Link>
      </div>

      <p className="mt-6 text-slate-600 text-sm">
        Hot-seat multiplayer · 2–4 players
      </p>
    </main>
  );
}
