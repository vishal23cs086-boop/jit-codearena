# JIT CodeArena Runner

Sandboxed Python execution service that replaces Judge0 for graded submissions.

```
Student browser ── "Run" with custom input ──► Pyodide (Python in the browser, no server work)
      │
      ├── "Run" (test cases) ──┐
      └── "Submit" ────────────┴─► Next.js /api/code/* ──► Runner /v1/execute ──► sandbox ─► python3
                                   (hidden test cases stay     one request per run/submission,
                                    on the server)             test cases run in parallel
```

## Sandbox modes (`RUNNER_SANDBOX`)

| | `nsjail` (college / own server) | `restricted` (Railway) |
|---|---|---|
| Needs | Docker with `privileged: true` | Any Docker host, container runs as root |
| Network | None (own network namespace) | Blocked in Python (socket, urllib, http, ssl…) |
| Files | Only the Python install + the program | Whole container readable (no secrets in it); writes only in the run's own folder |
| Other runs / runner secrets | Invisible | Separate uid per worker; `/proc` blocked; empty environment |
| Subprocess / native code | Blocked by namespaces | Blocked (os.system, subprocess, fork, ctypes…) |
| CPU / memory / output / file size | Enforced | Enforced |

Both modes run a **self-test at startup** (runs Python, can't reach the network,
can't read runner secrets, can't spawn processes) and refuse to start if it fails.
Example: `nsjail` on Railway exits with "nsjail needs a privileged container".

Use `nsjail` wherever you can run a privileged container; `restricted` is the
fallback for platforms that don't allow one.

## Deploy on Railway (restricted mode)

1. Service → **Settings → Source**: Root Directory `/runner`, branch `main`.
2. **Settings → Config-as-code**: Railway Config File `/runner/railway.json`
   (Railway does not look inside the Root Directory for it).
3. **Variables**:
   - `RUNNER_SANDBOX` = `restricted`
   - `RUNNER_TOKEN` = output of `openssl rand -hex 32`
   - optional `RUNNER_WORKERS` = number of vCPUs on your plan
4. **Settings → Networking → Generate Domain** (target port: the `PORT` Railway
   assigns; the server listens on it automatically).
5. Deploy. The logs must show `Sandbox self-test passed (restricted).`
   Check `https://<your-domain>/healthz`.

## Deploy on the college server (nsjail mode)

Size for 1,000 students: **8+ vCPU / 16 GB RAM**, Ubuntu 22.04/24.04 with Docker.

```bash
git clone <this repo> && cd <repo>/runner
echo "RUNNER_TOKEN=$(openssl rand -hex 32)" > .env
docker compose up -d --build
curl localhost:8787/healthz
```

Put it behind HTTPS (Caddy/nginx) or firewall port 8787 to the app's IPs.

## Connecting the app (Vercel)

In Vercel → Settings → Environment Variables (Production):

```env
RUNNER_URL=https://<railway-domain or college server>
RUNNER_TOKEN=<same value as the runner's RUNNER_TOKEN>
```

Redeploy the Vercel project after changing them. **Switching from Railway to
the college server later = change these two values and redeploy.** Nothing else
in the app changes. Remove both to fall back to Judge0.

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
| `RUNNER_WORKERS` | CPU count − 1 | Test cases run at once |
| `RUNNER_MAX_QUEUE` | 5000 | Waiting test cases before returning 503 |
| `RUNNER_QUEUE_TIMEOUT_MS` | 45000 | Max wait for a slot before 503 |
| `RUNNER_SANDBOX` | `nsjail` | `restricted` for Railway; `none` = unsafe dev mode |
| `RUNNER_UID_BASE` | 20000 | restricted mode: worker N runs as uid BASE+N |
