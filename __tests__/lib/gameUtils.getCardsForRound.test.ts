// KAN-44: tests for getCardsForRound() pyramid schedule
import { getCardsForRound } from '@/lib/gameUtils';

describe('getCardsForRound', () => {
  it('round 1 always deals 1 card', () => {
    expect(getCardsForRound(1, 4)).toBe(1);
    expect(getCardsForRound(1, 3)).toBe(1);
    expect(getCardsForRound(1, 2)).toBe(1);
  });

  it('4 players: max cards at round 13', () => {
    expect(getCardsForRound(13, 4)).toBe(13);
  });

  it('4 players: pyramid goes up then back down', () => {
    expect(getCardsForRound(1, 4)).toBe(1);
    expect(getCardsForRound(5, 4)).toBe(5);
    expect(getCardsForRound(13, 4)).toBe(13);
    expect(getCardsForRound(14, 4)).toBe(12);
    expect(getCardsForRound(25, 4)).toBe(1);
  });

  it('never goes below 1', () => {
    expect(getCardsForRound(100, 4)).toBe(1);
  });
});
