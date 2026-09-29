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
import { runCode, selfTest } from './sandbox.mjs';

const PORT = Number(process.env.PORT || 8787);
const TOKEN = (process.env.RUNNER_TOKEN || '').trim();
const SANDBOX = process.env.RUNNER_SANDBOX || 'nsjail';
// Leave one core for this process so it notices finished runs promptly
const WORKERS = Number(process.env.RUNNER_WORKERS || Math.max(1, os.cpus().length - 1));
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
if (!['nsjail', 'restricted', 'none'].includes(SANDBOX)) {
  console.error(`Unknown RUNNER_SANDBOX "${SANDBOX}" (expected "nsjail", "restricted" or "none").`);
  process.exit(1);
}
if (SANDBOX === 'none' && process.env.NODE_ENV === 'production') {
  console.error('RUNNER_SANDBOX=none runs student code without isolation and is refused in production.');
  process.exit(1);
}
if (SANDBOX === 'restricted' && process.getuid() !== 0 && process.env.NODE_ENV === 'production') {
  console.error('RUNNER_SANDBOX=restricted must run as root so each run can switch to its own unprivileged user.');
  process.exit(1);
}

// ------------------------------------------------------------------------------
// Worker pool
// ------------------------------------------------------------------------------

// Each worker slot has a number; in restricted mode it also picks the uid the
// run executes as, so two concurrent runs never share a uid.
const freeSlots = Array.from({ length: WORKERS }, (_, i) => i);
const queue = [];
const active = () => WORKERS - freeSlots.length;

class QueueFullError extends Error {}
class QueueTimeoutError extends Error {}

function acquireSlot() {
  if (freeSlots.length > 0) {
    return Promise.resolve(freeSlots.pop());
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

function releaseSlot(slot) {
  const next = queue.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(slot); // hand the slot straight to the next job
  } else {
    freeSlots.push(slot);
  }
}

async function runCase(code, stdin, limits) {
  const slot = await acquireSlot();
  try {
    return await runCode(SANDBOX, code, stdin, limits, slot);
  } finally {
    releaseSlot(slot);
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

  try {
    // Cases of one submission run in parallel across free slots
    const results = await Promise.all(body.cases.map((c) => runCase(body.code, c.stdin || '', limits)));
    send(res, 200, { results });
  } catch (err) {
    if (err instanceof QueueFullError || err instanceof QueueTimeoutError) {
      send(res, 503, { error: 'Runner is busy. Please try again in a moment.', busy: true });
    } else {
      console.error('execute failed:', err);
      send(res, 500, { error: 'Runner internal error.' });
    }
  }
}

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/healthz') {
    return send(res, 200, { ok: true, sandbox: SANDBOX, workers: WORKERS, active: active(), queued: queue.length });
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

// Refuse to serve if the sandbox doesn't actually isolate code (e.g. nsjail on a
// platform without privileged containers): students would otherwise see bogus errors.
const failures = await selfTest(SANDBOX);
if (failures.length > 0) {
  console.error(`Sandbox self-test FAILED for RUNNER_SANDBOX=${SANDBOX}:`);
  for (const f of failures) console.error(`  - ${f}`);
  if (SANDBOX === 'nsjail') {
    console.error('nsjail needs a privileged container. On platforms without one (e.g. Railway) set RUNNER_SANDBOX=restricted.');
  }
  process.exit(1);
}
console.log(`Sandbox self-test passed (${SANDBOX}).`);

server.listen(PORT, () => {
  console.log(`JIT CodeArena runner listening on :${PORT} (sandbox=${SANDBOX}, workers=${WORKERS})`);
  if (SANDBOX === 'none') {
    console.warn('WARNING: sandbox disabled. Student code runs unisolated. Development use only.');
  }
});
