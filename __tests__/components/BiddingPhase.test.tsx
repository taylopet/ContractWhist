// KAN-58: component tests for BiddingPhase
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
    expect(screen.getByText("Alice's Bid")).toBeInTheDocument();
  });

  it('renders bid buttons 0 to maxBid inclusive', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    [0, 1, 2, 3].forEach(n =>
      expect(screen.getByRole('button', { name: String(n) })).toBeInTheDocument()
    );
  });

  it('submit button is disabled before a bid is selected', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    expect(screen.getByRole('button', { name: /Submit Bid/i })).toBeDisabled();
  });

  it('submit button enables after selecting a bid', async () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: '2' }));
    expect(screen.getByRole('button', { name: /Submit Bid/i })).not.toBeDisabled();
  });

  it('calls onBidSubmit with selected bid value', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '3' }));
    await userEvent.click(screen.getByRole('button', { name: /Submit Bid/i }));
    expect(onBidSubmit).toHaveBeenCalledWith(3);
  });

  it('bid of 0 can be submitted', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} />);
    await userEvent.click(screen.getByRole('button', { name: '0' }));
    await userEvent.click(screen.getByRole('button', { name: /Submit Bid/i }));
    expect(onBidSubmit).toHaveBeenCalledWith(0);
  });
});
