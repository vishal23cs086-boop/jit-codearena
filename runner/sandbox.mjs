// ==============================================================================
// JIT CodeArena Runner - Sandboxed Python process execution
// ==============================================================================
//
// RUNNER_SANDBOX selects how student code is isolated:
//
// "nsjail" (strongest; own server / college server, needs a privileged container)
//   Every test case runs in a fresh nsjail: no network, read-only view of the
//   Python install only, unprivileged uid, private /tmp, no /proc, rlimits.
//
// "restricted" (for platforms without privileged containers, e.g. Railway)
//   Every test case runs as its own unprivileged uid (one per worker slot, so
//   concurrent runs can't read each other's files or /proc), with an empty
//   environment, rlimits (CPU, memory, file size, open files, processes), and a
//   Python audit hook that blocks network, subprocesses, native code (ctypes),
//   /proc, /sys, and writes outside the run's own folder. The container must run
//   as root so it can switch to those uids.
//
// "none" (local development only): plain python3 with a timeout. NOT safe for
//   untrusted code; the server refuses it when NODE_ENV=production.

import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm, chown, chmod } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { existsSync } from 'node:fs';
import path from 'node:path';

const MAX_OUTPUT_BYTES = 64 * 1024;
const PYTHON_BIN = process.env.RUNNER_PYTHON || (existsSync('/usr/local/bin/python3') ? '/usr/local/bin/python3' : 'python3');
const NSJAIL_BIN = process.env.RUNNER_NSJAIL || '/usr/local/bin/nsjail';
// amd64 has /lib64 (dynamic loader); arm64 doesn't, and mounting a missing path fails
const HAS_LIB64 = existsSync('/lib64');
// Restricted mode: worker slot N runs as uid/gid UID_BASE + N
const UID_BASE = Number(process.env.RUNNER_UID_BASE || 20000);

export const EXIT_COMPILE_ERROR = 90;
export const EXIT_MEMORY_ERROR = 91;

// Wraps the student's program so syntax errors are reported separately from
// runtime errors and tracebacks don't include the wrapper's own frames.
// argv: <path to main.py> <mode> <cpu seconds> <memory MB>
const WRAPPER = String.raw`
import sys, os, traceback, linecache

def __jit_lockdown(box, cpu, mem_mb):
    import resource
    def lim(res, soft, hard):
        try:
            resource.setrlimit(res, (soft, hard))
        except (ValueError, OSError):
            pass
    lim(resource.RLIMIT_CPU, cpu, cpu + 1)
    lim(resource.RLIMIT_AS, mem_mb * 1024 * 1024, mem_mb * 1024 * 1024)
    lim(resource.RLIMIT_FSIZE, 1024 * 1024, 1024 * 1024)
    lim(resource.RLIMIT_NOFILE, 64, 64)
    lim(resource.RLIMIT_NPROC, 16, 16)
    lim(resource.RLIMIT_CORE, 0, 0)
    os.umask(0o077)

    blocked_modules = {
        "ctypes", "_ctypes", "cffi", "socket", "_socket", "ssl", "_ssl", "select",
        "selectors", "asyncio", "subprocess", "_posixsubprocess", "multiprocessing",
        "_multiprocessing", "concurrent", "pty", "fcntl", "termios", "resource", "mmap",
        "http", "urllib", "ftplib", "smtplib", "poplib", "imaplib", "telnetlib",
        "xmlrpc", "webbrowser", "_tkinter", "tkinter", "readline",
    }
    blocked_events = {
        "os.system", "os.exec", "os.posix_spawn", "os.spawn", "os.fork", "os.forkpty",
        "os.kill", "os.killpg", "os.startfile", "pty.spawn", "os.add_dll_directory",
        "os.chmod", "os.chown", "os.chflags", "os.symlink", "os.link", "os.truncate",
        "os.setxattr", "os.removexattr", "os.utime", "resource.setrlimit",
        "resource.prlimit", "shutil.rmtree", "sys.remote_exec",
    }
    blocked_prefixes = ("socket.", "ctypes.", "subprocess.", "_posixsubprocess.", "mmap.", "cffi.")
    box = os.path.realpath(box)
    safe_dev = {"/dev/null", "/dev/urandom", "/dev/random", "/dev/zero"}
    write_flags = os.O_WRONLY | os.O_RDWR | os.O_CREAT | os.O_APPEND | os.O_TRUNC
    realpath = os.path.realpath
    fsdecode = os.fsdecode

    def inside_box(p):
        return p == box or p.startswith(box + "/")

    def guard(event, args):
        if event == "import":
            name = (args[0] or "").split(".")[0]
            if name in blocked_modules:
                raise ImportError("import of '%s' is not allowed in the exam sandbox" % args[0])
            return
        if event in blocked_events or event.startswith(blocked_prefixes):
            raise PermissionError("%s is not allowed in the exam sandbox" % event)
        if event == "open":
            target, mode, flags = args
            if isinstance(target, int):
                return
            full = realpath(fsdecode(target))
            writing = (isinstance(mode, str) and any(c in mode for c in "wax+")) or (
                isinstance(flags, int) and flags & write_flags
            )
            if full.startswith(("/proc", "/sys")) or (full.startswith("/dev") and full not in safe_dev):
                raise PermissionError("access to %s is not allowed in the exam sandbox" % full)
            if writing and full not in safe_dev and not inside_box(full):
                raise PermissionError("writing %s is not allowed in the exam sandbox" % full)
        elif event in ("os.remove", "os.rename", "os.rmdir", "os.mkdir"):
            for a in args:
                if isinstance(a, (str, bytes)) and not inside_box(realpath(fsdecode(a))):
                    raise PermissionError("%s outside the run folder is not allowed" % event)

    sys.addaudithook(guard)

def __jit_main():
    src_path, mode = sys.argv[1], sys.argv[2]
    with open(src_path, encoding="utf-8") as f:
        src = f.read()
    linecache.cache["main.py"] = (len(src), None, src.splitlines(True), "main.py")
    if mode == "restricted":
        __jit_lockdown(os.path.dirname(src_path), int(sys.argv[3]), int(sys.argv[4]))
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
        sys.stderr.write("MemoryError: memory limit exceeded\n")
        sys.exit(91)
    except BaseException:
        et, ev, tb = sys.exc_info()
        traceback.print_exception(et, ev, tb.tb_next)
        sys.exit(1)

__jit_main()
`;

// Trusted supervisor: starts the student's process, waits for it, and reports
// the CPU time and peak memory the kernel measured (wait4) on fd 3. The student
// process doesn't inherit fd 3, so it can't forge these numbers, and CPU time
// doesn't grow when the server is busy (unlike wall-clock time).
// argv: <inner command...>. Exits 128+signal if the program was killed by a signal.
const SUPERVISOR = String.raw`
import os, sys, json
os.set_inheritable(3, False)
pid = os.posix_spawnp(sys.argv[1], sys.argv[1:], os.environ)
_, status, ru = os.wait4(pid, 0)
cpu_ms = round((ru.ru_utime + ru.ru_stime) * 1000)
rss_kb = ru.ru_maxrss // 1024 if sys.platform == "darwin" else ru.ru_maxrss
try:
    os.write(3, json.dumps({"cpu_ms": cpu_ms, "rss_kb": rss_kb}).encode())
except OSError:
    pass
code = os.waitstatus_to_exitcode(status)
os._exit(128 - code if code < 0 else code)
`;

function limitsFor({ timeLimitMs }) {
  const cpuSeconds = Math.max(1, Math.ceil(timeLimitMs / 1000));
  // Wall clock is generous (queueing noise, sleep-heavy code); CPU is the real limit
  return { cpuSeconds, wallMs: (cpuSeconds * 2 + 1) * 1000 };
}

/** Writes the program into a fresh folder, owned by the slot's uid in restricted mode. */
async function prepareBox(mode, code, slot) {
  const dir = await mkdtemp(path.join(tmpdir(), 'jit-run-'));
  const file = path.join(dir, 'main.py');
  await writeFile(file, code, { mode: 0o644 });
  if (mode === 'restricted' && process.getuid?.() === 0) {
    const uid = UID_BASE + slot;
    await chown(dir, uid, uid);
    await chown(file, uid, uid);
    await chmod(dir, 0o700);
    await chmod(file, 0o600);
  } else if (mode === 'nsjail') {
    await chmod(dir, 0o755); // read by the jail's unprivileged user via bind mount
  }
  return { dir, file, cleanup: () => rm(dir, { recursive: true, force: true }) };
}

function buildCommand(mode, box, limits, slot) {
  const { cpuSeconds, wallMs } = limitsFor(limits);
  const env = { LANG: 'C.UTF-8', HOME: box.dir, TMPDIR: box.dir, PATH: '/usr/local/bin:/usr/bin:/bin' };

  const supervised = (inner) => [PYTHON_BIN, '-I', '-S', '-c', SUPERVISOR, ...inner];

  if (mode === 'none') {
    return { cmd: PYTHON_BIN, args: supervised([PYTHON_BIN, '-I', '-B', '-c', WRAPPER, box.file, 'none']).slice(1), options: { env }, wallMs };
  }

  if (mode === 'restricted') {
    const options = { env, cwd: box.dir };
    if (process.getuid?.() === 0) {
      options.uid = UID_BASE + slot;
      options.gid = UID_BASE + slot;
    }
    return {
      cmd: PYTHON_BIN,
      args: supervised([
        PYTHON_BIN, '-I', '-B', '-c', WRAPPER, box.file, 'restricted', String(cpuSeconds), String(limits.memoryLimitMb),
      ]).slice(1),
      options,
      wallMs,
    };
  }

  return {
    cmd: NSJAIL_BIN,
    args: [
      '--mode', 'o',
      '--really_quiet',
      '--hostname', 'sandbox',
      '--user', '65534', '--group', '65534',
      '--time_limit', String(Math.ceil(wallMs / 1000)),
      '--rlimit_cpu', String(cpuSeconds),
      '--rlimit_as', String(limits.memoryLimitMb),
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
      '--bindmount_ro', `${box.dir}:/box`,
      '--tmpfsmount', '/tmp',
      '--cwd', '/box',
      '--pass_fd', '3',
      '--',
      ...supervised([PYTHON_BIN, '-I', '-B', '-c', WRAPPER, '/box/main.py', 'nsjail']),
    ],
    options: {},
    wallMs,
  };
}

/**
 * Runs the program once with the given stdin on worker slot `slot`.
 * Resolves to { status, stdout, stderr, timeMs, exitCode } and never rejects
 * for problems caused by the student's code.
 */
export async function runCode(mode, code, stdin, limits, slot = 0) {
  const box = await prepareBox(mode, code, slot);
  try {
    return await runProcess(buildCommand(mode, box, limits, slot), stdin, limits);
  } finally {
    box.cleanup().catch(() => {});
  }
}

function runProcess({ cmd, args, options, wallMs }, stdin, limits) {
  return new Promise((resolve) => {
    const started = process.hrtime.bigint();
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let outputExceeded = false;
    let killedForTime = false;

    let usage = '';
    // detached: own process group, so a kill reaches the student's process too
    const child = spawn(cmd, args, { ...options, detached: true, stdio: ['pipe', 'pipe', 'pipe', 'pipe'] });
    const killAll = () => {
      try {
        process.kill(-child.pid, 'SIGKILL');
      } catch {
        child.kill('SIGKILL');
      }
    };
    child.stdio[3].on('data', (chunk) => {
      if (usage.length < 1000) usage += chunk.toString('utf8');
    });

    // Backstop in case the sandbox's own limits don't fire
    const hardTimer = setTimeout(() => {
      killedForTime = true;
      killAll();
    }, wallMs + 1000);

    const collect = (which) => (chunk) => {
      const current = which === 'out' ? stdout : stderr;
      if (current.length + chunk.length > MAX_OUTPUT_BYTES) {
        outputExceeded = true;
        killAll();
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
      const wallTimeMs = Number((process.hrtime.bigint() - started) / 1_000_000n);
      const cpuLimitMs = limitsFor(limits).cpuSeconds * 1000;
      // CPU time from the supervisor (not inflated by server load); wall time if unavailable
      let measured = null;
      try {
        measured = JSON.parse(usage);
      } catch {}
      const timeMs = Number.isFinite(measured?.cpu_ms) ? measured.cpu_ms : wallTimeMs;
      const memoryKb = Number.isFinite(measured?.rss_kb) ? measured.rss_kb : null;
      const errText = stderr.toString('utf8');

      // A clean exit is never a time-limit failure: under heavy load this process
      // can notice the exit late, so elapsed time alone must not fail correct code.
      // TIME_LIMIT only when a limit actually killed the program.
      let status = 'SUCCESS';
      if (outputExceeded) status = 'OUTPUT_LIMIT';
      else if (exitCode === 0 && !signal) status = 'SUCCESS';
      else if (killedForTime) status = 'TIME_LIMIT';
      else if (exitCode === EXIT_COMPILE_ERROR) status = 'COMPILATION_ERROR';
      else if (exitCode === EXIT_MEMORY_ERROR || /\bMemoryError\b/.test(errText)) status = 'MEMORY_LIMIT';
      // SIGXCPU/SIGKILL from the CPU rlimit (nsjail reports 128+signal)
      else if (signal === 'SIGXCPU' || exitCode === 152) status = 'TIME_LIMIT'; // CPU limit
      else if (signal === 'SIGKILL' || exitCode === 137) {
        // Killed: by the hard CPU limit or nsjail's wall-clock limit (both time), or by memory pressure
        status = timeMs >= cpuLimitMs * 0.9 || wallTimeMs >= wallMs ? 'TIME_LIMIT' : 'RUNTIME_ERROR';
      } else if (exitCode !== 0) status = 'RUNTIME_ERROR';

      resolve({
        status,
        stdout: stdout.toString('utf8'),
        stderr: status === 'TIME_LIMIT' && !errText ? 'Time limit exceeded.' : errText,
        timeMs,
        memoryKb,
        exitCode,
      });
    });
  });
}

/**
 * Checks that the sandbox really isolates code before the server accepts work.
 * Returns a list of failures (empty = OK).
 */
export async function selfTest(mode) {
  const limits = { timeLimitMs: 2000, memoryLimitMb: 256 };
  const failures = [];
  const probe = async (label, code, check) => {
    const r = await runCode(mode, code, '', limits, 0);
    if (!check(r)) failures.push(`${label}: got ${r.status} ${JSON.stringify((r.stdout + r.stderr).slice(0, 200))}`);
  };

  await probe('runs Python', 'print(6 * 7)', (r) => r.status === 'SUCCESS' && r.stdout === '42\n');
  if (mode === 'none') return failures;

  await probe('blocks network', 'import socket\nsocket.create_connection(("1.1.1.1", 53), timeout=2)\nprint("CONNECTED")',
    (r) => !r.stdout.includes('CONNECTED'));
  await probe('blocks reading runner secrets', 'print(open("/proc/1/environ").read()[:20])', (r) => r.status !== 'SUCCESS');
  await probe('blocks subprocesses', 'import os\nos.system("echo PWNED")', (r) => !r.stdout.includes('PWNED'));
  if (mode === 'restricted') {
    await probe('runs unprivileged', 'import os\nprint(os.getuid())', (r) => r.status === 'SUCCESS' && r.stdout.trim() !== '0');
  }
  return failures;
}
