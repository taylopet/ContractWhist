// KAN-50: tests for dealCards() — verifies KAN-38 fix (use index not id.length)
import { createDeck, dealCards } from '@/lib/gameUtils';
import { Player } from '@/types/game';

const makePlayers = (count: number): Player[] =>
  Array.from({ length: count }, (_, i) => ({
    id: `player${i + 1}`,
    name: `Player ${i + 1}`,
    hand: [],
    tricks: 0,
    bid: null,
  }));

describe('dealCards', () => {
  it('deals exactly cardsPerPlayer cards to each player (2 players)', () => {
    const deck = createDeck();
    const players = makePlayers(2);
    const { updatedPlayers } = dealCards(deck, players, 13);
    updatedPlayers.forEach(p => expect(p.hand).toHaveLength(13));
  });

  it('deals exactly cardsPerPlayer cards to each player (4 players)', () => {
    const deck = createDeck();
    const players = makePlayers(4);
    const { updatedPlayers } = dealCards(deck, players, 13);
    updatedPlayers.forEach(p => expect(p.hand).toHaveLength(13));
  });

  it('no card is dealt to more than one player', () => {
    const deck = createDeck();
    const players = makePlayers(4);
    const { updatedPlayers } = dealCards(deck, players, 13);
    const allCards = updatedPlayers.flatMap(p => p.hand.map(c => `${c.suit}-${c.rank}`));
    expect(new Set(allCards).size).toBe(allCards.length);
  });

  it('remainingDeck contains leftover cards', () => {
    const deck = createDeck();
    const players = makePlayers(4);
    const { remainingDeck } = dealCards(deck, players, 13);
    expect(remainingDeck).toHaveLength(52 - 4 * 13);
  });

  it('remainingDeck + all hands = full deck', () => {
    const deck = createDeck();
    const players = makePlayers(3);
    const cardsPerPlayer = 5;
    const { updatedPlayers, remainingDeck } = dealCards(deck, players, cardsPerPlayer);
    const dealtCount = updatedPlayers.reduce((sum, p) => sum + p.hand.length, 0);
    expect(dealtCount + remainingDeck.length).toBe(deck.length);
  });

  it('does not mutate input players array', () => {
    const deck = createDeck();
    const players = makePlayers(2);
    const originalHands = players.map(p => [...p.hand]);
    dealCards(deck, players, 13);
    players.forEach((p, i) => expect(p.hand).toEqual(originalHands[i]));
  });
});
