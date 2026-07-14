// KAN-74: Structured JSON logger — server-side only (no 'use client')
//
// Every log line is a single JSON object (NDJSON-compatible) written to
// stdout (info/warn) or stderr (error).  An in-memory ring buffer retains
// the last MAX_BUFFER entries so the /api/admin/logs endpoint can surface
// them to an operator or agent without requiring external log infrastructure.
//
// Log entry shape:
// {
//   ts          ISO-8601 timestamp
//   level       "info" | "warn" | "error"
//   event       machine-readable dotted name  e.g. "game.created"
//   requestId   HTTP request correlation ID   (optional)
//   gameId      game identifier               (optional)
//   playerId    player identifier             (optional)
//   action      game action type              (optional)
//   phaseBefore game phase before action      (optional)
//   phaseAfter  game phase after action       (optional)
//   statusCode  HTTP response status code     (optional)
//   durationMs  request/operation duration    (optional)
//   error       error message string          (optional)
//   stack       stack trace                   (optional)
//   detail      any additional context        (optional)
// }

export interface LogContext {
  requestId?: string;
  gameId?: string;
  playerId?: string;
  action?: string;
  phaseBefore?: string;
  phaseAfter?: string;
  statusCode?: number;
  durationMs?: number;
  detail?: Record<string, unknown>;
}

export interface LogEntry {
  ts: string;
  level: 'info' | 'warn' | 'error';
  event: string;
  requestId?: string;
  gameId?: string;
  playerId?: string;
  action?: string;
  phaseBefore?: string;
  phaseAfter?: string;
  statusCode?: number;
  durationMs?: number;
  error?: string;
  stack?: string;
  detail?: Record<string, unknown>;
}

// ── Ring buffer ───────────────────────────────────────────────────────────────

const MAX_BUFFER = 500;
const buffer: LogEntry[] = [];

export const getLogBuffer = (): readonly LogEntry[] => buffer;

function addToBuffer(entry: LogEntry) {
  buffer.push(entry);
  if (buffer.length > MAX_BUFFER) buffer.shift();
}

// ── Core write function ───────────────────────────────────────────────────────

function write(level: LogEntry['level'], event: string, ctx?: LogContext, err?: unknown) {
  const entry: LogEntry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...ctx,
  };

  if (err != null) {
    if (err instanceof Error) {
      entry.error = err.message;
      entry.stack = err.stack;
      // Chain causes
      if ((err as NodeJS.ErrnoException).cause) {
        entry.detail = { ...entry.detail, cause: String((err as NodeJS.ErrnoException).cause) };
      }
    } else {
      entry.error = String(err);
    }
  }

  addToBuffer(entry);

  const line = JSON.stringify(entry);
  if (level === 'error') {
    console.error(line);
  } else {
    console.log(line);
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const log = {
  info:  (event: string, ctx?: LogContext)                   => write('info',  event, ctx),
  warn:  (event: string, ctx?: LogContext)                   => write('warn',  event, ctx),
  error: (event: string, err: unknown, ctx?: LogContext)     => write('error', event, ctx, err),
};

// ── Request ID helper ─────────────────────────────────────────────────────────

let _reqCounter = 0;
export const generateRequestId = () =>
  `req-${Date.now().toString(36)}-${(++_reqCounter).toString(36)}`;

// ── Timer helper ──────────────────────────────────────────────────────────────

export const startTimer = (): (() => number) => {
  const t0 = Date.now();
  return () => Date.now() - t0;
};
