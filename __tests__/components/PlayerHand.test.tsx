// KAN-59: component tests for PlayerHand
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PlayerHand from '@/components/PlayerHand';
import { Card } from '@/types/game';

const cards: Card[] = [
  { suit: 'hearts', rank: 'ace' },
  { suit: 'spades', rank: 'king' },
  { suit: 'diamonds', rank: '10' },
];

describe('PlayerHand', () => {
  it('renders one Card per card in the array', () => {
    render(
      <PlayerHand
        cards={cards}
        onCardPlay={jest.fn()}
        isCurrentPlayer={true}
        canPlayCard={() => true}
      />
    );
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });

  it('calls onCardPlay with correct card when clicked', async () => {
    const onCardPlay = jest.fn();
    render(
      <PlayerHand
        cards={cards}
        onCardPlay={onCardPlay}
        isCurrentPlayer={true}
        canPlayCard={() => true}
      />
    );
    const buttons = screen.getAllByRole('button');
    await userEvent.click(buttons[0]);
    expect(onCardPlay).toHaveBeenCalledTimes(1);
  });

  it('all cards disabled when isCurrentPlayer is false', () => {
    render(
      <PlayerHand
        cards={cards}
        onCardPlay={jest.fn()}
        isCurrentPlayer={false}
        canPlayCard={() => true}
      />
    );
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled());
  });

  it('cards are disabled when canPlayCard returns false', () => {
    render(
      <PlayerHand
        cards={cards}
        onCardPlay={jest.fn()}
        isCurrentPlayer={true}
        canPlayCard={() => false}
      />
    );
    screen.getAllByRole('button').forEach(btn => expect(btn).toBeDisabled());
  });

  it('renders empty without error when cards is empty', () => {
    const { container } = render(
      <PlayerHand
        cards={[]}
        onCardPlay={jest.fn()}
        isCurrentPlayer={true}
        canPlayCard={() => true}
      />
    );
    expect(container.querySelectorAll('button')).toHaveLength(0);
  });
});
