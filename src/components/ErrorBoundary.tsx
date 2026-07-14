// KAN-74: React Error Boundary — catches component tree crashes
// Reports errors server-side via POST /api/client-errors for agentic troubleshooting.
'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  gameId?: string;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Report to server so it appears in structured logs
    fetch('/api/client-errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: info.componentStack,
        gameId: this.props.gameId,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      }),
    }).catch(() => {
      // If the report itself fails, fall back to console
      console.error('[ErrorBoundary] Failed to report error to server:', error);
    });

    // Always log to console for local debugging
    console.error('[ErrorBoundary] Caught component error:', error, info);
  }

  handleReload = () => {
    this.setState({ hasError: false, errorMessage: '' });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="min-h-dvh bg-slate-950 flex flex-col items-center justify-center p-6 text-center"
        >
          <div className="w-full max-w-sm bg-slate-900 border border-red-800 rounded-2xl shadow-2xl p-8">
            <div className="text-4xl mb-4" aria-hidden="true">⚠️</div>
            <h1 className="text-xl font-bold text-slate-50 mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6">
              An unexpected error occurred. The error has been logged automatically.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.errorMessage && (
              <pre className="text-left text-xs text-red-400 bg-slate-800 rounded-lg p-3 mb-4 overflow-x-auto whitespace-pre-wrap break-words">
                {this.state.errorMessage}
              </pre>
            )}
            <button
              onClick={this.handleReload}
              className="w-full py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
