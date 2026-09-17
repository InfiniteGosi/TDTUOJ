import http from "k6/http";

export const BASE_URL = __ENV.BASE_URL || "http://localhost:8090/api";

export const JSON_HEADERS = { "Content-Type": "application/json" };

export function authHeaders(token) {
  return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
}

/**
 * Login and return a JWT token.
 * Usage: const token = login("user@example.com", "password");
 */
export function login(email, password) {
  const res = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({ email, password }),
    { headers: JSON_HEADERS }
  );
  if (res.status !== 200) {
    throw new Error(`Login failed (${res.status}): ${res.body}`);
  }
  return JSON.parse(res.body).data.token;
}

/** Print rate-limit headers from a response in a human-readable line. */
export function rlSummary(res) {
  return [
    `status=${res.status}`,
    `limit=${res.headers["X-Ratelimit-Limit"] ?? res.headers["X-RateLimit-Limit"] ?? "-"}`,
    `remaining=${res.headers["X-Ratelimit-Remaining"] ?? res.headers["X-RateLimit-Remaining"] ?? "-"}`,
    `tier=${res.headers["X-Ratelimit-Tier"] ?? res.headers["X-RateLimit-Tier"] ?? "-"}`,
    `retry-after=${res.headers["Retry-After"] ?? "-"}`,
  ].join("  ");
}
