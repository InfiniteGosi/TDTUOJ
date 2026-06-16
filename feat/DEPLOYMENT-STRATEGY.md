# TDTUOJ — Deployment Strategy (for thesis defense)

> Goal: deploy live system + write a "Triển khai" section in thesis. Defense in ~2 months
> (from 2026-06-02, so target ~early Aug 2026). Status (2026-06-16): **LIVE.** Backend stack
> running on Azure VM behind HTTPS (`https://api.tdtuoj.me`), Judge0 judging works, frontend
> on Vercel (`https://tdtuoj.vercel.app`). Remaining: seed content, CI secrets, custom apex
> domain, thesis "Triển khai" section.

## TL;DR decision
- **Deploy: YES.** Live demo strengthens thesis; adds Deployment section + screenshots.
- **Host whole backend stack on ONE VM** via `docker compose` (backend + Judge0 + Postgres + Redis).
- **VM: Azure for Students $100 credit** (.edu email, no credit card) — **PRIMARY**. Pick an
  **x86 size** (B-series Intel/AMD, e.g. `Standard_B2s` 2 vCPU/4GB) because **Judge0 CE official
  images are x86_64 only**. Do NOT pick an Ampere ARM size (`Bpsv2`) → Judge0 won't run there
  without building isolate from source. DigitalOcean $200 / Oracle = fallback only.
- **Frontend on Vercel** (auto-deploy on git push).
- **CI/CD: GitHub Actions** — push to `main` → frontend auto-deploys on Vercel, backend
  auto-redeploys via SSH-into-VM action.

## The hard constraints: Judge0
1. Judge0 needs **Docker with `--privileged`** (isolate/cgroups sandbox).
   - Most free PaaS (Render, Railway, Vercel, Heroku-likes) **block privileged containers** →
     Judge0 will NOT run there. => Must use a **real VM**, not a PaaS, for judging.
2. Judge0 CE official images are **x86_64 only**. => VM must be **x86**, not ARM.
   - Rules out Oracle's ARM box AND Azure's Ampere `Bpsv2` ARM sizes. Pick an Azure x86 B-series
     (Intel/AMD) size → primary.

## Free hosting options

| Component | Tool | Note |
|---|---|---|
| Whole stack (1 VM) | **Azure for Students** | $100 credit, no card, .edu email. PICK x86 B-series (Judge0 x86-only). Credit + student status expire (~12 mo). PRIMARY. |
| VM alt | DigitalOcean ($200/yr) | Via GitHub Student Developer Pack. 1-year window. x86. Fallback. |
| VM alt | Oracle Cloud Always Free | ARM Always Free box = Judge0 won't run (x86-only). Only the AMD x86 micro (1GB) usable but tight. Fallback. |
| Frontend | Vercel / Netlify / Cloudflare Pages | Free, auto-deploy on push. |
| Postgres (managed) | Neon / Supabase | Only if not self-hosting on the VM. |
| Redis (managed) | Upstash | Free serverless; only if not self-hosting. |
| File storage | Cloudflare R2 (10GB, no egress) / AWS S3 free 5GB | R2 preferred. |
| Judge0 (no VM) | Judge0 on RapidAPI | Free tier ~50 req/day. Demo only, not real load. |

## Chosen setup
- **Azure for Students x86 VM** (PICKED) — `Standard_B2as_v2` (2 vCPU / 8 GiB, AMD x86),
  region **Malaysia West** (KL — low latency from Vietnam, ~$62.42/mo; cheaper than Southeast
  Asia/Singapore, same latency), Ubuntu 22.04+ → Docker Compose: backend + Judge0
  (+ its db/redis) + Postgres + Redis + Caddy. Fallback region if any size/quota missing
  (Malaysia West is new): Southeast Asia (Singapore).
- **8 GiB RAM** comfortably fits all 7 containers (Judge0 isolate compilation wants headroom).
  Optional 2–4 GB swap as a safety margin, no longer load-bearing.
- **Vercel** → React frontend, points at backend URL.
- **Cloudflare R2** → file/avatar storage.
- **Caddy** reverse proxy on VM → auto HTTPS (Let's Encrypt) + domain.
- Cost: **Azure PAYG bills compute per-hour ONLY while the VM is running.** $62.42/mo is the
  rate if left on 24/7 — NOT a flat charge. At ~$0.086/hr, a defense demo of ~20 test hours
  burns ≈ $2 compute. **Deallocate (Stop) the VM from the Azure Portal / `az vm deallocate`
  when not demoing** → compute billing → $0. Idle cost = only disk (Std SSD ~$2–5/mo) + static
  IP (~$3–4/mo) ≈ $5–9/mo regardless. $100 student credit stretches far past defense.
  - **Gotcha:** OS-level `shutdown` keeps the VM *allocated* → still billed. Must **deallocate**
    (Portal Stop button or `az vm deallocate`) to actually stop compute charges.
- Fallback: DigitalOcean $200 x86 droplet (GitHub Student Pack) or Oracle AMD x86 micro (1GB = tight).
  Oracle ARM big box + Azure ARM `Bpsv2` NOT usable (Judge0 x86-only).

## Deployment artifacts (DONE — written + committed-ready, backend compiles clean)
- `TDTUOJ_backend/Dockerfile` — multi-stage Maven build → JRE 21 runtime, non-root user.
- `TDTUOJ_backend/.dockerignore` — keeps target/.env/git out of build context.
- `deploy/docker-compose.yml` — backend + app Postgres + app Redis + Judge0 (server, workers,
  its own db + redis) + Caddy. Pinned `platform: linux/amd64`. Only Caddy publishes 80/443.
- `deploy/Caddyfile` — reverse proxy → backend:8090 + auto HTTPS.
- `deploy/.env.example` — app secrets template (real `deploy/.env` gitignored).
- `deploy/judge0.conf.example` — Judge0 internal db/redis config template (real one gitignored).
- `deploy/.gitignore` — blocks `.env` + `judge0.conf`.
- `deploy/README.md` — VM setup runbook + Judge0 cgroup-v2 gotcha.
- `.github/workflows/deploy.yml` — CI build gate (unit tests, skips `@SpringBootTest`) + SSH redeploy.
- **Code change:** `application.yml` → `judge0.api.url: ${JUDGE0_API_URL:http://localhost:2358}`
  so backend finds Judge0 over the compose network. **Local dev unaffected** — default stays
  `localhost:2358`, var unset locally, so `./mvnw spring-boot:run` works as before.

## Frontend made deploy-ready (DONE 2026-06-11)
- `tdtuoj_frontend/src/services/ApiService.js` — `BASE_URL` + `JUDGE0_BASE_URL` now read
  `import.meta.env.VITE_API_BASE_URL` / `VITE_JUDGE0_BASE_URL` with localhost fallback.
  Local dev unaffected (vars unset → localhost). Frontend build verified clean.
- Vercel env vars needed: `VITE_API_BASE_URL=https://<domain>/api`,
  `VITE_GOOGLE_CLIENT_ID=<id>` (already env-driven in Login/RegisterPage). Leave
  `VITE_JUDGE0_BASE_URL` unset — only `getLanguage` (dropdown names) hits Judge0 directly
  and it falls back to the raw lang key on failure; `executeCode` is dead code.
- CORS is already `allowedOrigins("*")` in `common/security/CorsConfig` → Vercel origin NOT
  blocked. (App uses JWT-in-header, not cookies, so wildcard is fine. Non-issue.)

## Decisions (updated 2026-06-12 — switched to Azure; VM size bumped to `B2as_v2` 8 GiB)
- **VM: Azure for Students $100 credit** (PRIMARY — Judge0 CE x86-only, so pick x86 B-series, NOT
  ARM `Bpsv2`). Switched from DigitalOcean (now fallback) per available student credit.
- **Domain: free `.me` from GitHub Student Pack's Namecheap offer** (real TLD, Google-OAuth-accepted,
  free 1 yr — most cost-effective; Student Pack still usable independent of VM host). DNS A record →
  Azure VM public IP, Caddy issues HTTPS. (Reserve a static public IP on the VM so the A record
  survives a stop/deallocate.)

## DONE (provisioned + deployed, 2026-06-16)
- **Azure VM created:** `vm-tdtuoj`, `Standard_B2as_v2` (2 vCPU/8 GiB, x64), Malaysia West,
  Ubuntu 24.04, resource group `tdtuoj`. User `gosi`. SSH key at `D:\VM-keys\vm-tdtuoj_key.pem`.
  **Static public IP `172.197.160.31`.** NSG 22/80/443 open.
- **Docker stack up:** all 8 containers via `docker compose` (backend, app-db, app-redis,
  caddy, judge0-server/workers/db/redis). HTTPS issued by Caddy (Let's Encrypt) for `api.tdtuoj.me`.
- **Domain:** `tdtuoj.me` on **Namecheap** (BasicDNS). A record `api` → `172.197.160.31`.
  Apex `tdtuoj.me` still pointed at GitHub Pages (not yet moved to Vercel).
- **Judge0 cgroup/kernel fix (the hard part):** isolate 1.8.1 needs cgroup v1 `memory` controller.
  24.04's `linux-azure` 6.17 ships `CONFIG_MEMCG_V1=n` → had to install + GRUB-pin GA kernel
  `linux-image-6.8.0-1059-azure` (+ `systemd.unified_cgroup_hierarchy=0 cgroup_enable=memory`,
  + `GRUB_FORCE_PARTUUID=` to defeat Azure's initrdless boot). Judging now returns Accepted.
  Full runbook in `deploy/README.md` "Judge0 gotchas". **Do not `apt autoremove` the 6.8 kernel.**
- **Secrets filled** on VM in `deploy/.env` + `deploy/judge0.conf` (gitignored). **Keys NOT rotated**
  — reused the existing AWS/LLM keys from `TDTUOJ_backend/.env` (`.env` was never committed, so
  no git exposure; rotation still good hygiene, deferred).
- **Frontend on Vercel:** `https://tdtuoj.vercel.app`, root `tdtuoj_frontend/`, env vars
  `VITE_API_BASE_URL=https://api.tdtuoj.me/api` + `VITE_GOOGLE_CLIENT_ID` set. Auto-deploys on push.
- **Google OAuth:** added `https://tdtuoj.vercel.app` to Authorized JavaScript origins.
- **Frontend fix:** `LanguageSelector` no longer calls Judge0 at `localhost:2358` from the browser
  (CORS-failed + hung dropdown on the live site) — now uses a static `LANGUAGE_NAMES` map
  (`constants.js`). Committed + pushed.
- **Admin seeded:** fresh DB chosen (start-from-empty). User `KhangHo` registered, promoted to
  ADMIN via `INSERT INTO users_roles` (role names: ADMIN/CREATOR/PARTICIPANT, no prefix;
  join table `users_roles(user_id, role_id)`, DB `tdtuoj`, db-user `admin`).

## NOT done yet
- **Content:** DB is empty (fresh start) — problems/contests to be created via the admin UI.
- **GitHub repo secrets** (`VM_HOST=172.197.160.31`, `VM_USER=gosi`, `VM_SSH_KEY`) not set →
  CI auto-deploy (`.github/workflows/deploy.yml`) won't run until added. (VM must be running for CI.)
- **Custom apex domain:** `tdtuoj.me` / `www` not yet pointed at Vercel (still GitHub Pages records).
  When moved, also add `https://tdtuoj.me` to Google OAuth origins.
- **Key rotation** (optional) — reused existing keys; rotate AWS/LLM before any wider exposure.
- **Thesis "Triển khai" section** — not written yet.

## Feasibility (2 months)
- Actual deploy work ≈ 1–3 days, not weeks:
  - Day 1: provision Azure VM, install Docker, `docker compose up` (backend+Judge0+PG+Redis).
  - Day 2: frontend on Vercel, domain + HTTPS (Caddy), smoke test.
  - Day 3: buffer (env vars / CORS / Judge0 quirks).
- Real risk = leaving it to the last week. **Deploy early, keep running, iterate.**

## CI/CD on code change (CHOSEN: GitHub Actions)
Push to `main` → both tiers update automatically. No manual SSH.

- **Frontend (Vercel):** auto-deploys on every `git push`. Built-in, zero config beyond linking repo.
- **Backend (VM):** `.github/workflows/deploy.yml` (as written) — on push to `main` touching
  `TDTUOJ_backend/**`, `deploy/**`, or the workflow:
  1. **build gate:** `./mvnw -B clean package -Dtest='!TdtuojApplicationTests'` — compiles +
     runs Mockito unit tests, skips the full-context `@SpringBootTest` (needs PG/Redis CI lacks).
  2. **deploy:** `appleboy/ssh-action` → on VM: `cd ~/TDTUOJ && git pull --ff-only &&
     cd deploy && docker compose up -d --build && docker image prune -f`.
- **Secrets:** GitHub repo secrets `VM_HOST`, `VM_USER`, `VM_SSH_KEY`. App/Judge0 secrets live
  in `deploy/.env` + `deploy/judge0.conf` ON THE VM (gitignored) — never in git.
- Manual fallback (if Actions down): SSH in, run
  `cd ~/TDTUOJ && git pull --ff-only && cd deploy && docker compose up -d --build`.
- Keep `docker-compose.yml` in repo → deploy is reproducible, rebuild from scratch anytime.

## Credits running out before defense?
- Azure for Students $100: `B2as_v2` (2 vCPU / 8GB) ≈ $62.42/mo IF running 24/7. But Azure
  bills compute per-hour only while running — **deallocate between demo sessions** and real
  burn is a few $ total (idle = only disk + IP, ~$5–9/mo). Credit stretches well past defense.
- Watch the **12-month student-credit/status expiry**, not just the dollar amount.
- If credit gets tight: fall back to DigitalOcean $200 (Student Pack) — same `docker compose`, ~15 min respin.

## Safety nets for live demo
- Whole thing is `docker compose` → if it dies morning of defense, respin on any VM in ~15 min.
- **Local laptop fallback:** `docker compose up` on laptop = plan B, no network dependency.

## Next steps (remaining)
1. **Seed content** — log in as `KhangHo` (ADMIN) on the live site, create problems/contests
   via the admin UI (or migrate from local DB later if a fuller catalog is wanted).
2. **CI auto-deploy** — add GitHub repo secrets `VM_HOST=172.197.160.31`, `VM_USER=gosi`,
   `VM_SSH_KEY` (contents of `vm-tdtuoj_key.pem`). Then push to `main` auto-redeploys (VM must be up).
3. **(Optional) Custom apex domain** — point `tdtuoj.me`/`www` at Vercel (replace GitHub Pages
   records on Namecheap), add `https://tdtuoj.me` to Google OAuth origins.
4. **(Optional)** rotate AWS/LLM keys; move file storage to R2/S3.
5. **Thesis "Triển khai hệ thống" section** — deployment diagram (extend architecture.png with
   actual hosts: Vercel ↔ Azure VM ↔ containers), Docker Compose topology, CI/CD pipeline,
   HTTPS/domain, the cgroup/kernel gotcha, free-tier limitations.

## VM lifecycle (cost control)
- **Stop:** Portal → `vm-tdtuoj` → Stop → must reach **"Stopped (deallocated)"** (compute $0).
  NOT `sudo shutdown` (stays allocated, still billed). Idle cost ~$5–9/mo (disk + static IP).
- **Start:** Portal → Start → SSH `gosi@172.197.160.31` → containers auto-restart
  (`docker compose ps`; `docker compose up -d` if any down). Same IP, all config/data persists.

> Backend + Judge0 + frontend LIVE as of 2026-06-16. Remaining work is content + CI + thesis writeup.