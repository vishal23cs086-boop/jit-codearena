// ==============================================================================
// JIT CodeArena Runner - Sandboxed Python process execution
// ==============================================================================
//
// Production mode ("nsjail"): every test case runs in a fresh nsjail with
//   - no network (new network namespace)
//   - read-only view of the Python install, nothing else from the host
//   - unprivileged uid, private /tmp, no /proc
//   - CPU, address-space, file-size, open-file and process limits
//
// Development mode ("none"): runs python3 directly with only a timeout.
// NOT safe for untrusted code; the server refuses to use it in production.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import path from 'node:path';

const MAX_OUTPUT_BYTES = 64 * 1024;
const PYTHON_BIN = process.env.RUNNER_PYTHON || (process.env.RUNNER_SANDBOX === 'none' ? 'python3' : '/usr/local/bin/python3');
const NSJAIL_BIN = process.env.RUNNER_NSJAIL || '/usr/local/bin/nsjail';
// amd64 has /lib64 (dynamic loader); arm64 doesn't, and mounting a missing path fails
const HAS_LIB64 = existsSync('/lib64');

// Wraps the student's program so syntax errors are reported separately from
// runtime errors, and tracebacks don't include the wrapper's own frames.
const WRAPPER = `
import sys, traceback, linecache
def __jit_main():
    with open("/box/main.py" if __JIT_BOX else sys.argv[1], encoding="utf-8") as f:
        src = f.read()
    linecache.cache["main.py"] = (len(src), None, src.splitlines(True), "main.py")
    try:
        code = compile(src, "main.py", "exec")
    except (SyntaxError, ValueError):
        traceback.print_exc(limit=0)
        sys.exit(90)
    try:
        exec(code, {"__name__": "__main__", "__builtins__": __builtins__})
    except SystemExit:
        raise
    except MemoryError:
        sys.stderr.write("MemoryError: memory limit exceeded\\n")
        sys.exit(91)
    except BaseException:
        et, ev, tb = sys.exc_info()
        traceback.print_exception(et, ev, tb.tb_next)
        sys.exit(1)
__jit_main()
`;

export const EXIT_COMPILE_ERROR = 90;
export const EXIT_MEMORY_ERROR = 91;

export async function prepareBox(code) {
  const dir = await mkdtemp(path.join(tmpdir(), 'jit-run-'));
  await writeFile(path.join(dir, 'main.py'), code, { mode: 0o644 });
  return {
    dir,
    cleanup: () => rm(dir, { recursive: true, force: true }),
  };
}

function buildCommand(mode, boxDir, { timeLimitMs, memoryLimitMb }) {
  const cpuSeconds = Math.max(1, Math.ceil(timeLimitMs / 1000));
  // Wall clock is generous (queueing noise, sleep-heavy code); CPU is the real limit
  const wallSeconds = cpuSeconds * 2 + 1;

  if (mode === 'none') {
    return {
      cmd: PYTHON_BIN,
      args: ['-I', '-B', '-c', `__JIT_BOX = False\n${WRAPPER}`, path.join(boxDir, 'main.py')],
      wallMs: wallSeconds * 1000,
    };
  }

  return {
    cmd: NSJAIL_BIN,
    args: [
      '--mode', 'o',
      '--really_quiet',
      '--hostname', 'sandbox',
      '--user', '65534', '--group', '65534',
      '--time_limit', String(wallSeconds),
      '--rlimit_cpu', String(cpuSeconds),
      '--rlimit_as', String(memoryLimitMb),
      '--rlimit_fsize', '1',
      '--rlimit_nofile', '32',
      '--rlimit_nproc', '64',
      '--rlimit_stack', '64',
      '--disable_proc',
      '--iface_no_lo',
      '--env', 'LANG=C.UTF-8',
      '--env', 'HOME=/tmp',
      '--bindmount_ro', '/usr',
      '--bindmount_ro', '/lib',
      ...(HAS_LIB64 ? ['--bindmount_ro', '/lib64'] : []),
      '--bindmount', '/dev/null',
      '--bindmount_ro', '/dev/urandom',
      '--bindmount_ro', `${boxDir}:/box`,
      '--tmpfsmount', '/tmp',
      '--cwd', '/box',
      '--',
      PYTHON_BIN, '-I', '-B', '-c', `__JIT_BOX = True\n${WRAPPER}`,
    ],
    wallMs: wallSeconds * 1000,
  };
}

/**
 * Runs the prepared program once with the given stdin.
 * Resolves to { status, stdout, stderr, timeMs, exitCode } and never rejects
 * for problems caused by the student's code.
 */
export function runOnce(mode, boxDir, stdin, limits) {
  const { cmd, args, wallMs } = buildCommand(mode, boxDir, limits);

  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let outputExceeded = false;
    let killedForTime = false;

    const child = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });

    // Backstop in case the sandbox's own wall-clock limit doesn't fire
    const hardTimer = setTimeout(() => {
      killedForTime = true;
      child.kill('SIGKILL');
    }, wallMs + 1000);

    const collect = (which) => (chunk) => {
      const current = which === 'out' ? stdout : stderr;
      if (current.length + chunk.length > MAX_OUTPUT_BYTES) {
        outputExceeded = true;
        child.kill('SIGKILL');
        return;
      }
      if (which === 'out') stdout = Buffer.concat([stdout, chunk]);
      else stderr = Buffer.concat([stderr, chunk]);
    };
    child.stdout.on('data', collect('out'));
    child.stderr.on('data', collect('err'));

    child.stdin.on('error', () => {}); // program may exit before reading all input
    child.stdin.end(stdin || '');

    child.on('error', (err) => {
      clearTimeout(hardTimer);
      resolve({
        status: 'INTERNAL_ERROR',
        stdout: '',
        stderr: `Runner could not start the sandbox: ${err.message}`,
        timeMs: 0,
        exitCode: null,
      });
    });

    child.on('close', (exitCode, signal) => {
      clearTimeout(hardTimer);
      const timeMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
      const cpuLimitMs = Math.max(1, Math.ceil(limits.timeLimitMs / 1000)) * 1000;
      const errText = stderr.toString('utf8');

      let status = 'SUCCESS';
      if (outputExceeded) status = 'OUTPUT_LIMIT';
      else if (killedForTime || timeMs >= wallMs) status = 'TIME_LIMIT';
      else if (exitCode === EXIT_COMPILE_ERROR) status = 'COMPILATION_ERROR';
      else if (exitCode === EXIT_MEMORY_ERROR || /\bMemoryError\b/.test(errText)) status = 'MEMORY_LIMIT';
      // SIGXCPU/SIGKILL from the CPU rlimit (nsjail reports 128+signal)
      else if (signal === 'SIGXCPU' || signal === 'SIGKILL' || exitCode === 152 || exitCode === 137) {
        status = timeMs >= cpuLimitMs * 0.9 ? 'TIME_LIMIT' : 'RUNTIME_ERROR';
      } else if (exitCode !== 0) status = 'RUNTIME_ERROR';

      resolve({
        status,
        stdout: stdout.toString('utf8'),
        stderr: status === 'TIME_LIMIT' && !errText ? 'Time limit exceeded.' : errText,
        timeMs,
        exitCode,
      });
    });
  });
}
