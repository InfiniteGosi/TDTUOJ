# TDTUOJ — Operations Playbook

> Survival guide for running, accessing, and demoing the TDTUOJ system without help.
> Last synced with the repo: 2026-07-02.
>
> Monorepo root: `D:\OJ` · Backend: `TDTUOJ_backend/` (Spring Boot, :8090) · Frontend: `tdtuoj_frontend/` (React/Vite, :5173)

---

## 1. The two environments

| | **Local (your laptop)** | **Live (production)** |
|---|---|---|
| Frontend | http://localhost:5173 | https://tdtuoj.me (also https://tdtuoj.vercel.app) |
| Backend API | http://localhost:8090/api | https://api.tdtuoj.me/api |
| Swagger UI | http://localhost:8090/swagger-ui/index.html | https://api.tdtuoj.me/swagger-ui/index.html |
| OpenAPI JSON | http://localhost:8090/v3/api-docs | https://api.tdtuoj.me/v3/api-docs |
| Actuator | http://localhost:8090/actuator | https://api.tdtuoj.me/actuator |
| Raw Prometheus metrics | http://localhost:8090/actuator/prometheus | https://api.tdtuoj.me/actuator/prometheus |
| Judge0 | http://localhost:2358 | internal only (compose network) |
| Grafana | http://localhost:3000 | not deployed (local demo only) |
| Prometheus | http://localhost:9090 | not deployed (local demo only) |

Backend admin login: user **KhangHo** (role ADMIN). Same account works local + live once DB seeded.

---

## 2. Quick access — the UIs you asked about

### Swagger UI (API explorer / docs)
- Local: start backend (§3), open **http://localhost:8090/swagger-ui/index.html**
- Live: **https://api.tdtuoj.me/swagger-ui/index.html** (VM must be running — see §7)
- To call protected endpoints: `POST /api/auth/login` in Swagger → copy the `token` from the
  response → click **Authorize** (top right) → paste `Bearer <token>`.

### Grafana (live metrics dashboard) — local demo only
1. Backend must be running on :8090 first.
2. `cd D:\OJ\monitoring && docker compose up -d`
3. Open **http://localhost:3000** → login **admin / admin** → click **Skip** on the password prompt.
4. Dashboards → **TDTUOJ — Load & Health**. Top-right: range = Last 15 min, refresh = 5s.
5. Panels are empty until traffic flows — drive load with k6 (§6).
- Full walkthrough + defense script: [../monitoring/RUNBOOK.md](../monitoring/RUNBOOK.md)

### Prometheus (metrics store behind Grafana)
- **http://localhost:9090** → Status → Targets → job `tdtuoj` should be **UP**.
- If DOWN: backend on :8090 isn't running.

---

## 3. Run the system locally

Prereqs (Docker containers): PostgreSQL on **:5431** (`tdtuoj`, user `admin`/`admin123`),
Redis on **:6379**, Judge0 on **:2358**.

```powershell
# DB + Redis (from the bundled compose)
cd D:\OJ\TDTUOJ_backend\tdtuoj-db
docker compose up -d

# Backend  (reads secrets from TDTUOJ_backend/.env)
cd D:\OJ\TDTUOJ_backend
./mvnw spring-boot:run          # → http://localhost:8090
# to disable rate limiting for a queue/submit demo:
#   $env:RATELIMIT_ENABLED='false'; ./mvnw spring-boot:run

# Frontend
cd D:\OJ\tdtuoj_frontend
npm install
npm run dev                     # → http://localhost:5173
```

Judge0 is a separate stack — for local judging you need it on :2358. Easiest is to run the
live `deploy/docker-compose.yml` Judge0 services, or point the backend at the live VM. If
Judge0 is down, browsing works but submissions won't judge.

### Build verification (do this before committing code)
- Frontend: `cd tdtuoj_frontend && npm run build`
- Backend: `cd TDTUOJ_backend && ./mvnw compile -q`

---

## 4. Live deployment — what runs where

- **Frontend:** Vercel, root `tdtuoj_frontend/`, auto-deploys on every push to `main`.
  Env vars in Vercel: `VITE_API_BASE_URL=https://api.tdtuoj.me/api`, `VITE_GOOGLE_CLIENT_ID`.
- **Backend + Judge0 + Postgres + Redis + Caddy:** one Azure VM, all via `docker compose`.
  Only Caddy publishes ports 80/443; everything else is on the private `tdtuoj` network.
  Caddy auto-issues HTTPS (Let's Encrypt) for `api.tdtuoj.me`.

The 8 containers: `backend`, `app-db`, `app-redis`, `caddy`, `judge0-server`, `judge0-workers`,
`judge0-db`, `judge0-redis`.

Full runbook: [../deploy/README.md](../deploy/README.md) · Strategy/history: [../feat/DEPLOYMENT-STRATEGY.md](../feat/DEPLOYMENT-STRATEGY.md)

---

## 5. The Azure VM — access & control

| Item | Value |
|---|---|
| VM name | `vm-tdtuoj` (resource group `tdtuoj`) |
| Size / region | `Standard_B2as_v2` (2 vCPU / 8 GiB, x86), Malaysia West |
| OS | Ubuntu 24.04 |
| SSH user | `gosi` |
| Static public IP | `172.197.160.31` |
| SSH key | `D:\VM-keys\vm-tdtuoj_key.pem` |
| Domain | `tdtuoj.me` on Namecheap (BasicDNS). A `api` → `172.197.160.31`; A `@` → Vercel `216.198.79.1` |

```powershell
# SSH in
ssh -i D:\VM-keys\vm-tdtuoj_key.pem gosi@172.197.160.31

# On the VM — check / restart the stack
cd ~/TDTUOJ/deploy
docker compose ps
docker compose up -d          # bring up anything down
docker compose logs -f backend
```

### Cost control (IMPORTANT)
- **Stop when not demoing:** Azure Portal → `vm-tdtuoj` → **Stop** → must reach
  **"Stopped (deallocated)"** for compute to hit $0. `sudo shutdown` does NOT stop billing.
- **Start again:** Portal → Start → SSH in → containers auto-restart. Same IP, data persists.
- Idle cost (deallocated) ≈ $5–9/mo (disk + static IP only).

### Redeploy the backend
- **Automatic:** push to `main` touching `TDTUOJ_backend/**` or `deploy/**` → GitHub Actions
  (`.github/workflows/deploy.yml`) builds + SSHes in + `docker compose up -d --build`.
  Requires repo secrets `VM_HOST`, `VM_USER`, `VM_SSH_KEY`, and the **VM must be running**.
- **Manual:** `cd ~/TDTUOJ && git pull --ff-only && cd deploy && docker compose up -d --build`

---

## 6. Load / stress testing (k6)

k6 binary expected at `C:\Program Files\k6\k6.exe`.

```powershell
cd D:\OJ\tests\k6\stress
.\run-stress.ps1 -Scenario browse                                   # read load
.\run-stress.ps1 -Scenario submit -Email <email> -Password <pw> -ProblemId 3   # judging (rate limit OFF + Judge0 up)
.\run-stress.ps1 -Scenario ratelimit                                # burst (rate limit ON)
```

Watch it live in Grafana (§2). Reading the panels + a full defense narrative:
[../monitoring/RUNBOOK.md](../monitoring/RUNBOOK.md).

Watch the Redis judging queue directly:
```powershell
docker exec -it tdtuoj-redis redis-cli LLEN submissions:queue
```

---

## 7. "It's broken" — first checks

| Symptom | Check / fix |
|---|---|
| `https://api.tdtuoj.me` down | VM deallocated → start it in Azure Portal (§5). Then `docker compose ps` on VM. |
| Swagger 401 on endpoints | Log in via `/api/auth/login`, then **Authorize** with `Bearer <token>`. |
| Grafana won't load | `cd D:\OJ\monitoring && docker compose up -d`. |
| Grafana panels "No data" | Backend down or Prometheus target DOWN → http://localhost:9090/targets + start backend. |
| Submissions never judge | Judge0 down. Live: `docker compose logs judge0-server` on VM. Local: Judge0 not on :2358. |
| Judge0 won't run on a new VM | Needs cgroup v1 `memory` controller + privileged. **Do not `apt autoremove` the pinned 6.8-azure kernel.** Full fix in [../deploy/README.md](../deploy/README.md) "Judge0 gotchas". |
| Rate limit blocking a demo | Restart backend with `$env:RATELIMIT_ENABLED='false'`. |

---

## 8. Secrets & config — where they live

- **Local backend:** `TDTUOJ_backend/.env` (gitignored, loaded via `spring-dotenv`).
- **VM backend:** `~/TDTUOJ/deploy/.env` + `~/TDTUOJ/deploy/judge0.conf` (both gitignored,
  filled by hand on the VM). Templates: `deploy/.env.example`, `deploy/judge0.conf.example`.
- **Never committed.** Keys reused from local `.env` (rotation deferred).
- Config keys needed: `DOMAIN`, `APP_DB_USER/PASSWORD`, `SECRET_JWT_STRING`, `AWS_S3_*`,
  `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID`.

### External services this system needs
| Service | Purpose | Where |
|---|---|---|
| PostgreSQL | app data | VM container `app-db` / local :5431 |
| Redis | cache + rate limit + judging queue | VM container `app-redis` / local :6379 |
| Judge0 CE | code execution | VM containers / local :2358 (x86 only) |
| AWS S3 (`ap-southeast-1`, bucket `tdtu-oj`) | avatars/files | AWS |
| Gemini API | hints, PDF extraction, test-case gen | Google AI |

---

## 9. Rate-limit tiers (from `application.yml`, per 60s window)

| Tier | Anonymous | Authenticated | Applies to |
|---|---|---|---|
| default | 60 | 120 | everything else |
| read-heavy | 120 | 240 | GET problems/contests/users/organizations |
| auth | 5 | 10 | login / register / google |
| submission | 3 | 10 | POST /api/submissions/** |
| visualizer | 5 | 20 | POST /api/visualize |
| ai | 0 | 10 | /api/hints, /api/problem-ai/** (anon blocked) |
| admin | 0 | 300 | /api/admin/** |

Toggle globally with env `RATELIMIT_ENABLED=true|false`.

---

## 10. Key repo docs (read these if this playbook isn't enough)

- [../CLAUDE.md](../CLAUDE.md) — full architecture, package map, tech stack, conventions.
- [../deploy/README.md](../deploy/README.md) — VM setup + Judge0 cgroup/kernel gotcha.
- [../feat/DEPLOYMENT-STRATEGY.md](../feat/DEPLOYMENT-STRATEGY.md) — why-decisions, VM lifecycle, history.
- [../monitoring/README.md](../monitoring/README.md) + [../monitoring/RUNBOOK.md](../monitoring/RUNBOOK.md) — monitoring stack + demo script.
</content>
</invoke>
