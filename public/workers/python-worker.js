// ==============================================================================
// JIT CodeArena - In-browser Python (Pyodide) worker for the "Run" button
// ==============================================================================
// Runs student code against the student's own input only. Hidden test cases are
// never sent to the browser; submissions are always graded on the server.
// Runs in a worker so an infinite loop can be stopped by terminating it.

const PYODIDE_URL = 'https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
const MAX_OUTPUT_CHARS = 64 * 1024;

// Same contract as the server runner's wrapper: syntax errors are reported
// separately and tracebacks only show the student's own frames.
const WRAPPER = `
import sys, traceback, linecache
def __jit_run(src):
    linecache.cache["main.py"] = (len(src), None, src.splitlines(True), "main.py")
    try:
        code = compile(src, "main.py", "exec")
    except (SyntaxError, ValueError):
        traceback.print_exc(limit=0)
        return "COMPILATION_ERROR"
    try:
        exec(code, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit as e:
        return "SUCCESS" if e.code in (None, 0) else "RUNTIME_ERROR"
    except MemoryError:
        sys.stderr.write("MemoryError: memory limit exceeded\\n")
        return "MEMORY_LIMIT"
    except BaseException:
        et, ev, tb = sys.exc_info()
        traceback.print_exception(et, ev, tb.tb_next)
        return "RUNTIME_ERROR"
    finally:
        sys.stdout.flush()
        sys.stderr.flush()
    return "SUCCESS"
`;

let pyodide = null;
let runFn = null;

// Loaded as a module worker: import() works in every current browser, whereas
// importScripts() from a CDN is blocked in some embedded browsers
async function init() {
  const { loadPyodide } = await import(PYODIDE_URL + 'pyodide.mjs');
  pyodide = await loadPyodide({ indexURL: PYODIDE_URL });
  pyodide.runPython(WRAPPER);
  runFn = pyodide.globals.get('__jit_run');
}

const ready = init().then(
  () => self.postMessage({ type: 'ready' }),
  (err) => self.postMessage({ type: 'load-error', error: String(err && err.message ? err.message : err) })
);

self.onmessage = async (event) => {
  const { id, code, stdin } = event.data || {};
  await ready;
  if (!runFn) return; // load failed; the page already knows

  let stdout = '';
  let stderr = '';
  let truncated = false;
  const decoder = new TextDecoder();
  const sink = (which) => ({
    write(buf) {
      const text = decoder.decode(buf, { stream: true });
      if (which === 'out') stdout += text;
      else stderr += text;
      if (stdout.length + stderr.length > MAX_OUTPUT_CHARS) {
        truncated = true;
        throw new Error('output limit');
      }
      return buf.length;
    },
  });

  // Drop anything a previous run left in Python's buffers (e.g. after the output limit cut it off)
  const discard = { write: (buf) => buf.length };
  pyodide.setStdout(discard);
  pyodide.setStderr(discard);
  try {
    pyodide.runPython('import sys\nfor _s in (sys.stdout, sys.stderr):\n    try:\n        _s.flush()\n    except Exception:\n        pass');
  } catch {}

  let stdinUsed = false;
  pyodide.setStdin({
    stdin: () => {
      if (stdinUsed) return undefined; // EOF
      stdinUsed = true;
      return stdin || '';
    },
  });
  pyodide.setStdout(sink('out'));
  pyodide.setStderr(sink('err'));

  const started = performance.now();
  let status;
  try {
    status = runFn(code || '');
  } catch (err) {
    status = truncated ? 'OUTPUT_LIMIT' : 'RUNTIME_ERROR';
    if (!truncated) stderr += String(err && err.message ? err.message : err);
  }
  const timeMs = Math.round(performance.now() - started);

  if (truncated) {
    status = 'OUTPUT_LIMIT';
    stdout = stdout.slice(0, MAX_OUTPUT_CHARS);
    stderr = 'Output limit exceeded.';
  }

  self.postMessage({ type: 'result', id, status, stdout, stderr, timeMs });
};
