// KAN-58: component tests for BiddingPhase
// Updated for KAN-10/35 UI redesign — new text/aria-label conventions
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BiddingPhase from '@/components/BiddingPhase';
import { Player } from '@/types/game';

const player: Player = {
  id: 'player1',
  name: 'Alice',
  hand: [],
  tricks: 0,
  bid: null,
};

describe('BiddingPhase', () => {
  it('renders the player name in the heading', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={jest.fn()} />);
    // KAN-10: heading shows "Your bid, Alice" split across two spans
    expect(screen.getByText('Alice')).toBeInTheDocument();
  });

  it('renders bid buttons 0 to maxBid inclusive', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    // KAN-10: bid buttons have aria-label "Bid N"
    [0, 1, 2, 3].forEach(n =>
      expect(screen.getByRole('button', { name: `Bid ${n}` })).toBeInTheDocument()
    );
  });

  it('submit button is disabled before a bid is selected', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    // KAN-10: submit button shows "Select a bid" when nothing selected
    expect(screen.getByRole('button', { name: /Select a bid/i })).toBeDisabled();
  });

  it('submit button enables after selecting a bid', async () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bid 2' }));
    // KAN-10: submit button (data-testid="bid-submit-button") enables after selection
    expect(screen.getByTestId('bid-submit-button')).not.toBeDisabled();
  });

  it('calls onBidSubmit with selected bid value', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bid 3' }));
    await userEvent.click(screen.getByTestId('bid-submit-button'));
    expect(onBidSubmit).toHaveBeenCalledWith(3);
  });

  it('bid of 0 can be submitted', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: 'Bid 0' }));
    await userEvent.click(screen.getByTestId('bid-submit-button'));
    expect(onBidSubmit).toHaveBeenCalledWith(0);
  });
});
