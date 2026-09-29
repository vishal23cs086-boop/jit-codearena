// ==============================================================================
// JIT CodeArena Runner - load test
// ==============================================================================
// Simulates the end-of-exam rush: STUDENTS students each submit SUBMISSIONS
// times, every submission running CASES test cases, all starting within
// RAMP_SECONDS.
//
//   RUNNER_URL=http://server:8787 RUNNER_TOKEN=... STUDENTS=1000 node loadtest.mjs

const URL_ = (process.env.RUNNER_URL || 'http://localhost:8787').replace(/\/+$/, '');
const TOKEN = process.env.RUNNER_TOKEN || '';
const STUDENTS = Number(process.env.STUDENTS || 1000);
const SUBMISSIONS = Number(process.env.SUBMISSIONS || 3);
const CASES = Number(process.env.CASES || 10);
const RAMP_SECONDS = Number(process.env.RAMP_SECONDS || 60);

// A typical exam-style solution: read input, a bit of real work, print
const CODE = `
n = int(input())
nums = list(map(int, input().split()))
nums.sort()
total = 0
for i in range(n):
    total += nums[i] * (i + 1)
print(total)
`;

function makeCase(i) {
  const n = 2000 + i * 100;
  const nums = Array.from({ length: n }, (_, k) => (k * 7919 + i) % 10007);
  return { stdin: `${n}\n${nums.join(' ')}\n` };
}
const cases = Array.from({ length: CASES }, (_, i) => makeCase(i));

const latencies = [];
const counts = { ok: 0, busy: 0, error: 0, wrong: 0 };
const statuses = {};

async function submitOnce() {
  const started = Date.now();
  try {
    const res = await fetch(`${URL_}/v1/execute`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${TOKEN}` },
      body: JSON.stringify({ code: CODE, cases, timeLimitMs: 2000 }),
    });
    latencies.push(Date.now() - started);
    if (res.status === 503) return counts.busy++;
    if (!res.ok) return counts.error++;
    const data = await res.json();
    for (const r of data.results) statuses[r.status] = (statuses[r.status] || 0) + 1;
    if (data.results.every((r) => r.status === 'SUCCESS')) counts.ok++;
    else counts.wrong++;
  } catch {
    counts.error++;
  }
}

async function student() {
  await new Promise((r) => setTimeout(r, Math.random() * RAMP_SECONDS * 1000));
  for (let i = 0; i < SUBMISSIONS; i++) await submitOnce();
}

const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor((p / 100) * arr.length))] ?? 0;

console.log(`Load test: ${STUDENTS} students x ${SUBMISSIONS} submissions x ${CASES} cases, ramp ${RAMP_SECONDS}s -> ${URL_}`);
const t0 = Date.now();
const progress = setInterval(async () => {
  try {
    const h = await (await fetch(`${URL_}/healthz`)).json();
    process.stdout.write(`  t=${Math.round((Date.now() - t0) / 1000)}s active=${h.active} queued=${h.queued} done=${latencies.length}\n`);
  } catch {}
}, 5000);

await Promise.all(Array.from({ length: STUDENTS }, student));
clearInterval(progress);

const secs = (Date.now() - t0) / 1000;
latencies.sort((a, b) => a - b);
const total = STUDENTS * SUBMISSIONS;
console.log(`\nDone in ${secs.toFixed(1)}s`);
console.log(`Submissions: ${total}  ok=${counts.ok}  busy(503)=${counts.busy}  errors=${counts.error}  non-success=${counts.wrong}`);
console.log(`Throughput: ${(total / secs).toFixed(1)} submissions/s, ${((total * CASES) / secs).toFixed(1)} test cases/s`);
console.log(`Latency: p50=${pct(latencies, 50)}ms  p95=${pct(latencies, 95)}ms  p99=${pct(latencies, 99)}ms  max=${latencies.at(-1)}ms`);
console.log('Case statuses:', statuses);
