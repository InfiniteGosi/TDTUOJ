# TDTUOJ Deployment

Full backend stack on **one x86_64 VM** via Docker Compose. Frontend goes on Vercel
separately. See `../feat/DEPLOYMENT-STRATEGY.md` for the why.

> **VM must be x86_64.** Judge0 CE images are x86-only. Primary: Azure for Students
> `Standard_B2als_v2` (2 vCPU / 4 GiB, AMD x86), region Malaysia West. Do **not** use an ARM
> size (Azure `Bpsv2`, Oracle Ampere) — Judge0 won't run. DigitalOcean $200 droplet = fallback.

## What runs here

| Service | Purpose | Exposed |
|---|---|---|
| `backend` | Spring Boot API (:8090) | via Caddy only |
| `app-db` | App Postgres | internal |
| `app-redis` | App Redis (cache + rate limit) | internal |
| `caddy` | Reverse proxy + auto HTTPS | 80, 443 |
| `judge0-server` / `judge0-workers` | Code execution (privileged) | internal |
| `judge0-db` / `judge0-redis` | Judge0's own datastores | internal |

Only Caddy is published to the host (80/443). Everything else talks over the private
`tdtuoj` network.

## One-time VM setup

```bash
# 1. Provision an x86_64 Azure VM (Standard_B2als_v2, 4 GiB, Ubuntu 22.04+). Static public IP.
# 2. Install Docker + compose plugin.
curl -fsSL https://get.docker.com | sh

# 2b. Add a 4 GB swap file — 4 GiB RAM is tight for the full stack; swap smooths memory spikes.
sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 3. Open firewall for HTTP/HTTPS. (Azure: ALSO add 22/80/443 inbound rules in the VM's NSG.)
sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw allow OpenSSH && sudo ufw enable

# 4. Clone the repo.
git clone <repo-url> ~/TDTUOJ
cd ~/TDTUOJ/deploy

# 5. Fill in secrets.
cp .env.example .env                 # set DOMAIN, DB password, JWT, AWS, API keys
cp judge0.conf.example judge0.conf   # set the two Judge0 passwords

# 6. Point your domain's DNS A record at the VM's static public IP (for Caddy HTTPS).

# 7. Launch.
docker compose up -d --build
```

First boot of Judge0 takes a minute (DB migrations). Check with `docker compose logs -f judge0-server`.

## Redeploy after a code change

Automatic via GitHub Actions (`.github/workflows/deploy.yml`): push to `main` touching
`TDTUOJ_backend/**` or `deploy/**` → CI builds, then SSHes in and runs `docker compose up -d --build`.

Required GitHub repo secrets: `VM_HOST`, `VM_USER`, `VM_SSH_KEY`.

Manual fallback:
```bash
cd ~/TDTUOJ && git pull --ff-only && cd deploy && docker compose up -d --build
```

## Frontend (Vercel)

- Import the repo in Vercel, root = `tdtuoj_frontend/`.
- Set the API base URL env to `https://<DOMAIN>/api`.
- Add the Vercel origin to the backend CORS allow-list (`common/security/CorsConfig`).
- Auto-deploys on every push. No action here.

## Judge0 gotchas on the VM

- Needs `privileged: true` (already set) for the isolate sandbox.
- On hosts with cgroup v2 only, Judge0 1.13.1 may misbehave. If judging hangs, boot the
  kernel with `systemd.unified_cgroup_hierarchy=0` (GRUB) to fall back to cgroup v1, then reboot.
- Verify: `curl http://localhost:2358/about` from inside the `backend` container's network,
  or `docker compose exec backend wget -qO- http://judge0-server:2358/about`.
