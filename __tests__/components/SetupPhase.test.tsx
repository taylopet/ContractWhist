// KAN-60: component tests for SetupPhase
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SetupPhase from '@/components/SetupPhase';

describe('SetupPhase', () => {
  it('renders name input and player count buttons', () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    expect(screen.getByTestId('player-name-input')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-2')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-3')).toBeInTheDocument();
    expect(screen.getByTestId('player-count-4')).toBeInTheDocument();
  });

  it('default selected player count is 2 (has active style)', () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    expect(screen.getByTestId('player-count-2')).toHaveClass('bg-blue-600');
    expect(screen.getByTestId('player-count-3')).not.toHaveClass('bg-blue-600');
  });

  it('clicking 3 updates selected count', async () => {
    render(<SetupPhase onSetupComplete={jest.fn()} />);
    await userEvent.click(screen.getByTestId('player-count-3'));
    expect(screen.getByTestId('player-count-3')).toHaveClass('bg-blue-600');
    expect(screen.getByTestId('player-count-2')).not.toHaveClass('bg-blue-600');
  });

  it('does not call onSetupComplete if name is empty', async () => {
    const onSetupComplete = jest.fn();
    render(<SetupPhase onSetupComplete={onSetupComplete} />);
    await userEvent.click(screen.getByTestId('start-game-button'));
    expect(onSetupComplete).not.toHaveBeenCalled();
  });

  it('calls onSetupComplete with trimmed name and selected count', async () => {
    const onSetupComplete = jest.fn();
    render(<SetupPhase onSetupComplete={onSetupComplete} />);
    await userEvent.type(screen.getByTestId('player-name-input'), '  Alice  ');
    await userEvent.click(screen.getByTestId('player-count-4'));
    await userEvent.click(screen.getByTestId('start-game-button'));
    expect(onSetupComplete).toHaveBeenCalledWith(4, 'Alice');
  });
});
