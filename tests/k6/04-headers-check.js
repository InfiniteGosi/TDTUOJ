/**
 * Test: every rate-limited response carries the required headers.
 *
 * Hits a public read endpoint and verifies:
 *   X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Tier
 *
 * Also verifies excluded paths (actuator, swagger) have NO rate-limit headers.
 *
 * Run: k6 run tests/k6/04-headers-check.js
 */
import http from "k6/http";
import { check } from "k6";
import { BASE_URL, rlSummary } from "./utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

function getHeader(res, name) {
  const lower = name.toLowerCase();
  for (const key of Object.keys(res.headers)) {
    if (key.toLowerCase() === lower) return res.headers[key];
  }
  return undefined;
}

export default function () {
  // ── Included endpoint: should carry rate-limit headers ──────────────────────
  const included = [
    { label: "GET /api/problems (read-heavy tier)", url: `${BASE_URL}/problems` },
    { label: "GET /api/contests (read-heavy tier)", url: `${BASE_URL}/contests` },
    { label: "GET /api/users (read-heavy tier)", url: `${BASE_URL}/users` },
  ];

  for (const ep of included) {
    const res = http.get(ep.url);
    console.log(`${ep.label}: ${rlSummary(res)}`);
    check(res, {
      [`${ep.label}: X-RateLimit-Limit present`]: (r) => getHeader(r, "X-RateLimit-Limit") !== undefined,
      [`${ep.label}: X-RateLimit-Remaining present`]: (r) => getHeader(r, "X-RateLimit-Remaining") !== undefined,
      [`${ep.label}: X-RateLimit-Tier present`]: (r) => getHeader(r, "X-RateLimit-Tier") !== undefined,
      [`${ep.label}: Remaining is numeric`]: (r) => !isNaN(Number(getHeader(r, "X-RateLimit-Remaining"))),
    });
  }

  // ── Excluded paths: must NOT carry rate-limit headers ───────────────────────
  const excluded = [
    { label: "GET /actuator/health", url: "http://localhost:8090/actuator/health" },
    { label: "GET /swagger-ui/index.html", url: "http://localhost:8090/swagger-ui/index.html" },
  ];

  for (const ep of excluded) {
    const res = http.get(ep.url);
    console.log(`${ep.label}: status=${res.status} rl-tier=${getHeader(res, "X-RateLimit-Tier") ?? "absent"}`);
    check(res, {
      [`${ep.label}: no X-RateLimit-Tier header`]: (r) => getHeader(r, "X-RateLimit-Tier") === undefined,
    });
  }
}
