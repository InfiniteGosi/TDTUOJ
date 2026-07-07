// src/components/visualizer/renderers/vizFormat.js
// Shared value formatter — ported from algorithm-visualizer's Renderer.toString:
//   sentinel infinities → ∞ / -∞, booleans → T / F, non-integers → 3 decimals.
// Keeps node/cell/weight labels short and consistent across every renderer.

const POS_INF = [Infinity, Number.MAX_SAFE_INTEGER, 0x7fffffff, 2147483647];
const NEG_INF = [-Infinity, Number.MIN_SAFE_INTEGER, -0x7fffffff - 1, -2147483648];

/** Format a scalar for display on a canvas. */
export function fmt(value) {
  if (value === null || value === undefined) return "∅";
  if (typeof value === "boolean") return value ? "T" : "F";
  if (typeof value === "number") {
    if (Number.isNaN(value)) return "NaN";
    if (POS_INF.includes(value)) return "∞";
    if (NEG_INF.includes(value)) return "-∞";
    if (!Number.isFinite(value)) return value > 0 ? "∞" : "-∞";
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 1000) / 1000);
  }
  return String(value);
}
