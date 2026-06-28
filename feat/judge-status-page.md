# Judge Status Page

A public page showing the health of the code-execution engine (Judge0), modeled on the
DMOJ/bkdnOJ "Judge Status" screen: a status table.

> **Decisions locked:** Uptime column dropped (Judge0 gives no per-worker uptime).
> "Available Runtime" list dropped entirely. No `/languages` call.

## Feasibility & honest mapping

The reference screenshot is a **DMOJ-style** layout: multiple named judge daemons, each
with *Uptime / Load / Ping*. Our engine is **Judge0 CE** — a server + a worker-queue pool,
not a set of named judge nodes. So we adapt the columns to what Judge0 actually exposes.

Judge0 endpoints (base: `judge0.api.url`, e.g. `http://judge0-server:2358`):

| Endpoint        | Gives us                                                       |
|-----------------|---------------------------------------------------------------|
| `GET /about`    | version, reachability (used for the "Available?" + ping check) |
| `GET /workers`  | array of queues: `queue`, `size`, `available`, `idle`, `working`, `paused`, `failed` |
| `GET /system_info` | host CPU model, architecture, total memory                 |

### Column mapping (DMOJ → Judge0)

| Screenshot column | Our value | Source |
|---|---|---|
| Name        | queue name (e.g. `default`) | `/workers[].queue` |
| Available?  | ✅ if Judge0 reachable AND `available > 0` | `/about` ok + `/workers[].available` |
| Up Time     | **dropped** | — |
| Load        | `working / size` as a percentage | `/workers[]` |
| Ping        | backend-measured round-trip ms to `/about` | timed in `StatusService` |

Table columns: `Queue | Available? | Idle | Working | Failed | Load | Ping`. Plus a header
line with Judge0 version + host CPU/mem from `/system_info`.

## Backend

New module `com.oj.TDTUOJ.status` (Controller → Service → DTO). Reuse the existing
`WebClient.Builder` + `judge0.api.url` (same pattern as `Judge0Service`).

```
status/
├── controller/StatusController.java
├── service/StatusService.java + StatusServiceImpl.java
└── dto/JudgeStatusResponse.java   # { reachable, version, pingMs, system, workers[] }
                                   # WorkerStatusDto { queue, available, idle, working, failed, size, loadPct }
                                   # SystemInfoDto   { cpu, arch, memory }
```

- `GET /api/status/judge` → `Response<JudgeStatusResponse>`. Already public in
  `SecurityConfig` (`/api/status/**` is permitAll).
- `StatusServiceImpl`:
  1. Time a `GET /about` → `pingMs` + `reachable` (catch errors → `reachable=false`, return
     a degraded response, never 500).
  2. `GET /workers`, `GET /system_info` (each wrapped — partial failure
     returns nulls, not an exception).
  3. Compute `loadPct = working / size * 100`.
- **Cache with Redis**, TTL ~10s, so the page can't hammer Judge0. Key `status:judge`.
  Redis already wired (`RedisConfig`).
- Short WebClient timeout (2–3s) so an unreachable Judge0 fails fast.

## Frontend

- `components/status/JudgeStatusPage.jsx` — status table only,
  styled with existing `index.css` tokens. Auto-refresh every ~10s (`setInterval`).
- `ApiService.getJudgeStatus()` → `GET /status/judge`.
- Route `/status` in `App.jsx` (public).
- Add **Status** link to `NavBar.jsx` (matches the screenshot nav).
- States: reachable (green ✅ per queue), unreachable (red banner "Judge engine offline"),
  loading skeleton.

## Out of scope / notes

- No real per-node uptime/load/ping — Judge0 doesn't model named judges. If true uptime is
  wanted later, read it from `/actuator` or a Docker healthcheck timestamp, not Judge0.

## Build verification

- Backend: `./mvnw compile -q`
- Frontend: `npm run build`

## File touch list

- NEW `TDTUOJ_backend/.../status/controller/StatusController.java`
- NEW `TDTUOJ_backend/.../status/service/StatusService.java` + `StatusServiceImpl.java`
- NEW `TDTUOJ_backend/.../status/dto/*.java`
- NEW `tdtuoj_frontend/src/components/status/JudgeStatusPage.jsx`
- EDIT `tdtuoj_frontend/src/services/ApiService.js` (add `getJudgeStatus`)
- EDIT `tdtuoj_frontend/src/App.jsx` (add `/status` route)
- EDIT `tdtuoj_frontend/src/components/common/NavBar.jsx` (add Status link)
- `SecurityConfig` — no change (`/api/status/**` already public)
