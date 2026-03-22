// KAN-49: tests for createDeck() and shuffleDeck()
import { createDeck, shuffleDeck } from '@/lib/gameUtils';

describe('createDeck', () => {
  it('returns 52 cards', () => {
    expect(createDeck()).toHaveLength(52);
  });

  it('contains all 4 suits × 13 ranks with no duplicates', () => {
    const deck = createDeck();
    const keys = deck.map(c => `${c.suit}-${c.rank}`);
    expect(new Set(keys).size).toBe(52);
  });

  it('contains all four suits', () => {
    const deck = createDeck();
    const suits = new Set(deck.map(c => c.suit));
    expect(suits).toEqual(new Set(['hearts', 'diamonds', 'clubs', 'spades']));
  });

  it('contains all 13 ranks', () => {
    const deck = createDeck();
    const ranks = new Set(deck.map(c => c.rank));
    expect(ranks.size).toBe(13);
  });
});

describe('shuffleDeck', () => {
  it('returns same number of cards', () => {
    const deck = createDeck();
    expect(shuffleDeck(deck)).toHaveLength(52);
  });

  it('does not mutate the original array', () => {
    const deck = createDeck();
    const copy = [...deck];
    shuffleDeck(deck);
    expect(deck).toEqual(copy);
  });

  it('contains the same set of cards after shuffle', () => {
    const deck = createDeck();
    const shuffled = shuffleDeck(deck);
    const sortKey = (c: { suit: string; rank: string }) => `${c.suit}-${c.rank}`;
    expect([...shuffled].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))).toEqual(
      [...deck].sort((a, b) => sortKey(a).localeCompare(sortKey(b)))
    );
  });
});
