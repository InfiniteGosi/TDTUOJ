/**
 * Stress scenario 2 — submission / judging load.
 * Floods POST /api/submissions so the Redis judging queue (submissions:queue)
 * fills up, then the SubmissionWorker drains it. Watch in Grafana:
 *   - submissions_queue_depth          (grow, then drain)
 *   - submissions_judged_total{verdict}
 *   - submissions_judge_duration_seconds p95
 *
 * Run (needs a real account + Judge0 up):
 *   & "C:\Program Files\k6\k6.exe" run `
 *     -e EMAIL=khangho150@gmail.com -e PASSWORD=123456 `
 *     -e PROBLEM_ID=3 tests/k6/stress/submit.js
 *
 * IMPORTANT: the "submission" rate-limit tier caps authed users at 10/60s, so to
 * see a real queue build-up disable rate limiting on the backend for the demo:
 *   RATELIMIT_ENABLED=false ./mvnw spring-boot:run
 */
import http from "k6/http";
import { check, sleep } from "k6";
import { BASE_URL, authHeaders, login } from "../utils.js";

const PROBLEM_ID = Number(__ENV.PROBLEM_ID || 3);
const RATE = Number(__ENV.RATE || 20); // submissions per second at peak

const SOURCE = `#include <iostream>
using namespace std;
int main(){ long long a,b; cin>>a>>b; cout<<a+b<<endl; return 0; }`;

export const options = {
  scenarios: {
    submit: {
      executor: "ramping-arrival-rate",
      startRate: 1,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: "30s", target: RATE },
        { duration: "1m", target: RATE },
        { duration: "30s", target: 0 },
      ],
    },
  },
};

export function setup() {
  if (!__ENV.EMAIL || !__ENV.PASSWORD) {
    throw new Error("submit.js requires -e EMAIL=... -e PASSWORD=...");
  }
  return { token: login(__ENV.EMAIL, __ENV.PASSWORD) };
}

export default function (data) {
  const body = JSON.stringify({
    problemId: PROBLEM_ID,
    sourceCode: SOURCE,
    submissionLanguage: "CPP",
  });
  const res = http.post(`${BASE_URL}/submissions`, body, {
    headers: authHeaders(data.token),
  });
  check(res, {
    "submission accepted or queued": (r) => r.status === 200 || r.status === 201,
    "not rate-limited": (r) => r.status !== 429,
  });
  sleep(0.1);
}
