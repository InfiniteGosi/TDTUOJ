# TDTUOJ — Deployment Strategy (for thesis defense)

> Goal: deploy live system + write a "Triển khai" section in thesis. Defense in ~2 months
> (from 2026-06-02, so target ~early Aug 2026). Status: **planned, not started.**

## TL;DR decision
- **Deploy: YES.** Live demo strengthens thesis; adds Deployment section + screenshots.
- **Host whole backend stack on ONE VM** via `docker compose` (backend + Judge0 + Postgres + Redis).
- **Frontend on Vercel** (auto-deploy on git push).
- **Recommended VM: Oracle Cloud Always Free** (no expiry, no credit card). Fallback:
  DigitalOcean $200 (GitHub Student Pack) or Azure for Students $100 (no card, .edu email).

## The one hard constraint: Judge0
- Judge0 needs **Docker with `--privileged`** (isolate/cgroups sandbox).
- Most free PaaS (Render, Railway, Vercel, Heroku-likes) **block privileged containers** →
  Judge0 will NOT run there.
- => Must use a **real VM**, not a PaaS, for judging. This drives the whole architecture.

## Free hosting options

| Component | Tool | Note |
|---|---|---|
| Whole stack (1 VM) | **Oracle Cloud Always Free** | 4 ARM cores / 24GB, forever-free, no card. Judge0 runs on ARM fine. Best. |
| VM alt | Azure for Students | $100 credit, no credit card, .edu email. Credit expires. |
| VM alt | DigitalOcean ($200/yr) | Via GitHub Student Developer Pack. 1-year window. |
| Frontend | Vercel / Netlify / Cloudflare Pages | Free, auto-deploy on push. |
| Postgres (managed) | Neon / Supabase | Only if not self-hosting on the VM. |
| Redis (managed) | Upstash | Free serverless; only if not self-hosting. |
| File storage | Cloudflare R2 (10GB, no egress) / AWS S3 free 5GB | R2 preferred. |
| Judge0 (no VM) | Judge0 on RapidAPI | Free tier ~50 req/day. Demo only, not real load. |

## Recommended setup (cheapest + complete, $0, no expiry)
- **Oracle Always Free ARM VM** → Docker Compose: backend + Judge0 + Postgres + Redis.
- **Vercel** → React frontend, points at backend URL.
- **Cloudflare R2** → file/avatar storage.
- **Caddy** reverse proxy on VM → auto HTTPS (Let's Encrypt) + domain.
- Caveat: Oracle ARM free sometimes "out of capacity" at signup → retry / quieter region.
  If blocked → DigitalOcean $200 (Student Pack) easily covers 2 months.

## Feasibility (2 months)
- Actual deploy work ≈ 1–3 days, not weeks:
  - Day 1: provision VM, install Docker, `docker compose up` (backend+Judge0+PG+Redis).
  - Day 2: frontend on Vercel, domain + HTTPS (Caddy), smoke test.
  - Day 3: buffer (env vars / CORS / Judge0 quirks).
- Real risk = leaving it to the last week. **Deploy early, keep running, iterate.**

## Redeploy on code change (normal dev loop)
- Backend (VM):
  ```bash
  git pull
  docker compose up -d --build backend   # rebuild only changed service, ~2-5 min
  ```
  Optional: GitHub Actions to auto-run on `git push`.
- Frontend (Vercel): auto-deploys on every `git push`. Zero manual step.
- Keep `docker-compose.yml` in repo → deploy is reproducible, rebuild from scratch anytime.

## Credits running out before defense?
- **Oracle Always Free = never expires.** Removes the worry entirely → preferred.
- Credit math: small VM (2 vCPU / 4GB) ≈ $8–15/mo → 2 months = $16–30.
  - vs Azure $100 or DigitalOcean $200 → nowhere near exhausted in 2 months.
- Credits won't run out unless a huge instance is provisioned.

## Safety nets for live demo
- Whole thing is `docker compose` → if it dies morning of defense, respin on any VM in ~15 min.
- **Local laptop fallback:** `docker compose up` on laptop = plan B, no network dependency.

## Next steps (when resuming)
1. Pick VM (try Oracle first; fallback DigitalOcean/Azure).
2. Write `docker-compose.yml` (backend + Judge0 + Postgres + Redis + Caddy reverse proxy).
3. Provision VM, deploy, wire domain + HTTPS.
4. Deploy frontend on Vercel pointing at backend.
5. Move file storage to R2/S3.
6. Write thesis "Triển khai hệ thống" section: deployment diagram (extend architecture.png
   with actual hosts), Docker Compose topology, HTTPS/domain, free-tier limitations.

> Claude offered to: (1) draft thesis "Triển khai" section, (2) write the docker-compose.yml
> + Caddy config. Both pending user go-ahead.