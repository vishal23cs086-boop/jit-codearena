# JIT CodeArena Runner

Sandboxed Python execution service that replaces Judge0 for graded submissions.

```
Student browser ── "Run" ──► Pyodide (Python in the browser, no server work)
      │
      └── "Submit" ──► Next.js /api/code/submit ──► Runner /v1/execute ──► nsjail ─► python3
                         (hidden test cases stay         one request per submission,
                          on the server)                 test cases run in parallel
```

## What the sandbox enforces (per test case)

| Limit | Value |
|---|---|
| Network | None (own network namespace, no interfaces) |
| File system | Read-only Python install + the student's file; private `/tmp` |
| User | Unprivileged `nobody` inside the jail |
| CPU time | Question's time limit (rounded up to whole seconds) |
| Wall clock | 2 × CPU limit + 1 s |
| Memory | 256 MB address space (max 512) |
| Output | 64 KB stdout/stderr |
| Files / processes | 32 open files, 64 processes, no file writes outside `/tmp` |

## Deploy (Linux server, Docker)

Size: 1,000 students → **8 vCPU / 16 GB RAM** is comfortable. Ubuntu 22.04/24.04.

```bash
# on the server
git clone <this repo> && cd <repo>/runner
echo "RUNNER_TOKEN=$(openssl rand -hex 32)" > .env
docker compose up -d --build
curl localhost:8787/healthz
```

Then set these in the Next.js app (`.env.local` / Vercel env vars), using the same token:

```env
RUNNER_URL=https://runner.your-college.edu    # or http://SERVER_IP:8787
RUNNER_TOKEN=<value from runner/.env>
```

Remove both to fall back to Judge0.

**Network:** only the Next.js app needs to reach port 8787. Put it behind HTTPS
(Caddy/nginx) or restrict it with a firewall to your app's IPs. The token
protects it either way, but don't leave it open over plain HTTP on the internet.

## Before the real exam: load test on the actual server

```bash
RUNNER_URL=http://SERVER_IP:8787 RUNNER_TOKEN=... STUDENTS=1000 SUBMISSIONS=3 CASES=10 RAMP_SECONDS=600 node loadtest.mjs
```

Look for `busy(503)=0`, `errors=0`, and a p95 latency you're happy with. If the
queue keeps growing, add CPU cores (throughput scales ~linearly with workers).

## Local development (macOS, no sandbox)

```bash
cd runner
RUNNER_TOKEN=$(openssl rand -hex 32) npm run dev
```

`RUNNER_SANDBOX=none` runs student code **without isolation**. It is for your
own machine only; the server refuses to start that way when `NODE_ENV=production`.

## Settings

| Env var | Default | |
|---|---|---|
| `RUNNER_TOKEN` | (required) | Shared secret, 32+ chars |
| `RUNNER_WORKERS` | CPU count | Test cases run at once |
| `RUNNER_MAX_QUEUE` | 5000 | Waiting test cases before returning 503 |
| `RUNNER_QUEUE_TIMEOUT_MS` | 45000 | Max wait for a slot before 503 |
| `RUNNER_SANDBOX` | `nsjail` | `none` = unsafe dev mode |
