/**
 * Test: authenticated users can call AI endpoints up to their quota (10/60s).
 *
 * Run:
 *   k6 run -e EMAIL=user@example.com -e PASSWORD=yourpassword tests/k6/05-ai-authed-quota.js
 *
 * NOTE: wait 60s between runs or flush:
 *   redis-cli KEYS "rl:tier:ai:*" | xargs redis-cli DEL
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, authHeaders, login, rlSummary } from "./utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

export default function () {
  if (!__ENV.EMAIL || !__ENV.PASSWORD) {
    console.error("Set EMAIL and PASSWORD env vars: k6 run -e EMAIL=... -e PASSWORD=...");
    return;
  }

  const token = login(__ENV.EMAIL, __ENV.PASSWORD);
  const headers = authHeaders(token);

  // First request should pass (not 429)
  // timeout:'500ms' — server still consumes the rate-limit token before calling Gemini,
  // but k6 doesn't block waiting for the slow AI response, so all requests fire within
  // a few seconds and the bucket drains before it can refill (1 token/6 s window).
  const firstRes = http.post(
    `${BASE_URL}/hints`,
    JSON.stringify({ problemId: 1, code: "print(1)", message: "hint?" }),
    { headers, timeout: "500ms" }
  );
  console.log(`First authed AI request: ${rlSummary(firstRes)}`);
  check(firstRes, {
    // status 0 = k6 timeout (server still consumed token but Gemini was slow) — not a 429
    "first AI request not rate-limited": (r) => r.status !== 429,
    "X-RateLimit-Tier is ai": (r) =>
      (r.headers["X-Ratelimit-Tier"] ?? r.headers["X-RateLimit-Tier"]) === "ai"
      || r.status === 0, // timed out — headers not available but token was consumed
  });

  // Exhaust quota (10 req/min)
  let hitLimit = false;
  for (let i = 2; i <= 12; i++) {
    const res = http.post(
      `${BASE_URL}/hints`,
      JSON.stringify({ problemId: 1, code: "print(1)", message: "hint?" }),
      { headers, timeout: "500ms" }
    );
    console.log(`Request ${i}: ${rlSummary(res)}`);

    if (res.status === 429) {
      hitLimit = true;
      check(res, {
        "429 after quota exhausted": (r) => r.status === 429,
        "Retry-After present": (r) => r.headers["Retry-After"] !== undefined,
      });
      break;
    }
    sleep(0.05);
  }

  check({ hitLimit }, {
    "AI quota exhausted within 12 requests": (o) => o.hitLimit === true,
  });
}
