// src/components/visualizer/inference/materialize.js
// Turns the backend's heap-and-reference frame format into plain JS values.
//
// Frame schema (see backend Tracer.java):
//   locals:  { name: 5 | "str" | "@heapId" }
//   heap:    { id: {type:"list"|"tuple"|"set"|"dict"|"object"|"opaque", ...} }

const REF_RE = /^@\d+$/;

export function isRef(v) {
  return typeof v === "string" && REF_RE.test(v);
}

export function refId(v) {
  return v.slice(1);
}

export function heapEntry(frame, v) {
  if (!isRef(v)) return null;
  return frame?.heap?.[refId(v)] ?? null;
}

/**
 * Recursively dereference a value against a frame's heap.
 * - lists/tuples/sets  → JS arrays
 * - dicts              → { __kind:"dict", entries:[[k,v],...] }
 * - objects            → { __kind:"object", class, id, fields:{...} }
 * - opaque             → { __kind:"opaque", repr }
 * - cycles             → { __kind:"cycle", ref:"@id" }
 */
export function materialize(value, frame, seen = new Set()) {
  if (!isRef(value)) return value;
  const id = refId(value);
  const entry = frame?.heap?.[id];
  if (!entry) return value; // dangling ref — show as-is
  if (seen.has(id)) return { __kind: "cycle", ref: value };
  seen.add(id);
  let out;
  switch (entry.type) {
    case "list":
    case "tuple":
    case "set":
    case "array":
      out = (entry.values ?? []).map((v) => materialize(v, frame, seen));
      break;
    case "dict":
    case "map":
      out = {
        __kind: "dict",
        entries: (entry.entries ?? []).map(([k, v]) => [
          materialize(k, frame, seen),
          materialize(v, frame, seen),
        ]),
      };
      break;
    case "object": {
      const fields = {};
      for (const [k, v] of Object.entries(entry.fields ?? {})) {
        fields[k] = materialize(v, frame, seen);
      }
      out = { __kind: "object", class: entry.class, id, fields };
      break;
    }
    default:
      out = { __kind: "opaque", repr: entry.repr ?? String(entry.type) };
  }
  seen.delete(id); // shared substructure is fine; only true cycles cut off
  return out;
}

/** true when a materialized value is a flat array of primitives. */
export function isPrimitiveArray(v) {
  return Array.isArray(v) && v.every(isPrimitive);
}

/** true when a materialized value is a rectangular-ish 2D primitive array. */
export function is2DArray(v) {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every((row) => Array.isArray(row) && row.every(isPrimitive))
  );
}

export function isPrimitive(v) {
  return (
    v === null ||
    typeof v === "number" ||
    typeof v === "boolean" ||
    (typeof v === "string" && !isRef(v))
  );
}

/**
 * Merge a frame's variables into one { name → value } map:
 * globals (outermost stack entry) first, then the innermost frame's locals
 * so shadowing resolves the way the user expects.
 */
export function visibleVariables(frame) {
  const stack = frame?.stack ?? [];
  if (stack.length === 0) return {};
  const merged = { ...stack[0].locals };
  if (stack.length > 1) Object.assign(merged, stack[stack.length - 1].locals);
  return merged;
}
