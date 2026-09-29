// ==============================================================================
// JIT CodeArena - In-browser Python runner (Pyodide in a Web Worker)
// ==============================================================================
// Used for the "Run" button so the server only does graded submissions.
// If Pyodide can't load (e.g. the CDN is blocked on the college network),
// runInBrowser() returns null and the caller falls back to /api/code/run.

export interface BrowserRunResult {
  status: 'SUCCESS' | 'RUNTIME_ERROR' | 'TIME_LIMIT' | 'MEMORY_LIMIT' | 'OUTPUT_LIMIT' | 'COMPILATION_ERROR';
  stdout: string;
  stderr: string;
  timeMs: number;
}

type WorkerState = 'loading' | 'ready' | 'failed';

const WORKER_URL = '/workers/python-worker.js';
// Give up on the browser runtime if it hasn't loaded by then
const LOAD_TIMEOUT_MS = 45000;

let worker: Worker | null = null;
let state: WorkerState = 'loading';
let readyPromise: Promise<boolean> | null = null;
let nextId = 1;

function startWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || typeof Worker === 'undefined' || typeof WebAssembly === 'undefined') {
    state = 'failed';
    return Promise.resolve(false);
  }

  state = 'loading';
  worker = new Worker(WORKER_URL, { type: 'module' });
  const w = worker;

  readyPromise = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => {
      state = 'failed';
      w.terminate();
      if (worker === w) worker = null;
      resolve(false);
    }, LOAD_TIMEOUT_MS);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'ready') {
        clearTimeout(timer);
        state = 'ready';
        w.removeEventListener('message', onMessage);
        resolve(true);
      } else if (e.data?.type === 'load-error') {
        clearTimeout(timer);
        state = 'failed';
        w.terminate();
        if (worker === w) worker = null;
        resolve(false);
      }
    };
    w.addEventListener('message', onMessage);
    w.addEventListener('error', () => {
      clearTimeout(timer);
      state = 'failed';
      if (worker === w) worker = null;
      resolve(false);
    });
  });

  return readyPromise;
}

/** Starts downloading Python in the background. Safe to call repeatedly. */
export function preloadBrowserPython(): void {
  if (!readyPromise) startWorker();
}

export function isBrowserPythonReady(): boolean {
  return state === 'ready';
}

/**
 * Runs code with the given stdin in the browser.
 * Returns null when in-browser Python is unavailable (caller should use the server).
 */
export async function runInBrowser(code: string, stdin: string, timeLimitMs: number): Promise<BrowserRunResult | null> {
  if (!readyPromise) startWorker();
  const ok = await readyPromise;
  if (!ok || !worker) return null;

  const w = worker;
  const id = nextId++;
  // The browser is slower than CPython; stop runaway loops, not honest code
  const wallLimitMs = Math.max(5000, timeLimitMs * 5);

  return new Promise<BrowserRunResult | null>((resolve) => {
    const timer = setTimeout(() => {
      w.removeEventListener('message', onMessage);
      // Only way to stop a running Python loop: kill the worker and start a fresh one
      w.terminate();
      if (worker === w) {
        worker = null;
        startWorker();
      }
      resolve({
        status: 'TIME_LIMIT',
        stdout: '',
        stderr: `Time limit exceeded: your program ran for more than ${Math.round(wallLimitMs / 1000)} seconds.`,
        timeMs: wallLimitMs,
      });
    }, wallLimitMs);

    const onMessage = (e: MessageEvent) => {
      if (e.data?.type !== 'result' || e.data.id !== id) return;
      clearTimeout(timer);
      w.removeEventListener('message', onMessage);
      resolve({
        status: e.data.status,
        stdout: e.data.stdout || '',
        stderr: e.data.stderr || '',
        timeMs: e.data.timeMs || 0,
      });
    };

    w.addEventListener('message', onMessage);
    w.postMessage({ id, code, stdin });
  });
}
