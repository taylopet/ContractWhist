// KAN-37: Accessible dark/light mode toggle button
'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-pressed={isDark}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="
        flex items-center justify-center w-12 h-12 rounded-xl
        bg-slate-800 dark:bg-slate-700
        hover:bg-slate-700 dark:hover:bg-slate-600
        border border-slate-600 dark:border-slate-500
        text-slate-200 dark:text-slate-200
        transition-all duration-200
        focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-slate-900 dark:focus-visible:ring-offset-slate-950
      "
    >
      <span className="text-xl" aria-hidden="true">
        {isDark ? '☀️' : '🌙'}
      </span>
    </button>
  );
};

export default ThemeToggle;
