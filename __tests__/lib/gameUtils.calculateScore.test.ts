// KAN-53: tests for calculateScore()
import { calculateScore } from '@/lib/gameUtils';

describe('calculateScore', () => {
  it('exact bid returns 10 + bid', () => {
    expect(calculateScore(3, 3)).toBe(13);
  });

  it('bid 0, won 0 returns 10', () => {
    expect(calculateScore(0, 0)).toBe(10);
  });

  it('bid 1, won 1 returns 11', () => {
    expect(calculateScore(1, 1)).toBe(11);
  });

  it('miss by 1 over (bid 3 won 4) returns -1', () => {
    expect(calculateScore(3, 4)).toBe(-1);
  });

  it('miss by 1 under (bid 3 won 2) returns -1', () => {
    expect(calculateScore(3, 2)).toBe(-1);
  });

  it('miss by 3 (bid 5 won 2) returns -3', () => {
    expect(calculateScore(5, 2)).toBe(-3);
  });

  it('bid 0 won 1 returns -1', () => {
    expect(calculateScore(0, 1)).toBe(-1);
  });

  it('large exact bid (bid 13 won 13) returns 23', () => {
    expect(calculateScore(13, 13)).toBe(23);
  });
});
