// KAN-74: tests for the structured logger
import { log, getLogBuffer, generateRequestId, startTimer } from '@/lib/logger';

// Spy on console output
let consoleSpy: jest.SpyInstance;
let consoleErrorSpy: jest.SpyInstance;

beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
  // Clear buffer between tests by draining it (buffer is module-level, so we just track size)
});

afterEach(() => {
  consoleSpy.mockRestore();
  consoleErrorSpy.mockRestore();
});

describe('log.info', () => {
  it('writes a JSON line to console.log', () => {
    log.info('test.event', { requestId: 'req-1', gameId: 'GAME1' });
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('info');
    expect(parsed.event).toBe('test.event');
    expect(parsed.requestId).toBe('req-1');
    expect(parsed.gameId).toBe('GAME1');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('does not call console.error for info level', () => {
    log.info('test.event');
    expect(consoleErrorSpy).not.toHaveBeenCalled();
  });
});

describe('log.warn', () => {
  it('writes level "warn" to console.log', () => {
    log.warn('test.warn', { statusCode: 400 });
    const parsed = JSON.parse(consoleSpy.mock.calls[0][0]);
    expect(parsed.level).toBe('warn');
    expect(parsed.statusCode).toBe(400);
  });
});

describe('log.error', () => {
  it('writes to console.error (not console.log)', () => {
    log.error('test.error', new Error('boom'));
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy).not.toHaveBeenCalled();
  });

  it('includes error message and stack in output', () => {
    const err = new Error('something broke');
    log.error('test.error', err);
    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(parsed.error).toBe('something broke');
    expect(parsed.stack).toContain('Error: something broke');
  });

  it('handles non-Error thrown values', () => {
    log.error('test.error', 'plain string error');
    const parsed = JSON.parse(consoleErrorSpy.mock.calls[0][0]);
    expect(parsed.error).toBe('plain string error');
  });
});

describe('getLogBuffer', () => {
  it('accumulates log entries', () => {
    const sizeBefore = getLogBuffer().length;
    log.info('buffer.test.a');
    log.warn('buffer.test.b');
    const sizeAfter = getLogBuffer().length;
    expect(sizeAfter).toBeGreaterThanOrEqual(sizeBefore + 2);
  });

  it('entries contain expected fields', () => {
    log.info('buffer.check', { gameId: 'BUFTEST', playerId: 'p1' });
    const entries = [...getLogBuffer()];
    const entry = entries.reverse().find(e => e.event === 'buffer.check' && e.gameId === 'BUFTEST');
    expect(entry).toBeDefined();
    expect(entry!.playerId).toBe('p1');
    expect(entry!.level).toBe('info');
  });
});

describe('generateRequestId', () => {
  it('generates unique IDs', () => {
    const a = generateRequestId();
    const b = generateRequestId();
    expect(a).not.toBe(b);
  });

  it('starts with "req-"', () => {
    expect(generateRequestId()).toMatch(/^req-/);
  });
});

describe('startTimer', () => {
  it('returns elapsed milliseconds >= 0', () => {
    const elapsed = startTimer();
    const ms = elapsed();
    expect(ms).toBeGreaterThanOrEqual(0);
  });
});
