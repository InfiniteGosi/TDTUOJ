/**
 * Test: auth tier throttle (5 req/60s anonymous)
 *
 * Fires 7 requests to POST /api/auth/login.
 * Requests 1-5 must NOT be 429.
 * At least one of requests 6-7 must be 429 with Retry-After header.
 *
 * Run: k6 run tests/k6/01-auth-throttle.js
 *
 * NOTE: Redis bucket state persists between runs.
 * If the test was already run within the last 60s, the first request
 * may already hit the limit. Wait 60s or flush Redis: `redis-cli KEYS "rl:tier:auth:*" | xargs redis-cli DEL`
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, JSON_HEADERS, rlSummary } from "./utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

const BODY = JSON.stringify({ email: "ratelimit-test@example.com", password: "wrong-password" });

export default function () {
  let hitLimit = false;

  for (let i = 1; i <= 7; i++) {
    const res = http.post(`${BASE_URL}/auth/login`, BODY, { headers: JSON_HEADERS });
    console.log(`Request ${i}: ${rlSummary(res)}`);

    if (i <= 5) {
      check(res, {
        [`req ${i}: not rate-limited yet`]: (r) => r.status !== 429,
      });
    }

    if (res.status === 429) {
      hitLimit = true;
      check(res, {
        "429 body has message": (r) => JSON.parse(r.body).message.includes("Rate limit exceeded"),
        "Retry-After header present": (r) => r.headers["Retry-After"] !== undefined,
        "X-RateLimit-Tier is auth": (r) =>
          (r.headers["X-RateLimit-Tier"] ?? r.headers["X-Ratelimit-Tier"]) === "auth",
        "X-RateLimit-Remaining is 0": (r) =>
          (r.headers["X-RateLimit-Remaining"] ?? r.headers["X-Ratelimit-Remaining"]) === "0",
      });
    }

    sleep(0.1); // small gap between requests
  }

  check({ hitLimit }, {
    "rate limit was triggered within 7 requests": (o) => o.hitLimit === true,
  });
}
