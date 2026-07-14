// KAN-73: RemoteGameContext — SSE state updates, action dispatch, reconnection
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { RemoteGameProvider } from '@/context/RemoteGameContext';
import { useGame } from '@/context/GameContext';
import { GameState } from '@/types/game';
import { buildRoundSchedule } from '@/lib/gameUtils';

// ── Mock EventSource ──────────────────────────────────────────────────────────

class MockEventSource {
  static lastInstance: MockEventSource | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onopen: (() => void) | null = null;
  close = jest.fn();

  constructor(public url: string) {
    MockEventSource.lastInstance = this;
  }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) });
  }

  simulateOpen() {
    this.onopen?.();
  }

  simulateError() {
    this.onerror?.();
  }
}

// ── Mock fetch ────────────────────────────────────────────────────────────────

const mockFetch = jest.fn().mockResolvedValue({ ok: true });

// ── Setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  MockEventSource.lastInstance = null;
  (global as any).EventSource = MockEventSource;
  (global as any).fetch = mockFetch;
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ── Helper component ──────────────────────────────────────────────────────────

const baseState: GameState = {
  players: [],
  currentPlayerIndex: 0,
  trickLeaderIndex: 0,
  trumpSuit: null,
  deck: [],
  currentTrick: [],
  round: 1,
  phase: 'joining',
  scores: {},
  maxPlayers: 2,
  trickCompleted: false,
  trickWinnerIndex: 0,
  roundSchedule: buildRoundSchedule(7),
  handRevealed: true,
  gameId: 'ABC123',
  joinCode: 'ABC123',
  myPlayerId: 'player1',
};

const Probe = () => {
  const { state, connectionStatus } = useGame();
  return (
    <div>
      <span data-testid="phase">{state.phase}</span>
      <span data-testid="connection">{connectionStatus}</span>
      <span data-testid="round">{state.round}</span>
    </div>
  );
};

let capturedPlaceBid: ((id: string, bid: number) => void) | null = null;
const ActionProbe = () => {
  const { placeBid } = useGame();
  capturedPlaceBid = placeBid;
  return null;
};

const renderProvider = () =>
  render(
    <RemoteGameProvider gameId="ABC123" token="tok-1">
      <Probe />
    </RemoteGameProvider>
  );

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RemoteGameProvider — SSE', () => {
  it('opens EventSource with correct URL', () => {
    renderProvider();
    expect(MockEventSource.lastInstance?.url).toContain('/api/games/ABC123/events');
    expect(MockEventSource.lastInstance?.url).toContain('token=tok-1');
  });

  it('connectionStatus starts as "connecting"', () => {
    renderProvider();
    expect(screen.getByTestId('connection').textContent).toBe('connecting');
  });

  it('connectionStatus becomes "connected" on SSE open', async () => {
    renderProvider();
    act(() => MockEventSource.lastInstance!.simulateOpen());
    expect(screen.getByTestId('connection').textContent).toBe('connected');
  });

  it('SSE message updates state', async () => {
    renderProvider();
    act(() => {
      MockEventSource.lastInstance!.simulateMessage({ ...baseState, phase: 'bidding', round: 3 });
    });
    expect(screen.getByTestId('phase').textContent).toBe('bidding');
    expect(screen.getByTestId('round').textContent).toBe('3');
  });

  it('closes EventSource on unmount', () => {
    const { unmount } = renderProvider();
    const es = MockEventSource.lastInstance!;
    unmount();
    expect(es.close).toHaveBeenCalled();
  });
});

describe('RemoteGameProvider — reconnection', () => {
  it('connectionStatus becomes "reconnecting" on SSE error', () => {
    renderProvider();
    act(() => MockEventSource.lastInstance!.simulateOpen());
    act(() => MockEventSource.lastInstance!.simulateError());
    expect(screen.getByTestId('connection').textContent).toBe('reconnecting');
  });

  it('reconnects after delay on SSE error', async () => {
    renderProvider();
    const first = MockEventSource.lastInstance!;
    act(() => first.simulateError());
    // Advance timer to trigger reconnect
    act(() => jest.advanceTimersByTime(1100));
    // A new EventSource should have been created
    expect(MockEventSource.lastInstance).not.toBe(first);
  });

  it('does not reconnect after unmount', () => {
    const { unmount } = renderProvider();
    const first = MockEventSource.lastInstance!;
    unmount();
    act(() => first.simulateError());
    act(() => jest.advanceTimersByTime(5000));
    // No new instance created after unmount
    expect(MockEventSource.lastInstance).toBe(first);
  });
});

describe('RemoteGameProvider — action dispatch', () => {
  it('dispatches action via fetch POST', async () => {
    render(
      <RemoteGameProvider gameId="ABC123" token="tok-1">
        <ActionProbe />
      </RemoteGameProvider>
    );
    await act(async () => { capturedPlaceBid!('player1', 2); });
    expect(mockFetch).toHaveBeenCalledWith(
      '/api/games/ABC123/action',
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('"type":"PLACE_BID"'),
      })
    );
  });

  it('includes token in the POST body', async () => {
    render(
      <RemoteGameProvider gameId="ABC123" token="tok-1">
        <ActionProbe />
      </RemoteGameProvider>
    );
    await act(async () => { capturedPlaceBid!('player1', 2); });
    const body = JSON.parse((mockFetch.mock.calls[0][1] as RequestInit).body as string);
    expect(body.token).toBe('tok-1');
  });
});
