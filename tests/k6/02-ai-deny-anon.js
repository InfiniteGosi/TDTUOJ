/**
 * Test: anonymous requests to AI endpoints must be denied instantly (capacity=0)
 *
 * Checks POST /api/hints and POST /api/problem-ai/* without a token → 429 immediately.
 *
 * Run: k6 run tests/k6/02-ai-deny-anon.js
 */
import http from "k6/http";
import { check } from "k6";
import { BASE_URL, JSON_HEADERS, rlSummary } from "./utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

const AI_ENDPOINTS = [
  { method: "POST", url: `${BASE_URL}/hints`, body: JSON.stringify({ problemId: 1, code: "print(1)" }) },
  { method: "POST", url: `${BASE_URL}/problem-ai/generate-test-cases`, body: JSON.stringify({ problemText: "test" }) },
];

export default function () {
  for (const ep of AI_ENDPOINTS) {
    const res = http.post(ep.url, ep.body, { headers: JSON_HEADERS });
    console.log(`${ep.url}: ${rlSummary(res)}`);

    check(res, {
      [`${ep.url}: anon denied with 429`]: (r) => r.status === 429,
      [`${ep.url}: Retry-After header set`]: (r) => r.headers["Retry-After"] !== undefined,
      [`${ep.url}: tier is ai`]: (r) =>
        (r.headers["X-RateLimit-Tier"] ?? r.headers["X-Ratelimit-Tier"]) === "ai",
    });
  }
}
