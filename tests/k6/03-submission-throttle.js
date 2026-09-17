/**
 * Test: submission tier throttle
 *   - Anonymous: 3 req/60s → 4th is 429
 *   - Authenticated: 10 req/60s → 11th is 429
 *
 * Run (anonymous):
 *   k6 run tests/k6/03-submission-throttle.js
 *
 * Run (authenticated — verifies higher quota):
 *   k6 run -e EMAIL=user@example.com -e PASSWORD=yourpassword tests/k6/03-submission-throttle.js
 *
 * NOTE: wait 60s between runs or flush:
 *   redis-cli KEYS "rl:tier:submission:*" | xargs redis-cli DEL
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, JSON_HEADERS, authHeaders, login, rlSummary } from "./utils.js";

export const options = {
  vus: 1,
  iterations: 1,
};

const BODY = JSON.stringify({
  problemId: 1,
  sourceCode: "print('hello')",
  language: "PYTHON",
});

export default function () {
  const useAuth = __ENV.EMAIL && __ENV.PASSWORD;
  let headers = JSON_HEADERS;
  let expectedLimit = 3;

  if (useAuth) {
    const token = login(__ENV.EMAIL, __ENV.PASSWORD);
    headers = authHeaders(token);
    expectedLimit = 10;
    console.log(`Authenticated mode — expecting limit at ${expectedLimit + 1}`);
  } else {
    console.log("Anonymous mode — expecting limit at 4");
  }

  let hitLimit = false;

  for (let i = 1; i <= expectedLimit + 2; i++) {
    const res = http.post(`${BASE_URL}/submissions`, BODY, { headers });
    console.log(`Request ${i}: ${rlSummary(res)}`);

    if (i <= expectedLimit) {
      check(res, {
        [`req ${i}: not rate-limited`]: (r) => r.status !== 429,
      });
    }

    if (res.status === 429) {
      hitLimit = true;
      check(res, {
        "429 body correct": (r) => JSON.parse(r.body).statusCode === 429,
        "Retry-After present": (r) => r.headers["Retry-After"] !== undefined,
        "tier is submission": (r) =>
          (r.headers["X-RateLimit-Tier"] ?? r.headers["X-Ratelimit-Tier"]) === "submission",
      });
      break;
    }

    sleep(0.05);
  }

  check({ hitLimit }, {
    "submission rate limit triggered": (o) => o.hitLimit === true,
  });
}
