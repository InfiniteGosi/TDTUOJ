================================================================================
  TDTUOJ — Online Judge for Competitive Programming
  Ton Duc Thang University Online Judge
================================================================================

DESCRIPTION
-----------
TDTUOJ is a full-stack online judging platform built for TDTU. It lets students
solve algorithm problems, compete in programming contests, run classroom lab
assignments, and visualize how their code manipulates data structures step by
step. Lecturers can create problems (with AI assistance), manage organizations
and labs, and export student progress to Excel.

TECHNOLOGY STACK
----------------
  Backend  : Java 21, Spring Boot 3.5, PostgreSQL 16, Redis 7, Judge0 CE 1.13.1
  Frontend : React 19, Vite 7, Radix UI, Monaco Editor, D3.js
  Proxy    : Caddy 2 (production — auto HTTPS)
  Storage  : AWS S3 (problem PDFs, test cases, avatars)
  AI / LLM : Google Gemini, Anthropic Claude, OpenAI
  Monitoring: Prometheus + Grafana
  Load tests: k6

KEY FEATURES
------------
  - Problem archive with tags, difficulty ratings, comments, and voting
  - Asynchronous judging pipeline (Redis queue + Judge0 sandbox)
    Verdicts: AC / WA / TLE / MLE / RE / CE  |  Languages: Python, Java, C, C++
  - ICPC / IOI-style contests with live leaderboards and Elo rating
  - Organizations & Labs: classroom groups, deadlines, per-student tracking
  - Data Structure Visualizer: animates arrays, stacks, queues, linked lists,
    trees, and graphs frame-by-frame from real user code
  - AI assistance: guarded hints, PDF → problem extraction, test-case generation
  - Profiles, heatmaps, rating history, and Excel exports for lecturers
  - Google OAuth login + JWT auth (roles: ADMIN, CREATOR, PARTICIPANT)
  - Rate limiting via Bucket4j + Redis; Micrometer/Prometheus metrics

================================================================================
  OPTION A — LOCAL DEVELOPMENT (no Docker required for the app itself)
================================================================================

PREREQUISITES
-------------
  1. Java 21 (JDK)            — https://adoptium.net/
  2. Node.js 20+              — https://nodejs.org/
  3. PostgreSQL 16            — running on localhost:5431, database name: tdtuoj
  4. Redis 7                  — running on localhost:6379
  5. Judge0 CE                — running on localhost:2358
     (Easiest: run Judge0 via Docker on a Linux machine or WSL2.
      See https://github.com/judge0/judge0 for setup instructions.
      NOTE: Judge0 requires x86_64 Linux and cgroup v1 memory controller —
      it does NOT work natively on Windows or ARM hosts.)

STEP 1 — Clone the repository
------------------------------
  git clone <repo-url>
  cd TDTUOJ

STEP 2 — Configure the backend environment
-------------------------------------------
  The backend reads secrets from TDTUOJ_backend/.env (loaded via spring-dotenv).
  Create/edit this file with the following keys:

    SPRING_DATASOURCE_URL=jdbc:postgresql://localhost:5431/tdtuoj
    SPRING_DATASOURCE_USERNAME=<your-postgres-user>
    SPRING_DATASOURCE_PASSWORD=<your-postgres-password>

    SECRET_JWT_STRING=<random-string-at-least-32-chars>

    AWS_S3_REGION=ap-southeast-1
    AWS_S3_BUCKET=<your-s3-bucket-name>
    AWS_S3_ACCESS_KEY=<your-aws-access-key>
    AWS_S3_SECRET_KEY=<your-aws-secret-key>

    ANTHROPIC_API_KEY=<your-anthropic-key>      # for hints
    OPENAI_API_KEY=<your-openai-key>            # optional
    GEMINI_API_KEY=<your-gemini-key>            # for hints + test-case generation

    GOOGLE_CLIENT_ID=<your-google-oauth-client-id>

  Full config surface: TDTUOJ_backend/src/main/resources/application.yml

STEP 3 — Start the backend
---------------------------
  cd TDTUOJ_backend

  Linux / macOS:
    ./mvnw spring-boot:run

  Windows (PowerShell / CMD):
    mvnw.cmd spring-boot:run

  The API will start at:  http://localhost:8090
  Swagger UI docs at:     http://localhost:8090/swagger-ui/

STEP 4 — Configure the frontend environment
--------------------------------------------
  Edit TDTUOJ_frontend/.env:

    VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>

  The frontend defaults to calling the backend at http://localhost:8090/api.
  To change the API base URL, edit TDTUOJ_frontend/src/config.js (or the
  equivalent constants file).

STEP 5 — Start the frontend
----------------------------
  cd TDTUOJ_frontend
  npm install
  npm run dev

  The frontend will start at:  http://localhost:5173

  Additional npm scripts:
    npm run build    — build for production (outputs to dist/)
    npm run preview  — preview the production build locally
    npm run lint     — run ESLint

STEP 6 — Verify end-to-end
----------------------------
  1. Open http://localhost:5173 in your browser.
  2. Register or log in with Google.
  3. Submit a Hello World problem to confirm the judging pipeline works.
  4. Check http://localhost:8090/swagger-ui/ to explore all API endpoints.

================================================================================
  OPTION B — PRODUCTION DEPLOYMENT (Docker Compose on a Linux VM)
================================================================================

REQUIREMENTS
------------
  - An x86_64 Linux VM (Azure Standard_B2als_v2 or equivalent, min 4 GiB RAM)
    DO NOT use ARM (Azure Bpsv2, Oracle Ampere) — Judge0 is x86-only.
  - Docker with the Compose plugin installed
  - A domain name with its DNS A record pointing at the VM's public IP
  - Inbound firewall rules open for ports 22, 80, 443

STEP 1 — Prepare the VM
------------------------
  # Install Docker
  curl -fsSL https://get.docker.com | sh

  # Add 4 GB swap (recommended — 4 GiB RAM is tight with the full stack)
  sudo fallocate -l 4G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

  # Open firewall
  sudo ufw allow 80 && sudo ufw allow 443 && sudo ufw allow OpenSSH && sudo ufw enable

STEP 2 — Clone and configure
-----------------------------
  git clone <repo-url> ~/TDTUOJ
  cd ~/TDTUOJ/deploy

  # Copy and fill in secrets
  cp .env.example .env               # edit: DOMAIN, DB password, JWT, AWS, API keys
  cp judge0.conf.example judge0.conf # edit: set Judge0's DB and Redis passwords

  Key variables in deploy/.env:
    DOMAIN              — your domain (e.g. api.yourdomain.com), used by Caddy for HTTPS
    APP_DB_USER         — Postgres username for the app
    APP_DB_PASSWORD     — Postgres password for the app
    SECRET_JWT_STRING   — JWT signing secret (>= 32 chars)
    AWS_S3_*            — S3 / Cloudflare R2 credentials
    ANTHROPIC_API_KEY   — Claude API key
    GEMINI_API_KEY      — Gemini API key
    GOOGLE_CLIENT_ID    — Google OAuth client ID

STEP 3 — Judge0 kernel requirement (important!)
-----------------------------------------------
  Judge0 1.13.1 requires cgroup v1 with the memory controller enabled.
  On modern Ubuntu kernels (6.11+) this may need configuration.
  See deploy/README.md for the exact grub configuration steps.

  Quick check after boot:
    cat /proc/cgroups | grep memory   # must show a row with enabled=1

STEP 4 — Launch the stack
--------------------------
  cd ~/TDTUOJ/deploy
  docker compose up -d --build

  Services started:
    backend          Spring Boot API (internal, port 8090)
    app-db           PostgreSQL 16 (internal)
    app-redis        Redis 7 (internal)
    caddy            Reverse proxy + auto HTTPS (ports 80, 443 → public)
    judge0-server    Judge0 API (internal, port 2358)
    judge0-workers   Judge0 code execution workers (internal)
    judge0-db        Judge0's own PostgreSQL (internal)
    judge0-redis     Judge0's own Redis (internal)

  First boot takes ~1 minute for Judge0 DB migrations.
  Monitor: docker compose logs -f judge0-server

STEP 5 — Deploy the frontend (Vercel)
--------------------------------------
  1. Import the repository in Vercel; set root directory to: tdtuoj_frontend/
  2. Set environment variable:
       VITE_GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
  3. The API base URL in the frontend should point to: https://<DOMAIN>/api
  4. Add the Vercel domain to the backend CORS allow-list
     (file: TDTUOJ_backend/src/main/java/.../common/security/CorsConfig.java)
  5. Vercel auto-deploys on every git push to main — no further action needed.

STEP 6 — Re-deploy after code changes
--------------------------------------
  Automatic: push to main touching TDTUOJ_backend/** or deploy/**
    → GitHub Actions (.github/workflows/deploy.yml) builds and SSHes in to redeploy.
    Required GitHub secrets: VM_HOST, VM_USER, VM_SSH_KEY

  Manual fallback:
    cd ~/TDTUOJ && git pull --ff-only && cd deploy && docker compose up -d --build

STEP 7 — Verify Judge0 is working
-----------------------------------
  docker compose exec judge0-workers isolate --cg --init
  # Expected: prints sandbox box path, no error

  docker compose exec backend sh -c \
    'curl -s -X POST "http://judge0-server:2358/submissions?wait=true" \
     -H "Content-Type: application/json" \
     -d "{\"language_id\":71,\"source_code\":\"print(42)\"}"'
  # Expected: "stdout":"42\n", status "Accepted"

================================================================================
  MONITORING (Optional)
================================================================================

  A Prometheus + Grafana stack is available in the monitoring/ directory.

  cd monitoring
  docker compose up -d

  Prometheus: http://localhost:9090
  Grafana:    http://localhost:3000  (default login: admin / admin)

  The backend exposes metrics at: http://localhost:8090/actuator/prometheus
  See monitoring/README.md and monitoring/RUNBOOK.md for dashboard setup.

================================================================================
  LOAD TESTING (Optional)
================================================================================

  k6 load and rate-limit test suites live in tests/k6/.
  Install k6: https://grafana.com/docs/k6/latest/set-up/install-k6/

  Example:
    k6 run tests/k6/<script-name>.js

================================================================================
  REPOSITORY LAYOUT
================================================================================

  TDTUOJ_backend/     Spring Boot API
                      Source: src/main/java/com/oj/TDTUOJ/  (domain-sliced packages)
                      Config: src/main/resources/application.yml
                      DB migrations run automatically on startup via Hibernate DDL.

  TDTUOJ_frontend/    React SPA
                      Entry: src/main/App.jsx  |  Routing: react-router-dom v7
                      Code editor: Monaco  |  Visualizer: D3.js

  deploy/             Docker Compose stack for production
                      docker-compose.yml, Caddyfile, .env.example, judge0.conf.example

  monitoring/         Prometheus + Grafana stack (optional)

  tests/k6/           k6 load & rate-limit test scripts

  Thesis/             LaTeX thesis document (academic context)

  TDTUOJ.postman_collection.json   Postman collection for all API endpoints

================================================================================
  DOCUMENTATION LINKS
================================================================================

  New to the codebase?   → READING-GUIDE.md  (guided reading order)
  Developer playbook:    → PLAYBOOK.md
  AI agent context:      → CLAUDE.md
  Deployment details:    → deploy/README.md
  Monitoring runbook:    → monitoring/RUNBOOK.md
  Async judging design:  → async-judging-architecture.md
  API explorer (live):   → http://localhost:8090/swagger-ui/

================================================================================
  DEFAULT PORTS SUMMARY
================================================================================

  Service          | Local Dev          | Production
  -----------------|--------------------|---------------------------
  Backend API      | localhost:8090     | https://<DOMAIN>/api
  Frontend SPA     | localhost:5173     | https://<VERCEL-URL>
  PostgreSQL (app) | localhost:5431     | internal (Docker only)
  Redis            | localhost:6379     | internal (Docker only)
  Judge0           | localhost:2358     | internal (Docker only)
  Swagger UI       | localhost:8090/swagger-ui/ | —

================================================================================
  NOTES
================================================================================

  - The .env files contain real secrets — they are gitignored. Never commit them.
  - Judge0 requires a privileged x86_64 Linux environment. It will NOT work on
    Windows natively or on ARM-based hosts (Apple M-series, ARM cloud VMs).
  - For local development on Windows, it is recommended to run Judge0 inside
    WSL2 (Ubuntu 22.04) and expose port 2358 to the Windows host.
  - The backend CORS config must include the frontend origin. Update
    CorsConfig.java when switching domains.
  - Swagger UI is disabled in production by default. Enable via application.yml
    if needed for testing.

================================================================================
