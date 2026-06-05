/**
 * Stress scenario 3 — rate-limit burst.
 * Hammers the "auth" tier (POST /api/auth/login, cap 5/60s anon) with bogus
 * credentials so the limiter rejects most requests. Watch in Grafana:
 *   - ratelimit_allowed_total{tier="auth"}  vs  ratelimit_denied_total{tier="auth"}
 * Proves the protection holds: a flood produces a flat allowed rate and a large
 * denied rate (HTTP 429).
 *
 * Run:
 *   & "C:\Program Files\k6\k6.exe" run tests/k6/stress/ratelimit-burst.js
 * Tune load:
 *   & "C:\Program Files\k6\k6.exe" run -e VUS=100 -e DURATION=2m tests/k6/stress/ratelimit-burst.js
 *
 * Uses bogus credentials on purpose — no real login happens; only the limiter
 * counter is exercised.
 */
import http from "k6/http";
import { check } from "k6";
import { BASE_URL, JSON_HEADERS } from "../utils.js";

const VUS = Number(__ENV.VUS || 50);
const DURATION = __ENV.DURATION || "90s";

export const options = {
  scenarios: {
    burst: {
      executor: "constant-vus",
      vus: VUS,
      duration: DURATION,
    },
  },
};

const BODY = JSON.stringify({
  email: "loadtest-bogus@example.com",
  password: "wrong-password",
});

export default function () {
  const res = http.post(`${BASE_URL}/auth/login`, BODY, { headers: JSON_HEADERS });
  check(res, {
    "got a response": (r) => r.status === 401 || r.status === 400 || r.status === 429,
  });
}
