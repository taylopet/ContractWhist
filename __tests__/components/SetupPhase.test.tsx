// KAN-60: component tests for SetupPhase
// KAN-66: SetupPhase now has 2 steps; onSetupComplete receives (count, name, schedule)
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPhase from '@/components/SetupPhase';

describe('SetupPhase — step 1 (players)', () => {
  it('renders name input and player count buttons', () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-2')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-3')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-4')).toBeInTheDocument();
  });

  it('default selected player count is 2 (has active style)', () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    expect(screen.getByTestId('player-count-2')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('player-count-3')).toHaveAttribute('aria-pressed', 'false');
  });

  it('clicking 3 updates selected count', async () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    await userEvent.click(screen.getByTestId('player-count-3'));
    expect(screen.getByTestId('player-count-3')).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByTestId('player-count-2')).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not advance to step 2 if name is empty', async () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    // Step 1 submit button says "Next: Game Type →"
    await userEvent.click(screen.getByText(/Next: Game Type/i));
    // Still on step 1 — start game button not present yet
    expect(screen.queryByTestId('start-game-button')).not.toBeInTheDocument();
  });
});

describe('SetupPhase — step 2 (round config) + submit', () => {
  const advanceToStep2 = async (onSetupComplete = jest.fn()) => {
    render(<SetupPhase onSetupComplete={onSetupComplete} />);
    await userEvent.type(screen.getByTestId('player-name-input'), 'Alice');
    await userEvent.click(screen.getByText(/Next: Game Type/i));
    // Now on step 2 — start-game-button is visible
    expect(screen.getByTestId('start-game-button')).toBeInTheDocument();
    return onSetupComplete;
  };

  it('shows start game button on step 2', async () => {
    await advanceToStep2();
  });

  it('calls onSetupComplete with name, count, and schedule on submit', async () => {
    const onSetupComplete = jest.fn();
    render(<SetupPhase onSetupComplete={onSetupComplete} />);
    await userEvent.type(screen.getByTestId('player-name-input'), '  Alice  ');
    await userEvent.click(screen.getByTestId('player-count-4'));
    await userEvent.click(screen.getByText(/Next: Game Type/i));
    await userEvent.click(screen.getByTestId('start-game-button'));
    expect(onSetupComplete).toHaveBeenCalledWith(
      4,
      'Alice',
      expect.arrayContaining([expect.objectContaining({ cardCount: expect.any(Number) })])
    );
  });

  it('back button returns to step 1', async () => {
    await advanceToStep2();
    await userEvent.click(screen.getByText(/← Back/i));
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
    expect(screen.queryByTestId('start-game-button')).not.toBeInTheDocument();
  });
});
