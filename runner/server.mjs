// ==============================================================================
// JIT CodeArena Runner - HTTP API
// ==============================================================================
//
//   POST /v1/execute   (Authorization: Bearer $RUNNER_TOKEN)
//     { "code": "...", "cases": [{ "stdin": "..." }], "timeLimitMs": 2000, "memoryLimitMb": 256 }
//   -> { "results": [{ "status", "stdout", "stderr", "timeMs", "exitCode" }] }
//
//   GET /healthz       -> { ok, sandbox, workers, active, queued }
//
// Every test case is one job. Jobs run on a fixed pool of worker slots (one per
// CPU by default); the rest wait in a bounded FIFO queue. When the queue is full
// or a job waits too long, the request gets 503 so the app can report
// "busy, try again" instead of piling up.

import http from 'node:http';
import os from 'node:os';
import crypto from 'node:crypto';
import { prepareBox, runOnce } from './sandbox.mjs';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = (process.env.RUNNER_TOKEN || '').trim();
const SANDBOX = process.env.RUNNER_SANDBOX || 'nsjail';
const WORKERS = Number(process.env.RUNNER_WORKERS || os.cpus().length);
const MAX_QUEUE = Number(process.env.RUNNER_MAX_QUEUE || 5000);
const QUEUE_TIMEOUT_MS = Number(process.env.RUNNER_QUEUE_TIMEOUT_MS || 45000);

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_CODE_BYTES = 64 * 1024;
const MAX_CASES = 50;
const MAX_TIME_LIMIT_MS = 10000;
const DEFAULT_MEMORY_MB = 256;
const MAX_MEMORY_MB = 512;

if (TOKEN.length < 32) {
  console.error('RUNNER_TOKEN must be set to a random value of at least 32 characters.');
  process.exit(1);
}
if (SANDBOX !== 'nsjail' && SANDBOX !== 'none') {
  console.error(`Unknown RUNNER_SANDBOX "${SANDBOX}" (expected "nsjail" or "none").`);
  process.exit(1);
}
if (SANDBOX === 'none' && process.env.NODE_ENV === 'production') {
  console.error('RUNNER_SANDBOX=none runs student code without isolation and is refused in production.');
  process.exit(1);
}

// ------------------------------------------------------------------------------
// Worker pool
// ------------------------------------------------------------------------------

let active = 0;
const queue = [];

class QueueFullError extends Error {}
class QueueTimeoutError extends Error {}

function acquireSlot() {
  if (active < WORKERS) {
    active++;
    return Promise.resolve();
  }
  if (queue.length >= MAX_QUEUE) {
    return Promise.reject(new QueueFullError('Runner queue is full.'));
  }
  return new Promise((resolve, reject) => {
    const entry = { resolve, reject, timer: null };
    entry.timer = setTimeout(() => {
      const i = queue.indexOf(entry);
      if (i !== -1) queue.splice(i, 1);
      reject(new QueueTimeoutError('Timed out waiting for a free runner slot.'));
    }, QUEUE_TIMEOUT_MS);
    queue.push(entry);
  });
}

function releaseSlot() {
  const next = queue.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(); // hand the slot straight to the next job
  } else {
    active--;
  }
}

async function runCase(boxDir, stdin, limits) {
  await acquireSlot();
  try {
    return await runOnce(SANDBOX, boxDir, stdin, limits);
  } finally {
    releaseSlot();
  }
}

// ------------------------------------------------------------------------------
// HTTP
// ------------------------------------------------------------------------------

function send(res, status, body) {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(json) });
  res.end(json);
}

function isAuthorized(req) {
  const header = req.headers.authorization || '';
  const given = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(TOKEN).digest();
  return crypto.timingSafeEqual(a, b);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large.'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

function validate(body) {
  if (!body || typeof body !== 'object') return 'Body must be a JSON object.';
  if (typeof body.code !== 'string') return '"code" must be a string.';
  if (Buffer.byteLength(body.code) > MAX_CODE_BYTES) return 'Code is too large.';
  if (!Array.isArray(body.cases) || body.cases.length === 0) return '"cases" must be a non-empty array.';
  if (body.cases.length > MAX_CASES) return `At most ${MAX_CASES} cases per request.`;
  for (const c of body.cases) {
    if (!c || (c.stdin !== undefined && typeof c.stdin !== 'string')) return 'Each case needs a string "stdin".';
  }
  return null;
}

async function handleExecute(req, res) {
  if (!isAuthorized(req)) return send(res, 401, { error: 'Unauthorized.' });

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch (err) {
    return send(res, err.status || 400, { error: err.status ? err.message : 'Invalid JSON.' });
  }

  const problem = validate(body);
  if (problem) return send(res, 400, { error: problem });

  const limits = {
    timeLimitMs: Math.min(MAX_TIME_LIMIT_MS, Math.max(100, Number(body.timeLimitMs) || 2000)),
    memoryLimitMb: Math.min(MAX_MEMORY_MB, Math.max(32, Number(body.memoryLimitMb) || DEFAULT_MEMORY_MB)),
  };

  const box = await prepareBox(body.code);
  try {
    // Cases of one submission run in parallel across free slots
    const results = await Promise.all(body.cases.map((c) => runCase(box.dir, c.stdin || '', limits)));
    send(res, 200, { results });
  } catch (err) {
    if (err instanceof QueueFullError || err instanceof QueueTimeoutError) {
      send(res, 503, { error: 'Runner is busy. Please try again in a moment.', busy: true });
    } else {
      console.error('execute failed:', err);
      send(res, 500, { error: 'Runner internal error.' });
    }
  } finally {
    box.cleanup().catch(() => {});
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    return send(res, 200, { ok: true, sandbox: SANDBOX, workers: WORKERS, active, queued: queue.length });
  }
  if (req.method === 'POST' && req.url === '/v1/execute') {
    handleExecute(req, res).catch((err) => {
      console.error(err);
      if (!res.headersSent) send(res, 500, { error: 'Runner internal error.' });
    });
    return;
  }
  send(res, 404, { error: 'Not found.' });
});

server.requestTimeout = 120000;
server.listen(PORT, () => {
  console.log(`JIT CodeArena runner listening on :${PORT} (sandbox=${SANDBOX}, workers=${WORKERS})`);
  if (SANDBOX === 'none') {
    console.warn('WARNING: sandbox disabled. Student code runs unisolated. Development use only.');
  }
});
