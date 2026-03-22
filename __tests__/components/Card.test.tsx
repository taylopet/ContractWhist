// KAN-57: component tests for Card
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Card from '@/components/Card';
import { Card as CardType } from '@/types/game';

const heartAce: CardType = { suit: 'hearts', rank: 'ace' };
const spadeKing: CardType = { suit: 'spades', rank: 'king' };
const diamond10: CardType = { suit: 'diamonds', rank: '10' };
const club2: CardType = { suit: 'clubs', rank: '2' };

describe('Card', () => {
  it('renders the rank abbreviated (ace → A)', () => {
    render(<Card card={heartAce} />);
    // KAN-10: rank is now abbreviated (A, K, Q, J) not uppercased full word
    expect(screen.getAllByText('A').length).toBeGreaterThan(0);
  });

  it('renders hearts suit symbol', () => {
    render(<Card card={heartAce} />);
    expect(screen.getAllByText('♥').length).toBeGreaterThan(0);
  });

  it('renders spades suit symbol', () => {
    render(<Card card={spadeKing} />);
    expect(screen.getAllByText('♠').length).toBeGreaterThan(0);
  });

  it('renders diamonds suit symbol', () => {
    render(<Card card={diamond10} />);
    expect(screen.getAllByText('♦').length).toBeGreaterThan(0);
  });

  it('renders clubs suit symbol', () => {
    render(<Card card={club2} />);
    expect(screen.getAllByText('♣').length).toBeGreaterThan(0);
  });

  it('red suit card has red colour class', () => {
    const { container } = render(<Card card={heartAce} />);
    expect(container.querySelector('.text-red-600')).not.toBeNull();
  });

  it('black suit card does not have red colour class', () => {
    const { container } = render(<Card card={spadeKing} />);
    expect(container.querySelector('.text-red-600')).toBeNull();
  });

  it('calls onClick when clicked and not disabled', async () => {
    const onClick = jest.fn();
    render(<Card card={heartAce} onClick={onClick} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', async () => {
    const onClick = jest.fn();
    render(<Card card={heartAce} onClick={onClick} disabled={true} />);
    await userEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('has cursor-not-allowed class when disabled', () => {
    const { container } = render(<Card card={heartAce} disabled={true} />);
    expect(container.querySelector('.cursor-not-allowed')).not.toBeNull();
  });
});
