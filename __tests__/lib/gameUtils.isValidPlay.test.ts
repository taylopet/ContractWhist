// KAN-51: tests for isValidPlay()
import { isValidPlay } from '@/lib/gameUtils';
import { Card } from '@/types/game';

const c = (suit: Card['suit'], rank: Card['rank']): Card => ({ suit, rank });

const heartAce = c('hearts', 'ace');
const heart2 = c('hearts', '2');
const spadeAce = c('spades', 'ace');
const diamondKing = c('diamonds', 'king');
const clubAce = c('clubs', 'ace');

describe('isValidPlay', () => {
  it('any card is valid when leading the trick (empty currentTrick)', () => {
    expect(isValidPlay(spadeAce, [spadeAce, heartAce], [], 'spades')).toBe(true);
    expect(isValidPlay(heartAce, [spadeAce, heartAce], [], null)).toBe(true);
  });

  it('must follow lead suit when holding that suit', () => {
    const hand = [heartAce, heart2, spadeAce];
    const trick = [c('hearts', 'king')];
    expect(isValidPlay(heartAce, hand, trick, 'spades')).toBe(true);
    expect(isValidPlay(heart2, hand, trick, 'spades')).toBe(true);
    expect(isValidPlay(spadeAce, hand, trick, 'spades')).toBe(false);
  });

  it('cannot play off-suit when holding the lead suit', () => {
    const hand = [heartAce, diamondKing];
    const trick = [c('hearts', '3')];
    expect(isValidPlay(diamondKing, hand, trick, null)).toBe(false);
  });

  it('any card valid when void in lead suit', () => {
    const hand = [spadeAce, diamondKing];
    const trick = [heartAce];
    expect(isValidPlay(spadeAce, hand, trick, 'spades')).toBe(true);
    expect(isValidPlay(diamondKing, hand, trick, 'spades')).toBe(true);
  });

  it('single matching card in hand — must play it', () => {
    const hand = [heartAce, spadeAce];
    const trick = [c('hearts', '5')];
    expect(isValidPlay(heartAce, hand, trick, 'spades')).toBe(true);
    expect(isValidPlay(spadeAce, hand, trick, 'spades')).toBe(false);
  });

  it('trump card valid when void in lead suit', () => {
    const hand = [spadeAce, clubAce];
    const trick = [heartAce]; // lead = hearts, void
    expect(isValidPlay(spadeAce, hand, trick, 'spades')).toBe(true);
  });
});
