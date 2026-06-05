/**
 * Stress scenario 1 — read-heavy browsing.
 * Ramps virtual users hitting public GET endpoints to drive HTTP throughput,
 * latency (p95/p99), error rate and JVM load. Watch in Grafana while it runs.
 *
 * Run:
 *   & "C:\Program Files\k6\k6.exe" run tests/k6/stress/browse.js
 * Tune peak VUs:
 *   & "C:\Program Files\k6\k6.exe" run -e PEAK=200 tests/k6/stress/browse.js
 *
 * NOTE: /api/problems and /api/contests are in the "read-heavy" rate-limit tier
 * (120 req/60s anon). To push past trivial load, run the backend with rate
 * limiting disabled:  RATELIMIT_ENABLED=false ./mvnw spring-boot:run
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL } from "../utils.js";

const PEAK = Number(__ENV.PEAK || 100);
const PROBLEM_SLUG = __ENV.PROBLEM_SLUG || "sum-of-two-numbers";

export const options = {
  scenarios: {
    browse: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "1m", target: PEAK },
        { duration: "2m", target: PEAK },
        { duration: "30s", target: 0 },
      ],
      gracefulStop: "10s",
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<1000"],
  },
};

export default function () {
  const r1 = http.get(`${BASE_URL}/problems?limit=10&offset=0`);
  check(r1, { "problems list 2xx": (r) => r.status >= 200 && r.status < 300 });

  const r2 = http.get(`${BASE_URL}/problems/${PROBLEM_SLUG}`);
  check(r2, { "problem detail ok": (r) => r.status === 200 || r.status === 404 });

  const r3 = http.get(`${BASE_URL}/contests?limit=10&offset=0`);
  check(r3, { "contests list 2xx": (r) => r.status >= 200 && r.status < 300 });

  sleep(1);
}
