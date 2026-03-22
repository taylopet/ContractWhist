// KAN-52: tests for determineWinner()
import { determineWinner } from '@/lib/gameUtils';
import { Card } from '@/types/game';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

describe('determineWinner', () => {
  it('returns -1 for empty trick', () => {
    expect(determineWinner([], 'spades')).toBe(-1);
  });

  it('returns 0 for a single card trick', () => {
    expect(determineWinner([c('hearts', 'ace')], null)).toBe(0);
  });

  it('highest card of lead suit wins when no trump played', () => {
    const trick = [c('hearts', '5'), c('hearts', 'king'), c('hearts', '3')];
    expect(determineWinner(trick, 'spades')).toBe(1); // king wins
  });

  it('ace beats king of same suit', () => {
    const trick = [c('hearts', 'king'), c('hearts', 'ace')];
    expect(determineWinner(trick, null)).toBe(1);
  });

  it('trump card beats higher-ranked lead suit card', () => {
    const trick = [c('hearts', 'ace'), c('spades', '2')];
    expect(determineWinner(trick, 'spades')).toBe(1); // trump 2 beats lead ace
  });

  it('two trump cards — higher trump wins', () => {
    const trick = [c('hearts', 'ace'), c('spades', '2'), c('spades', 'king')];
    expect(determineWinner(trick, 'spades')).toBe(2); // spade king beats spade 2
  });

  it('off-suit non-trump cannot win', () => {
    const trick = [c('hearts', '5'), c('diamonds', 'ace'), c('hearts', '3')];
    expect(determineWinner(trick, 'spades')).toBe(0); // hearts 5 leads, diamonds ace can't win
  });

  it('works with null trump suit (no trump game)', () => {
    const trick = [c('clubs', '7'), c('clubs', 'ace'), c('hearts', 'ace')];
    expect(determineWinner(trick, null)).toBe(1); // club ace wins, hearts irrelevant
  });

  it('four players — correct winner index returned', () => {
    const trick = [
      c('diamonds', '2'),
      c('diamonds', 'king'),
      c('diamonds', '5'),
      c('diamonds', 'ace'),
    ];
    expect(determineWinner(trick, 'spades')).toBe(3); // ace wins, index 3
  });
});
