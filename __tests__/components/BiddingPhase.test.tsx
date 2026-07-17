// KAN-58: component tests for BiddingPhase
// Updated for KAN-10/35 UI redesign — new text/aria-label conventions
// KAN-71: last-bidder forbidden bid UI tests
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

// KAN-71: last-bidder constraint (bust-bid prevention)
describe('BiddingPhase — forbiddenBid', () => {
  it('forbidden bid button is disabled', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={jest.fn()} forbiddenBid={2} />);
    const btn = screen.getByRole('button', { name: /Bid 2.*bust/i });
    expect(btn).toBeDisabled();
  });

  it('forbidden bid button cannot be selected', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} forbiddenBid={2} />);
    await userEvent.click(screen.getByRole('button', { name: /Bid 2.*bust/i }));
    // submit button should still say "Select a bid" — nothing was selected
    expect(screen.getByRole('button', { name: /Select a bid/i })).toBeDisabled();
    expect(onBidSubmit).not.toHaveBeenCalled();
  });

  it('non-forbidden bids remain enabled', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} forbiddenBid={1} />);
    expect(screen.getByRole('button', { name: 'Bid 0' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bid 2' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Bid 3' })).not.toBeDisabled();
  });

  it('no forbidden bid when forbiddenBid is null (non-last bidder)', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} forbiddenBid={null} />);
    [0, 1, 2, 3].forEach(n =>
      expect(screen.getByRole('button', { name: `Bid ${n}` })).not.toBeDisabled()
    );
  });
});

// KAN-84: house rule — no bid of 0 in three consecutive rounds
describe('BiddingPhase — zeroBlocked', () => {
  it('disables the 0 button when zeroBlocked is true', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={jest.fn()} zeroBlocked />);
    const btn = screen.getByRole('button', { name: /Bid 0.*no third zero/i });
    expect(btn).toBeDisabled();
  });

  it('zeroBlocked button cannot be selected', async () => {
    const onBidSubmit = jest.fn();
    render(<BiddingPhase currentPlayer={player} maxBid={5} onBidSubmit={onBidSubmit} zeroBlocked />);
    await userEvent.click(screen.getByRole('button', { name: /Bid 0.*no third zero/i }));
    expect(screen.getByRole('button', { name: /Select a bid/i })).toBeDisabled();
    expect(onBidSubmit).not.toHaveBeenCalled();
  });

  it('other bids remain enabled when only 0 is zeroBlocked', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} zeroBlocked />);
    [1, 2, 3].forEach(n =>
      expect(screen.getByRole('button', { name: `Bid ${n}` })).not.toBeDisabled()
    );
  });

  it('0 stays enabled when zeroBlocked is false', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} zeroBlocked={false} />);
    expect(screen.getByRole('button', { name: 'Bid 0' })).not.toBeDisabled();
  });

  it('bust rule takes precedence when 0 is both the bust value and zeroBlocked', () => {
    render(<BiddingPhase currentPlayer={player} maxBid={3} onBidSubmit={jest.fn()} forbiddenBid={0} zeroBlocked />);
    const btn = screen.getByRole('button', { name: /Bid 0.*bust/i });
    expect(btn).toBeDisabled();
  });
});
